#!/usr/bin/env python3
"""Converte as planilhas TSV de data/ para JSON no formato do app.js.

Percorre data/facilidades/*.tsv e data/referencia/*.tsv, deduplica os
nomes das colunas do cabeçalho e grava um .json equivalente (lista de
objetos) ao lado de cada TSV. Na sequência valida linha a linha que o
resultado é idêntico ao que o parseTSV do app.js produziria.

Uso (na raiz do projeto):
    python3 tools/converter_tsv_json.py
"""

from pathlib import Path

from _comum import salvar_json_atomico

ROOT = Path(__file__).resolve().parent.parent

# Nomes de saída padronizados, conforme o app.js espera.
RENAMES = {
    "Facilidades - Fabricar Flechas": "fabricar_flechas",
    "Facilidades - Criar Toxina": "criar_toxina",
    "Facilidades - Criar Veneno Mortal": "criar_veneno_mortal",
    "Facilidades - Perícia em Runas": "pericia_em_runas",
    "Facilidades - Preparar Poção": "preparar_pocao",
    "Facilidades - Manipular Poção": "manipular_pocao",
    "Facilidades - Farmacologia Avançada": "farmacologia_avancada",
    "Facilidades - Culinária Avançada": "culinaria_avancada",
}


def chaves(cabecalho):
    """Gera nomes de campo únicos a partir do cabeçalho do TSV.

    Células vazias viram "colN"; repetidos ganham sufixo "_2", "_3", …

    Args:
        cabecalho: lista de células da linha de cabeçalho.
    Returns:
        list[str]: nomes de campo, todos únicos, na mesma ordem.
    """
    nomes, vistos = [], set()
    for n, celula in enumerate(cabecalho, 1):
        nome = celula.strip()
        if not nome:
            nome = f"col{n}"
        base = nome
        k = 2
        while nome in vistos:
            nome = f"{base}_{k}"
            k += 1
        vistos.add(nome)
        nomes.append(nome)
    return nomes


def montar_dados(grade, offset):
    """Converte as linhas do TSV em objetos {campo: valor}.

    Args:
        grade: linhas do TSV já divididas por tabulação (sem espaços).
        offset: 1 quando o TSV tem linha de título antes do cabeçalho.
    Returns:
        (dados, ch): lista de registros e a lista de nomes de campo.
    """
    # Fabricar Flechas tem uma linha de título antes do cabeçalho
    ch = chaves(grade[offset])
    ncol = len(ch)
    dados = []
    for linha in grade[:offset] + grade[offset + 1 :]:
        # Recorta a linha para o tamanho do cabeçalho (colunas extras são
        # descartadas) e completa as faltantes com "" — por isso strict=False.
        vals = linha[:ncol] + [""] * (ncol - len(linha))
        dados.append({k: v for k, v in zip(ch, vals, strict=False)})
    return dados, ch


def validar(outros, dados, ch, ncol):
    """Confere que o JSON equivale ao que o parseTSV do app.js produziria.

    Args:
        outros: linhas de dados crus (sem título e sem cabeçalho).
        dados: registros convertidos (função montar_dados).
        ch: nomes de campo do cabeçalho.
        ncol: quantidade de colunas do cabeçalho.
    Returns:
        (ok, dif): bool de igualdade total e a diferença acumulada entre
        células crus e convertidas até o primeiro desvio.
    """
    ok = len(outros) == len(dados)
    dif = 0
    if ok:
        for linha, d in zip(outros, dados, strict=True):
            for i in range(max(len(linha), ncol)):
                va = linha[i].strip() if i < len(linha) else ""
                vb = d.get(ch[i], "")
                if va != vb:
                    dif += 1
                    ok = False
    return ok, dif


def main():
    """Converte e valida cada TSV de data/facilidades e data/referencia.

    Imprime um relatório com linhas, colunas e o resultado da validação
    por arquivo.
    """
    relatorio = []
    for tsv in sorted(list(ROOT.glob("data/facilidades/*.tsv")) + list(ROOT.glob("data/referencia/*.tsv"))):
        texto = tsv.read_text(encoding="utf-8-sig")
        linhas = [ln for ln in texto.replace("\r\n", "\n").split("\n") if ln.strip()]
        grade = [[c.strip() for c in ln.split("\t")] for ln in linhas]
        offset = 1 if "Fabricar Flechas" in tsv.name else 0
        dados, ch = montar_dados(grade, offset)
        saida = tsv.with_name(RENAMES.get(tsv.stem, tsv.stem) + ".json")
        salvar_json_atomico(saida, dados, indent=1, sort_keys=False)

        # --- validação: linha a linha, o que o parseTSV do app.js produziria
        outros = grade[:offset] + grade[offset + 1 :]
        ncol = len(ch)
        ok, dif = validar(outros, dados, ch, ncol)
        relatorio.append(
            f"{tsv.name:55s} -> {saida.name:30s} linhas={len(grade):<4d} cols={ncol:<3d} "
            + ("OK" if ok else f"DIF={dif}")
        )

    print("\n".join(relatorio))


if __name__ == "__main__":
    main()
