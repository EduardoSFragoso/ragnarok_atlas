#!/usr/bin/env python3
"""Baixa para assets/icons/ os ícones de item que ainda não existem.

Não usa a API do Divine Pride nem exige chave: pede os PNGs estáticos em
static.divine-pride.net (o mesmo endereço que a API devolve em "iconUrl"),
um de cada vez, com pausa entre pedidos, só dos IDs já conhecidos pelo
projeto (sem varrer IDs) e pulando o que já existe.

Uso (na raiz do projeto):
    python3 tools/baixar_icones.py            # baixa o que falta
    python3 tools/baixar_icones.py --dry-run  # só lista o que falta

Os IDs vêm de data/referencia/itens_divine_pride.json, das planilhas de
data/facilidades/ e dos IDs fixos de app.js. Nomes sem ID não podem ser
baixados: eles são gravados em data/referencia/itens_sem_id.txt. Para
resolvê-los, adicione "Nome do item": ID em itens_divine_pride.json e rode
o script de novo.
"""
import json, re, sys, time, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / 'assets' / 'icons'
URL = 'https://static.divine-pride.net/images/items/item/{}.png'
DELAY = 0.6  # segundos entre pedidos, para não sobrecarregar o servidor
IGNORAR = {'Zeny', 'Itens variados (lista a confirmar)', 'Itens de drop de monstros (varia por habilidade)'}

def linhas_json(path):
    dados = json.loads(path.read_text(encoding='utf-8'))
    cols = list(dados[0].keys()) if dados else []
    return [[str(r.get(c) or '') for c in cols] for r in dados]

def coletar():
    ids = {n: int(i) for n, i in re.findall(r"'([^']+)':(\d{3,8})", (ROOT / 'app.js').read_text(encoding='utf-8'))}
    ids.update({n: int(i) for n, i in json.loads((ROOT / 'data/referencia/itens_divine_pride.json').read_text(encoding='utf-8')).items()})
    nomes = set()
    for f in sorted((ROOT / 'data/facilidades').glob('*.json')):
        flechas = 'flechas' in f.name.lower()
        for k, r in enumerate(linhas_json(f)):
            r += [''] * 10
            if r[0].isdigit() and r[2]: ids[r[2]] = int(r[0])
            if r[4].isdigit() and r[6]: ids[r[6]] = int(r[4])
            if k >= (2 if flechas else 1): nomes.update(r[c].strip() for c in ((1, 3) if flechas else (2, 6)) if r[c].strip())
    for r in linhas_json(ROOT / 'data/referencia/custo_de_encantamento.json')[1:]:
        if len(r) > 5 and r[5]: nomes.add(r[5])
    for r in linhas_json(ROOT / 'data/referencia/reforma_de_armas.json')[1:]:
        r += [''] * 12
        nomes.update(r[c] for c in (2, 5, 9) if r[c])
    sem_id = sorted(n for n in nomes - IGNORAR if n not in ids and re.sub(r'\s*\[\d+\]$', '', n) not in ids)
    return sorted(set(ids.values())), sem_id

def baixar(i):
    req = urllib.request.Request(URL.format(i), headers={'User-Agent': 'ragnarok-atlas-icon-sync'})
    with urllib.request.urlopen(req, timeout=20) as r:
        dado = r.read()
    if not dado.startswith(b'\x89PNG'):
        raise ValueError('resposta não é PNG')
    (ICONS / f'{i}.png').write_bytes(dado)

def main():
    ids, sem_id = coletar()
    faltam = [i for i in ids if not (ICONS / f'{i}.png').exists()]
    lista = ROOT / 'data/referencia/itens_sem_id.txt'
    if sem_id:
        lista.write_text('\n'.join(sem_id) + '\n', encoding='utf-8')
    elif lista.exists():
        lista.unlink()
    print(f'{len(ids)} IDs conhecidos · {len(faltam)} ícones faltando · {len(sem_id)} nomes sem ID (veja data/referencia/itens_sem_id.txt)')
    if '--dry-run' in sys.argv or not faltam:
        return
    ICONS.mkdir(parents=True, exist_ok=True)
    erros, seguidos = [], 0
    for n, i in enumerate(faltam, 1):
        try:
            baixar(i); seguidos = 0; print(f'[{n}/{len(faltam)}] {i}.png')
        except urllib.error.HTTPError as e:
            erros.append(i); seguidos += 1; print(f'[{n}/{len(faltam)}] {i}: HTTP {e.code}')
            if e.code == 429:  # limite de requisições: respeitar o Retry-After e tentar de novo uma vez
                time.sleep(min(int(e.headers.get('Retry-After', 30) or 30), 120))
                try:
                    baixar(i); erros.pop(); seguidos = 0; print(f'    {i}.png ok após esperar')
                except Exception as e2:
                    print(f'    continua falhando ({e2}); interrompendo. Rode de novo mais tarde.'); break
        except (urllib.error.URLError, ValueError, TimeoutError) as e:
            erros.append(i); seguidos += 1; print(f'[{n}/{len(faltam)}] {i}: falhou ({e})')
        if seguidos >= 5:
            print('5 falhas seguidas; interrompendo. Verifique a conexão ou tente mais tarde.'); break
        time.sleep(DELAY)
    if erros:
        print('Sem ícone no servidor ou com erro:', *erros)

if __name__ == '__main__':
    main()
