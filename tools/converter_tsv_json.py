import json, re
from pathlib import Path

ROOT = Path(r"C:\Users\Eduardo F\Documents\Projects\ragnarok_atlas")
RENAMES = {
    'Facilidades - Fabricar Flechas': 'fabricar_flechas',
    'Facilidades - Criar Toxina': 'criar_toxina',
    'Facilidades - Criar Veneno Mortal': 'criar_veneno_mortal',
    'Facilidades - Perícia em Runas': 'pericia_em_runas',
    'Facilidades - Preparar Poção': 'preparar_pocao',
    'Facilidades - Manipular Poção': 'manipular_pocao',
    'Facilidades - Farmacologia Avançada': 'farmacologia_avancada',
    'Facilidades - Culinária Avançada': 'culinaria_avancada',
}

def chaves(cabecalho):
    nomes, vistos = [], set()
    for n, celula in enumerate(cabecalho, 1):
        nome = celula.strip()
        if not nome:
            nome = f'col{n}'
        base = nome
        k = 2
        while nome in vistos:
            nome = f'{base}_{k}'
            k += 1
        vistos.add(nome)
        nomes.append(nome)
    return nomes

relatorio = []
for tsv in sorted(list(ROOT.glob('data/facilidades/*.tsv')) + list(ROOT.glob('data/referencia/*.tsv'))):
    texto = tsv.read_text(encoding='utf-8-sig')
    linhas = [l for l in texto.replace('\r\n', '\n').split('\n') if l.strip()]
    grade = [[c.strip() for c in l.split('\t')] for l in linhas]
    # Fabricar Flechas tem uma linha de título antes do cabeçalho
    offset = 1 if 'Fabricar Flechas' in tsv.name else 0
    ch = chaves(grade[offset])
    ncol = len(ch)
    dados = []
    for linha in grade[:offset] + grade[offset + 1:]:
        vals = linha[:ncol] + [''] * (ncol - len(linha))
        dados.append({k: v for k, v in zip(ch, vals)})
    saida = tsv.with_name(RENAMES.get(tsv.stem, tsv.stem) + '.json')
    saida.write_text(json.dumps(dados, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

    # --- validação: linha a linha, o que o parseTSV do app.js produziria
    outros = grade[:offset] + grade[offset + 1:]
    ok = len(outros) == len(dados)
    diff = 0
    if ok:
        for linha, d in zip(outros, dados):
            for i in range(max(len(linha), ncol)):
                va = linha[i].strip() if i < len(linha) else ''
                vb = d.get(ch[i], '')
                if va != vb:
                    diff += 1
                    ok = False
    relatorio.append(f'{tsv.name:55s} -> {saida.name:30s} linhas={len(grade):<4d} cols={ncol:<3d} ' + ('OK' if ok else f'DIF={diff}'))

print('\n'.join(relatorio))
