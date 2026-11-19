#!/usr/bin/env python3
"""Gera data/reforma_fides.json a partir da bROWiki.

Fonte: https://browiki.org/wiki/Aldeia_do_Lobo_Cinzento (seções
Armas Fides / Reforma / Bônus aleatórios). Não usa API nem chave.

As validações da página (quantidade de classes/armas, itens presentes no
mapa de IDs etc.) levantam ValueError com mensagem clara — nada de assert,
que pode ser pulado com python -O.

Uso: python tools/montar_reforma_fides.py
"""

import argparse
import html
import re
import urllib.request
from datetime import date

from _comum import carregar_json, salvar_json_atomico

URL = "https://browiki.org/wiki/Aldeia_do_Lobo_Cinzento"
SAIDA = "data/reforma_fides.json"
IDMAP = "data/itens_divine_pride.json"
UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9",
}


def baixar():
    """Baixa o HTML da página da Aldeia do Lobo Cinzento.

    Returns:
        str: HTML da página (com 30s de timeout).
    """
    req = urllib.request.Request(URL, headers=UA)
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")


def txt(s):
    """Converte um trecho de HTML em texto plano normalizado.

    Args:
        s: trecho HTML (pode conter tags e entidades).
    Returns:
        str: texto sem tags, entidades resolvidas e espaços colapsados.
    """
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def celulas(tr):
    """Extrai as células de uma linha de tabela HTML.

    Args:
        tr: conteúdo de um elemento <tr>.
    Returns:
        list[str]: células como texto plano (th/td).
    """
    return [
        re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", c))).strip()
        for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", tr, re.S)
    ]


def secao(h, titulo):
    """Localiza o início de uma seção da página pelo título.

    Args:
        h: HTML completo da página.
        titulo: texto do cabeçalho da seção.
    Returns:
        int: índice no HTML onde a seção começa.
    Raises:
        ValueError: se a seção não for encontrada.
    """
    m = re.search(rf'<span class="mw-headline"[^>]*>{re.escape(titulo)}</span>', h)
    if not m:
        raise ValueError(f"seção não encontrada: {titulo}")
    return m.start()


def mapear_armas(h, fim, ids):
    """Extrai as classes de armas Fides e as variantes de cada arma.

    Args:
        h: HTML completo da página.
        fim: índice onde a seção "Armas Fides" termina.
        ids: mapa nome -> ID de data/itens_divine_pride.json.
    Returns:
        list[dict]: classes com {"classe", "armas"}; cada arma traz "o"
        (Adulter Fides) e "r" (Vivatus Fides) como nomes.
    Raises:
        ValueError: se a contagem de classes/armas divergir da esperada
            (18 classes, 39 armas) ou se faltar ID de alguma arma.
    """
    seg = h[secao(h, "Armas Fides") : fim]
    linhas = [celulas(tr) for tr in re.findall(r"<tr.*?</tr>", seg, re.S)]
    linhas = [r for r in linhas if any(r)][1:]
    classes, atual = [], None
    for r in linhas:
        if len(r) >= 3 and r[0] and r[1] and r[2]:
            atual = {"classe": r[0], "armas": []}
            classes.append(atual)
        atual["armas"].append(
            {
                "o": f"{r[-2]} Adulter Fides",
                "r": f"{r[-1]} Vivatus Fides",
            }
        )
    total = sum(len(c["armas"]) for c in classes)
    if len(classes) != 18:
        raise ValueError(f"esperava 18 classes de armas, encontrei {len(classes)}")
    if total != 39:
        raise ValueError(f"esperava 39 armas Fides, encontrei {total}")
    for c in classes:
        for w in c["armas"]:
            if w["o"] not in ids:
                raise ValueError(f"arma Adulter sem ID no mapa: {w['o']}")
            if w["r"] not in ids:
                raise ValueError(f"arma Vivatus sem ID no mapa: {w['r']}")
    return classes


def extrair_rituais(h, inicio, fim, ids):
    """Extrai os rituais de reforma e seus materiais.

    Args:
        h: HTML completo da página.
        inicio: índice de início da seção "Reforma".
        fim: índice onde a seção termina.
        ids: mapa nome -> ID de data/itens_divine_pride.json.
    Returns:
        list[dict]: métodos com {"nome", "nota", "mats"}, onde mats são
        pares [quantidade, nome do material].
    Raises:
        ValueError: se não achar exatamente 3 listas de materiais, se uma
            linha não casar com o padrão "quantidade  item" ou se faltar
            ID de um material.
    """
    seg = h[inicio:fim]
    listas = [
        [txt(li) for li in re.findall(r"<li[^>]*>(.*?)</li>", ul, re.S)]
        for ul in re.findall(r"<ul>.*?</ul>", seg, re.S)
    ]
    listas = [lst for lst in listas if lst and any("Fragmento" in x for x in lst)]
    if len(listas) != 3:
        raise ValueError(f"esperava 3 listas de materiais, encontrei {len(listas)}: {listas}")
    nomes = ["Ritual Básico", "Ritual Avançado", "Reformador de Fides"]
    notas = ["Perde 5 níveis de refino", "Perde 1 nível de refino", "Mantém refino e cartas"]
    metodos = []
    for nome, nota, itens in zip(nomes, notas, listas, strict=True):
        mats = []
        for x in itens:
            if x.endswith("Arma Adulter Fides"):
                continue
            m = re.match(r"([\d.]+)\s+(.+)$", x)
            if not m:
                raise ValueError(f"linha de material fora do formato: {x}")
            nome_mat = m.group(2)
            if nome_mat not in ids:
                raise ValueError(f"material sem ID no mapa: {nome_mat}")
            mats.append([int(m.group(1).replace(".", "")), nome_mat])
        metodos.append({"nome": nome, "nota": nota, "mats": mats})
    return metodos


def extrair_faixas(rows):
    """Extrai as faixas de bônus aleatórios (Adulter/Vivatus) das tabelas.

    Args:
        rows: linhas de células das tabelas de bônus (as thead já removidas).
    Returns:
        dict: {"primeiro": [...], "segundo": [...]}, cada item com
        {"efeito", "adulter", "vivatus"}.
    """
    d = {"primeiro": [], "segundo": []}
    tit = None
    for r in rows:
        if "1º Bônus" in " ".join(r):
            tit = "primeiro"
        elif "2º Bônus" in " ".join(r):
            tit = "segundo"
        elif tit and len(r) >= 3 and r[1].startswith(("+", "-")):
            d[tit].append({"efeito": r[0], "adulter": r[1], "vivatus": r[2]})
    return d


def parse_args(argv=None):
    """Configura e faz o parse dos argumentos de linha de comando.

    Args:
        argv: argumentos; None usa sys.argv[1:].
    Returns:
        argparse.Namespace (sem opções hoje; existe para um --help amigável).
    """
    parser = argparse.ArgumentParser(
        description="Gera data/reforma_fides.json a partir da bROWiki "
        "(https://browiki.org/wiki/Aldeia_do_Lobo_Cinzento) — faz acesso à rede."
    )
    return parser.parse_args(argv)


def main(argv=None):
    """Baixa a página, extrai armas/rituais/faixas e grava o JSON final.

    Args:
        argv: argumentos de linha de comando; None usa sys.argv[1:].
    Raises:
        ValueError: em qualquer validação de conteúdo da página que falhar.
    """
    parse_args(argv)
    h = baixar()
    ids = carregar_json(IDMAP, padrao={})
    if not ids:
        raise ValueError(f"mapa de IDs vazio ou ausente: {IDMAP}")
    secao(h, "Armas Fides")  # valida a presença da seção antes de extrair
    classes = mapear_armas(h, secao(h, "Reforma"), ids)
    metodos = extrair_rituais(h, secao(h, "Reforma"), secao(h, "Bônus aleatórios"), ids)
    seg_b = h[secao(h, "Bônus aleatórios") :].replace("<thead>", "").replace("</thead>", "")
    rows = [celulas(tr) for tr in re.findall(r"<tr.*?</tr>", seg_b, re.S)]
    rows = [r for r in rows if any(r)]
    marcas = [i for i, r in enumerate(rows) if "1º Bônus" in " ".join(r)]
    if len(marcas) != 2:
        raise ValueError(f"esperava 2 tabelas de bônus aleatórios, encontrei {len(marcas)}")
    bonus = {
        "regras": [
            "Não há perda de refino ou cartas ao adicionar bônus aleatórios.",
            "As armas recebem até 2 bônus aleatórios de uma só vez e podem ser resetadas quantas vezes você quiser.",
            "Os valores dos bônus da Adulter são menores que os da Vivatus (versão mais fraca) e são sorteados dentro das faixas abaixo.",
        ],
        "variaveis": [
            {
                "nome": "[PROPRIEDADE]",
                "opcoes": "Água, Fogo, Terra, Vento, Veneno, Sagrado, Sombrio, Fantasma, Maldito ou Neutro",
            },
            {
                "nome": "[RAÇA]",
                "opcoes": "Peixe, Demônio, Planta, Inseto, Amorfo, Anjo, Morto-Vivo, Humanoide, Bruto ou Dragão",
            },
            {"nome": "[TAMANHO]", "opcoes": "Pequeno, Médio e Grande"},
        ],
        "combinadores": {
            "adulter": ["Pontifex da Coragem", "Pontifex da Sabedoria"],
            "vivatus": ["Pontifex da Tenacidade", "Pontifex da Crença"],
            "nota": "Os combinadores são adquiridos somente por monstros na Mansão da Desilusão, no modo difícil da instância.",
        },
        "fisicos": extrair_faixas(rows[: marcas[1]]),
        "magicos": extrair_faixas(rows[marcas[1] :]),
    }
    for grupo in ("fisicos", "magicos"):
        for parte in ("primeiro", "segundo"):
            if not bonus[grupo][parte]:
                raise ValueError(f"faixa de bônus vazia: {grupo}/{parte}")
    out = {
        "gerado": date.today().isoformat(),
        "fonte": URL,
        "npc": {"nome": "Bamdatt", "navi": "wolfvill 170/131"},
        "requisitos": [
            "Refino mínimo para reformar: +9.",
            "O Esboço de Arma deve corresponder à arma desejada.",
        ],
        "metodos": metodos,
        "classes": classes,
        "bonus": bonus,
    }
    salvar_json_atomico(SAIDA, out, indent=2, sort_keys=False)
    total = sum(len(c["armas"]) for c in classes)
    print(
        f"OK: {len(classes)} classes, {total} armas, rituais {len(metodos)}, "
        f"faixas {len(bonus['fisicos']['primeiro'])}/{len(bonus['fisicos']['segundo'])} físicos "
        f"e {len(bonus['magicos']['primeiro'])}/{len(bonus['magicos']['segundo'])} mágicos"
    )


if __name__ == "__main__":
    main()
