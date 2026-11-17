#!/usr/bin/env python3
"""Consulta a API do Divine Pride e salva os efeitos dos encantamentos pendentes.

A API oficial (https://www.divine-pride.net/api) só atende por ID de item e
precisa de uma apiKey gratuita. Este script:

    1. Lê data/referencia/encantamentos_disponiveis.tsv e separa as linhas dos
       Episódios 17.2 e 18 cujo "Efeito (+11)" está pendente (ver Divine Pride
       ou valor não informado).
    2. Resolve o ID de cada encantamento: primeiro pelo registro local
       data/referencia/itens_divine_pride.json ("Automódulo de H-Dragão" e
       afins); nomes ainda sem ID passam pela listagem da própria API
       (/api/database/Item?query=…&server=LATAM), marcada como "busca" no
       arquivo de saída para conferência manual.
    3. Consulta o detalhe de cada item UMA vez, com pausa entre pedidos,
       respeitando o Retry-After quando o servidor responder 429, e salvando
       tudo em tools/divine_pride_saida.json (acumulativo: rodar de novo
       continua de onde parou).

Uso (na raiz do projeto):
    export DP_API_KEY=sua_chave              # peça a chave no perfil do fórum
    python3 tools/puxar_efeitos_divine_pride.py            # busca o que falta
    python3 tools/puxar_efeitos_divine_pride.py --dry-run   # só lista pendências

Depois envie tools/divine_pride_saida.json de volta para eu atualizar a planilha.
"""
import json, os, re, sys, time, urllib.parse, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = 'https://www.divine-pride.net/api/database/Item/{}'
BUSCA = 'https://www.divine-pride.net/api/database/Item'
SAIDA = ROOT / 'tools' / 'divine_pride_saida.json'
PEND = ROOT / 'tools' / 'divine_pride_faltando.txt'
DELAY = 1.2  # segundos entre pedidos; aumente com --delay se quiser mais calma


def tsv(path):
    return [l.rstrip('\r\n').split('\t') for l in path.read_text(encoding='utf-8-sig').splitlines()]


def pendentes():
    ids = json.loads((ROOT / 'data/referencia/itens_divine_pride.json').read_text(encoding='utf-8'))
    linhas = []
    for r in tsv(ROOT / 'data/referencia/encantamentos_disponiveis.tsv')[1:]:
        r += [''] * 12
        ep, alvo, enc, efeito = r[0], r[1], r[5], r[6]
        if not re.search(r'17\.2|Ep\. 18|Oração', ep):
            continue
        if not re.search(r'Divine|não informado|n\u00e3o informado', efeito, re.I):
            continue
        key = f'{alvo}\x00{enc}'
        nome = r[8].strip() or enc
        cand = ids.get(nome) or ids.get(enc) or ids.get(re.sub(r'\s*\[\d+\]$', '', enc))
        linhas.append((key, enc, nome, cand))
    dedup = {}
    for key, enc, nome, cand in linhas:
        grupo = dedup.setdefault(enc, {'encantamento': enc, 'nome_busca': nome, 'id': cand, 'alvos': []})
        grupo['alvos'].append(key.split('\x00')[0])
    return dedup


def buscar_url(url, key):
    ultimo = None
    for srv in servidores_param:
        destino = url + ('&' if '?' in url else '?') + f'apiKey={key}' + (f'&server={srv}' if srv else '')
        req = urllib.request.Request(destino, headers={'Accept-Language': 'en', 'User-Agent': 'ragnarok-atlas-ench-sync'})
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                return json.loads(r.read()), None
        except urllib.error.HTTPError as e:
            if e.code == 429:
                espera = min(int(e.headers.get('Retry-After', 30) or 30), 120)
                print(f'  limite do servidor (429); esperando {espera}s…')
                time.sleep(espera)
                try:
                    with urllib.request.urlopen(req, timeout=25) as r:
                        return json.loads(r.read()), None
                except Exception as e2:
                    return None, e2
            ultimo = e
            if e.code != 400:
                return None, e
        ultimo = e
    return None, ultimo


def buscar(i, key):
    dado, falha = buscar_url(API.format(i), key)
    if dado is None:
        return None, falha
    if isinstance(dado, list):
        dado = dado[0] if dado else None
    return dado, None


def buscar_nome(nome, key):
    texto = urllib.parse.quote(re.sub(r'\s*\[\d+\]$', '', nome))
    dado, falha = buscar_url(f'{BUSCA}?query={texto}', key)
    lista = dado.get('list') if isinstance(dado, dict) else dado
    return (lista or []), falha


def escolher(lista, nome):
    alvo = re.sub(r'\s*\[\d+\]$', '', nome).casefold()
    if not lista:
        return None
    for it in lista:
        if str(it.get('name', '')).casefold() == alvo:
            return it
    return lista[0]


def limpar(desc):
    texto = re.sub(r'\^([0-9a-fA-F]{6}|\^000000)', '', desc or '').replace('\\r\\n', ' / ').replace('\r\n', ' / ').replace('\n', ' / ')
    return re.sub(r'\s*/\s*(?:/\s*)+', ' / ', texto).strip(' /')


def main():
    secos = '--dry-run' in sys.argv
    delay = float(sys.argv[sys.argv.index('--delay') + 1]) if '--delay' in sys.argv else DELAY
    key = os.environ.get('DP_API_KEY') or ''
    if '--api-key' in sys.argv:
        key = sys.argv[sys.argv.index('--api-key') + 1]
    pend = pendentes()
    com_id = {k: v for k, v in pend.items() if v['id']}
    sem_id = {k: v for k, v in pend.items() if not v['id']}
    cache = json.loads(SAIDA.read_text(encoding='utf-8')) if SAIDA.exists() else {}
    if sem_id:
        PEND.write_text('\n'.join(f'{v["encantamento"]}\t{v["nome_busca"]}' for v in sem_id.values()) + '\n', encoding='utf-8')
    elif PEND.exists():
        PEND.unlink()
    total = len(pend)
    feitos = len([k for k in com_id if k in cache and cache[k].get('efeito')])
    print(f'{total} encantamentos pendentes · {len(com_id)} com ID · {feitos} já salvos · {len(sem_id)} sem ID (tools/divine_pride_faltando.txt)')
    if secos:
        for k, v in sorted(com_id.items()):
            if k not in cache:
                print(f'  faltando: {v["encantamento"]} (id {v["id"]})')
        return
    if not key:
        print('Defina DP_API_KEY (variável de ambiente) ou passe --api-key SUA_CHAVE. A chave é gratuita: registre-se no fórum do Divine Pride e peça no seu perfil.')
        return
    global servidores_param
    servidores_param = ['LATAM', None]
    erros, seguidos = [], 0
    for n, (k, v) in enumerate(sorted(pend.items(), key=lambda x: (x[1]['id'] is None, x[0])), 1):
        if cache.get(k, {}).get('efeito'):
            continue
        i = v['id']
        if i is None:
            lista, falha = buscar_nome(v['encantamento'], key)
            if falha:
                erros.append((v['encantamento'], 'busca', falha)); seguidos += 1
                print(f'[{n}/{len(pend)}] {k}: busca falhou ({falha})')
                if seguidos >= 5:
                    print('5 falhas seguidas; interrompendo. Rode de novo mais tarde.')
                    break
                time.sleep(delay)
                continue
            seguidos = 0
            it = escolher(lista, v['encantamento'])
            cache[k] = {'encantamento': k, 'alvos': sorted(set(v['alvos'])), 'id': it and it.get('id'), 'nome_en': it and it.get('name'), 'busca': True,
                        'candidatos': [{'id': c.get('id'), 'nome': c.get('name')} for c in lista[:5]]}
            SAIDA.write_text(json.dumps(cache, ensure_ascii=False, indent=1, sort_keys=True) + '\n', encoding='utf-8')
            print(f'[{n}/{len(pend)}] {k}: busca → {it and it.get("name")} ({it and it.get("id")})' if it else f'[{n}/{len(pend)}] {k}: nada parecido na busca')
            time.sleep(delay)
            continue
        dado, falha = buscar(i, key)
        if dado is None:
            erros.append((v['encantamento'], i, falha)); seguidos += 1
            print(f'[{n}/{len(pend)}] {v["encantamento"]} (id {i}): falhou ({falha})')
            if seguidos >= 5:
                print('5 falhas seguidas; interrompendo. Rode de novo mais tarde.')
                break
        else:
            seguidos = 0
            cache.setdefault(k, {})
            cache[k].update({'id': i, 'nome_en': dado.get('name'), 'efeito': limpar(dado.get('description')), 'busca': False, 'alvos': sorted(set(v.get('alvos', [])))})
            SAIDA.write_text(json.dumps(cache, ensure_ascii=False, indent=1, sort_keys=True) + '\n', encoding='utf-8')
            print(f'[{n}/{len(com_id)}] {v["encantamento"]} ok ({i})')
        time.sleep(delay)
    if erros:
        print('Com erro:', *{f'{a} ({b})' for a, b, _ in erros}, sep='\n  ')


if __name__ == '__main__':
    main()
