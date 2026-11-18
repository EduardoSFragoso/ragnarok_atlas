#!/usr/bin/env python3
"""Gera data/referencia/reforma_fides.json a partir da bROWiki.

Fonte: https://browiki.org/wiki/Aldeia_do_Lobo_Cinzento (seções
Armas Fides / Reforma / Bônus aleatórios). Não usa API nem chave.

Uso: python tools/montar_reforma_fides.py
"""
import html
import json
import re
import urllib.request

URL = "https://browiki.org/wiki/Aldeia_do_Lobo_Cinzento"
SAIDA = "data/referencia/reforma_fides.json"
IDMAP = "data/referencia/itens_divine_pride.json"
UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9",
}


def baixar():
    req = urllib.request.Request(URL, headers=UA)
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")


def txt(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def celulas(tr):
    return [
        re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", c))).strip()
        for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", tr, re.S)
    ]


def secao(h, titulo):
    m = re.search(r'<span class="mw-headline"[^>]*>%s</span>' % titulo, h)
    assert m, f"seção não encontrada: {titulo}"
    return m.start()


def mapear_armas(h, fim, ids):
    seg = h[secao(h, "Armas Fides"):fim]
    linhas = [celulas(tr) for tr in re.findall(r"<tr.*?</tr>", seg, re.S)]
    linhas = [r for r in linhas if any(r)][1:]
    classes, atual = [], None
    for r in linhas:
        if len(r) >= 3 and r[0] and r[1] and r[2]:
            atual = {"classe": r[0], "armas": []}
            classes.append(atual)
        atual["armas"].append({
            "o": f"{r[-2]} Adulter Fides",
            "r": f"{r[-1]} Vivatus Fides",
        })
    total = sum(len(c["armas"]) for c in classes)
    assert len(classes) == 18, len(classes)
    assert total == 39, total
    for c in classes:
        for w in c["armas"]:
            assert w["o"] in ids, w["o"]
            assert w["r"] in ids, w["r"]
    return classes


def extrair_rituais(h, inicio, fim, ids):
    seg = h[inicio:fim]
    listas = [
        [txt(li) for li in re.findall(r"<li[^>]*>(.*?)</li>", ul, re.S)]
        for ul in re.findall(r"<ul>.*?</ul>", seg, re.S)
    ]
    listas = [l for l in listas if l and any("Fragmento" in x for x in l)]
    assert len(listas) == 3, listas
    nomes = ["Ritual Básico", "Ritual Avançado", "Reformador de Fides"]
    notas = ["Perde 5 níveis de refino", "Perde 1 nível de refino", "Mantém refino e cartas"]
    metodos = []
    for nome, nota, itens in zip(nomes, notas, listas):
        mats = []
        for x in itens:
            if x.endswith("Arma Adulter Fides"):
                continue
            m = re.match(r"([\d.]+)\s+(.+)$", x)
            assert m, x
            nome_mat = m.group(2)
            assert nome_mat in ids, nome_mat
            mats.append([int(m.group(1).replace(".", "")), nome_mat])
        metodos.append({"nome": nome, "nota": nota, "mats": mats})
    return metodos


def extrair_faixas(rows):
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


def main():
    h = baixar()
    ids = json.load(open(IDMAP, encoding="utf-8"))
    inicio_fides = secao(h, "Armas Fides")
    classes = mapear_armas(h, secao(h, "Reforma"), ids)
    metodos = extrair_rituais(h, secao(h, "Reforma"), secao(h, "B\u00f4nus aleat\u00f3rios"), ids)
    seg_b = h[secao(h, "B\u00f4nus aleat\u00f3rios"):].replace("<thead>", "").replace("</thead>", "")
    rows = [celulas(tr) for tr in re.findall(r"<tr.*?</tr>", seg_b, re.S)]
    rows = [r for r in rows if any(r)]
    marcas = [i for i, r in enumerate(rows) if "1º Bônus" in " ".join(r)]
    assert len(marcas) == 2, marcas
    bonus = {
        "regras": [
            "Não há perda de refino ou cartas ao adicionar bônus aleatórios.",
            "As armas recebem até 2 bônus aleatórios de uma só vez e podem ser resetadas quantas vezes você quiser.",
            "Os valores dos bônus da Adulter são menores que os da Vivatus (versão mais fraca) e são sorteados dentro das faixas abaixo.",
        ],
        "variaveis": [
            {"nome": "[PROPRIEDADE]", "opcoes": "Água, Fogo, Terra, Vento, Veneno, Sagrado, Sombrio, Fantasma, Maldito ou Neutro"},
            {"nome": "[RAÇA]", "opcoes": "Peixe, Demônio, Planta, Inseto, Amorfo, Anjo, Morto-Vivo, Humanoide, Bruto ou Dragão"},
            {"nome": "[TAMANHO]", "opcoes": "Pequeno, Médio e Grande"},
        ],
        "combinadores": {
            "adulter": ["Pontifex da Coragem", "Pontifex da Sabedoria"],
            "vivatus": ["Pontifex da Tenacidade", "Pontifex da Crença"],
            "nota": "Os combinadores são adquiridos somente por monstros na Mansão da Desilusão, no modo difícil da instância.",
        },
        "fisicos": extrair_faixas(rows[:marcas[1]]),
        "magicos": extrair_faixas(rows[marcas[1]:]),
    }
    for grupo in ("fisicos", "magicos"):
        for parte in ("primeiro", "segundo"):
            assert bonus[grupo][parte], (grupo, parte)
    out = {
        "gerado": "2026-11-18",
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
    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")
    total = sum(len(c["armas"]) for c in classes)
    print(f"OK: {len(classes)} classes, {total} armas, rituais {len(metodos)}, "
          f"faixas {len(bonus['fisicos']['primeiro'])}/{len(bonus['fisicos']['segundo'])} físicos "
          f"e {len(bonus['magicos']['primeiro'])}/{len(bonus['magicos']['segundo'])} mágicos")


if __name__ == "__main__":
    main()
