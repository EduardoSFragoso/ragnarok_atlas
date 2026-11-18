import json
import re

PATH = "data/referencia/encantamentos_disponiveis.json"
COLUNA = "Efeito (+11)"
MAX_REFINO = 11

RE_BASE = re.compile(r"^(.+?) ([+\-])(\d+(?:,\d+)?) ?(%|s)?$")
RE_ADD_DE = re.compile(r"^([+\-])(\d+(?:,\d+)?) ?(%|s)? de (.+?) (?:adicional )?com refino \+(\d+) ou mais$")
RE_ADD = re.compile(r"^(.+?) ([+\-])(\d+(?:,\d+)?) ?(%|s)? ?(?:adicional )?com refino \+(\d+) ou mais$")


def num(s):
    f = float(s.replace(",", "."))
    return int(f) if f == int(f) else f


def fmt(v):
    if isinstance(v, int):
        return str(v)
    s = ("%.1f" % v).rstrip("0").rstrip(".")
    return s.replace(".", ",")


def chave(label):
    return re.sub(r"\s+", " ", label.strip().lower())


def parse(partes):
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
    with open(PATH, encoding="utf-8") as f:
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
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"alteradas={alteradas} mantidas={mantidas} puladas={puladas}")
    for i, s in exemplos:
        print(f"  ok  L{i}: {s}")
    print("puladas:")
    for i, s in puladas_lista:
        print(f"  ??  L{i}: {s}")


if __name__ == "__main__":
    main()
