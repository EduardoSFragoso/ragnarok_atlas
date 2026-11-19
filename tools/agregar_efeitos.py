#!/usr/bin/env python3
"""Agrega os efeitos "com refino +X ou mais" da planilha de encantamentos.

Lê data/encantamentos_disponiveis.json, soma os efeitos por linha que
estão no formato "com refino +n ou mais" (ex.: "+10 de Arch com refino
+9 ou mais; +5 de Coma com refino +11 ou mais"), agrupa por atributo e
reescreve o campo "Efeito (+11)" com o resultado somado, limitado ao
refino máximo da wiki (MAX_REFINO).

Uso (na raiz do projeto):
    python3 tools/agregar_efeitos.py
"""

import json
import re
from pathlib import Path

from _comum import salvar_json_atomico

ROOT = Path(__file__).resolve().parent.parent
PLANILHA = ROOT / "data" / "encantamentos_disponiveis.json"
COLUNA = "Efeito (+11)"
MAX_REFINO = 11

# "+X de (atributo)" sem refino
RE_BASE = re.compile(r"^(.+?) ([+\-])(\d+(?:,\d+)?) ?(%|s)?$")
# "(atributo) +X% ... com refino +n ou mais"
RE_ADD_DE = re.compile(r"^([+\-])(\d+(?:,\d+)?) ?(%|s)? de (.+?) (?:adicional )?com refino \+(\d+) ou mais$")
RE_ADD = re.compile(r"^(.+?) ([+\-])(\d+(?:,\d+)?) ?(%|s)? ?(?:adicional )?com refino \+(\d+) ou mais$")


def num(s):
    """Converte número em texto com vírgula decimal para int/float.

    Args:
        s: número em texto (ex.: "12,5").
    Returns:
        int | float: valor convertido (int quando a parte decimal é 0).
    """
    f = float(s.replace(",", "."))
    return int(f) if f == int(f) else f


def fmt(v):
    """Formata um valor para exibição com vírgula decimal.

    Args:
        v: valor numérico a formatar.
    Returns:
        str: número com no máximo 1 casa decimal, vírgula como separador.
    """
    if isinstance(v, int):
        return str(v)
    s = f"{v:.1f}".rstrip("0").rstrip(".")
    return s.replace(".", ",")


def chave(label):
    """Normaliza um atributo para servir de chave de agrupamento.

    Args:
        label: nome do atributo.
    Returns:
        str: nome em minúsculas e com espaços colapsados.
    """
    return re.sub(r"\s+", " ", label.strip().lower())


def parse(partes):
    """Decodifica cada parte de efeito e soma os valores por atributo.

    Args:
        partes: partes separadas por ";" de um "Efeito (+11)".
    Returns:
        (grupos, ordem) | None: dicionário chave -> {'label', 'total',
        'unit'} e a ordem de aparição; None quando alguma parte não casa
        com nenhum formato conhecido (ou excede MAX_REFINO).
    """
    grupos = {}
    ordem = []
    for p in partes:
        m = RE_ADD_DE.match(p)
        if m:
            sg, val, unit, label, refino = m.group(1), m.group(2), m.group(3) or "", m.group(4), m.group(5)
        else:
            m = RE_ADD.match(p)
            if m:
                label, sg, val, unit, refino = m.group(1), m.group(2), m.group(3), m.group(4) or "", m.group(5)
            else:
                m = RE_BASE.match(p)
                if not m:
                    return None
                label, sg, val, unit, refino = m.group(1), m.group(2), m.group(3), m.group(4) or "", None
        if refino is not None and int(refino) > MAX_REFINO:
            continue
        v = num(val) * (-1 if sg == "-" else 1)
        k = chave(label)
        if k not in grupos:
            grupos[k] = {"label": label.strip(), "total": 0.0, "unit": unit.strip()}
            ordem.append(k)
        g = grupos[k]
        g["total"] += v
        if unit.strip() and not g["unit"]:
            g["unit"] = unit.strip()
    return grupos, ordem


def agregar(efeito):
    """Agrega um "Efeito (+11)" completo em um único texto com totais.

    Args:
        efeito: texto do efeito bruto da planilha.
    Returns:
        str | None: efeito agregado (ex.: "Arch +15%."), ou None quando
        alguma parte não pôde ser interpretada.
    """
    texto = efeito.strip().rstrip(".")
    partes = [p.strip() for p in texto.split(";") if p.strip()]
    if not partes:
        return None
    parsed = parse(partes)
    if not parsed:
        return None
    grupos, ordem = parsed
    saida = []
    for k in ordem:
        g = grupos[k]
        v = g["total"]
        sg = "-" if v < 0 else "+"
        label = g["label"]
        if g["unit"] == "s":
            label = re.sub(r"^Recarga de ", "", label, flags=re.I)
        label = label[0].upper() + label[1:]
        if g["unit"] == "s":
            saida.append(f"Recarga de {label} {sg}{fmt(abs(v))}s.")
        else:
            saida.append(f"{label} {sg}{fmt(abs(v))}{g['unit']}.")
    return " ".join(saida)


def main():
    """Percorre a planilha, agrega os efeitos elegíveis e grava de volta.

    Mantém a ordem de chaves do JSON original (sort_keys=False) e imprime
    um resumo de linhas alteradas, mantidas, puladas e exemplos.
    """
    with open(PLANILHA, encoding="utf-8", newline="") as f:
        dados = json.load(f)
    alteradas = mantidas = puladas = 0
    puladas_lista = []
    exemplos = []
    for i, linha in enumerate(dados[1:], start=2):
        atual = str(linha.get(COLUNA) or "").strip()
        if not atual:
            continue
        if "com refino" not in atual:
            mantidas += 1
            continue
        novo = agregar(atual)
        if not novo:
            puladas += 1
            puladas_lista.append((i, atual[:150]))
            continue
        linha[COLUNA] = novo
        alteradas += 1
        if len(exemplos) < 6:
            exemplos.append((i, novo[:150]))
    salvar_json_atomico(PLANILHA, dados, indent=1, sort_keys=False)
    print(f"alteradas={alteradas} mantidas={mantidas} puladas={puladas}")
    for i, s in exemplos:
        print(f"  ok  L{i}: {s}")
    print("puladas:")
    for i, s in puladas_lista:
        print(f"  ??  L{i}: {s}")


if __name__ == "__main__":
    main()
