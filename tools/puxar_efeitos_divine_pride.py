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
SKILL_API = 'https://www.divine-pride.net/api/database/Skill/{}'
SKILL_BUSCA = 'https://www.divine-pride.net/api/database/Skill'
SKILLS = ROOT / 'tools' / 'divine_pride_skills.json'
SKILLS_FALTA = ROOT / 'tools' / 'divine_pride_skills_faltando.txt'
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
        for tent in range(6):
            try:
                with urllib.request.urlopen(req, timeout=25) as r:
                    return json.loads(r.read()), None
            except urllib.error.HTTPError as e:
                ultimo = e
                if e.code != 429:
                    break
                espera = min(max(int(e.headers.get('Retry-After', 20) or 20), 20) * (2 ** tent), 180)
                print(f'  limite do servidor (429); esperando {espera}s (tentativa {tent + 1}/6)…')
                time.sleep(espera)
        if ultimo is None or ultimo.code != 400:
            break
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


ESPECIAIS = {'critical', 'long ranged physical', 'long range physical', 'short range physical', 'short ranged physical', 'all property magical', 'melee physical', 'ranged physical', 'magical', 'physical', 'melee', 'ranged'}


def nomes_de_skill(desc):
    nomes = []
    for frag in re.findall(r'(?i)increases (.+?) damage', desc or ''):
        nomes += [n.strip() for n in re.split(r', | and ', frag)]
    for m in re.finditer(r'(?i)reduces skill cooldown of (.+?) by', desc or ''):
        nomes += [n.strip() for n in re.split(r', | and ', m.group(1))]
    return sorted({n for n in nomes if n and n.casefold() not in ESPECIAIS})


def estagio_skills(key, delay):
    fonte = json.loads(SAIDA.read_text(encoding='utf-8')) if SAIDA.exists() else {}
    nomes = set()
    for v in fonte.values():
        nomes.update(nomes_de_skill(v.get('efeito')))
    cache = json.loads(SKILLS.read_text(encoding='utf-8')) if SKILLS.exists() else {}
    faltam = sorted(n for n in nomes if not (cache.get(n, {}).get('cru') or cache.get(n, {}).get('nada')))
    print(f'fase skills: {len(nomes)} habilidades distintas · {len(faltam)} a buscar')
    if '--dry-run' in sys.argv:
        for n in faltam:
            print(f'  faltando: {n}')
        return
    if not key:
        return
    global servidores_param
    erros, seguidos = [], 0
    for n, nome in enumerate(faltam, 1):
        servidores_param = ['iRO']
        lista, falha = buscar_url(f'{SKILL_BUSCA}?query={urllib.parse.quote(nome)}', key)
        if falha:
            erros.append((nome, 'busca', falha)); seguidos += 1
            print(f'[{n}/{len(faltam)}] {nome}: busca falhou ({falha})')
            if seguidos >= 5:
                print('5 falhas seguidas; interrompendo. Rode de novo mais tarde.')
                break
            time.sleep(delay)
            continue
        seguidos = 0
        algo = None
        if isinstance(lista, dict):
            lista = lista.get('list') or lista.get('Body') or lista.get('body')
        alvo = nome.casefold()
        for it in lista or []:
            if str(it.get('name', '')).casefold() == alvo:
                algo = it
                break
        if algo is None and lista:
            algo = lista[0]
        if algo is None:
            cache[nome] = {'nome_busca': nome, 'nada': True}
        else:
            servidores_param = ['LATAM', 'iRO']
            detalhe, falha2 = buscar_url(SKILL_API.format(algo['id']), key)
            cru, srv = None, None
            if detalhe is not None:
                cru, srv = detalhe, 'LATAM'
            cache[nome] = {'nome_busca': nome, 'id': algo.get('id'), 'cru': cru,
                           'srv_detalhe': srv, 'busca_candidatos': [{'id': c.get('id'), 'nome': c.get('name')} for c in (lista or [])[:5]],
                           'nada': cru is None}
            print(f'[{n}/{len(faltam)}] {nome} → id {algo.get("id")} ({srv or "sem detalhe"})')
        SKILLS.write_text(json.dumps(cache, ensure_ascii=False, indent=1, sort_keys=True) + '\n', encoding='utf-8')
        time.sleep(delay)
    if erros:
        print('Com erro:', *{f'{a} ({b})' for a, b, _ in erros}, sep='\n  ')
    faltando = [n for n in nomes if cache.get(n, {}).get('nada')]
    if faltando:
        SKILLS_FALTA.write_text('\n'.join(faltando) + '\n', encoding='utf-8')
    elif SKILLS_FALTA.exists():
        SKILLS_FALTA.unlink()


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
    estagio_skills(key, delay)


if __name__ == '__main__':
    main()
