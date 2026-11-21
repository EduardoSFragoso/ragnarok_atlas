#!/usr/bin/env python3
"""Baixa para assets/icons/ os ícones de item que ainda não existem.

Não usa a API do Divine Pride nem exige chave: pede os PNGs estáticos em
static.divine-pride.net (o mesmo endereço que a API devolve em "iconUrl"),
um de cada vez, com pausa entre pedidos, só dos IDs já conhecidos pelo
projeto (sem varrer IDs) e pulando o que já existe.

Uso (na raiz do projeto):
    python3 tools/baixar_icones.py            # baixa o que falta
    python3 tools/baixar_icones.py --dry-run  # só lista o que falta

Os IDs vêm de data/itens_divine_pride.json, das planilhas de
data/ e dos IDs fixos de app.js. Nomes sem ID não podem ser
baixados: eles são gravados em data/itens_sem_id.txt. Para
resolvê-los, adicione "Nome do item": ID em itens_divine_pride.json e rode
o script de novo.
"""

import argparse
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

from _comum import (
    carregar_json,
    deve_abortar,
    linhas_json,
    msg_erro,
    salvar_texto,
    segundos_retry_after,
)

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "assets" / "icons"
URL = "https://static.divine-pride.net/images/items/item/{}.png"
DELAY = 0.6  # segundos entre pedidos, para não sobrecarregar o servidor
IGNORAR = {"Zeny", "Itens variados (lista a confirmar)", "Itens de drop de monstros (varia por habilidade)"}

# Planilhas de data/ que listam itens usados pelas facilidades/ferramentas.
FACILIDADES = [
    "fabricar_flechas.json",
    "criar_toxina.json",
    "criar_veneno_mortal.json",
    "pericia_em_runas.json",
    "preparar_pocao.json",
    "manipular_pocao.json",
    "farmacologia_avancada.json",
    "culinaria_avancada.json",
]


def coletar():
    """Levanta todos os IDs de item conhecidos e os nomes ainda sem ID.

    Fontes: data/itens_divine_pride.json,
    data/referencias.json (itens_conhecidos) e as planilhas de
    FACILIDADES + custo_de_encantamento + reforma_de_armas.

    Returns:
        (ids, sem_id): lista ordenada de IDs únicos (int) e lista
        ordenada de nomes que não casaram com nenhum ID.
    """
    ids = {}
    ids.update({n: int(i) for n, i in carregar_ids().items()})
    # data/referencias.json: mapa canônico nome -> ID usado pelo app (itens_conhecidos).
    refs = carregar_json(ROOT / "data" / "referencias.json", padrao={}).get("itens_conhecidos", {})
    ids.update({n: int(i) for n, i in refs.items()})
    nomes = set()
    for nome in FACILIDADES:
        f = ROOT / "data" / nome
        flechas = nome == "fabricar_flechas.json"
        for k, r in enumerate(linhas_json(f)):
            r += [""] * 10
            if r[0].isdigit() and r[2]:
                ids[r[2]] = int(r[0])
            if r[4].isdigit() and r[6]:
                ids[r[6]] = int(r[4])
            # A partir daqui vêm só os nomes de itens das linhas válidas.
            if k >= (2 if flechas else 1):
                nomes.update(r[c].strip() for c in ((1, 3) if flechas else (2, 6)) if r[c].strip())
    for r in linhas_json(ROOT / "data" / "custo_de_encantamento.json")[1:]:
        if len(r) > 5 and r[5]:
            nomes.add(r[5])
    for r in linhas_json(ROOT / "data" / "reforma_de_armas.json")[1:]:
        r += [""] * 12
        nomes.update(r[c] for c in (2, 5, 9) if r[c])
    sem_id = sorted(n for n in nomes - IGNORAR if n not in ids and re.sub(r"\s*\[\d+\]$", "", n) not in ids)
    return sorted(set(ids.values())), sem_id


def carregar_ids():
    """Lê o mapa nome -> ID de data/itens_divine_pride.json.

    Returns:
        dict: mapa nome do item -> ID no Divine Pride ({} se ausente).
    """
    return carregar_json(ROOT / "data" / "itens_divine_pride.json", padrao={})


def baixar(i):
    """Baixa o PNG de um item e grava em assets/icons/.

    Args:
        i: ID do item.
    Raises:
        ValueError: se a resposta não começar com a assinatura de PNG.
    """
    req = urllib.request.Request(URL.format(i), headers={"User-Agent": "ragnarok-atlas-icon-sync"})
    with urllib.request.urlopen(req, timeout=20) as r:
        dado = r.read()
    if not dado.startswith(b"\x89PNG"):
        raise ValueError("resposta não é PNG")
    (ICONS / f"{i}.png").write_bytes(dado)


def parse_args(argv=None):
    """Configura e faz o parse dos argumentos de linha de comando.

    Args:
        argv: argumentos; None usa sys.argv[1:].
    Returns:
        argparse.Namespace com .dry_run (bool).
    """
    parser = argparse.ArgumentParser(
        description="Baixa os ícones de item faltantes para assets/icons/ "
        "a partir dos PNGs estáticos do Divine Pride (sem API/chave)."
    )
    parser.add_argument("--dry-run", action="store_true", help="só lista o que falta, sem baixar nada")
    return parser.parse_args(argv)


def main(argv=None):
    """Orquestra a coleta de IDs, a listagem de nomes sem ID e o download.

    Args:
        argv: argumentos de linha de comando; None usa sys.argv[1:].
    """
    args = parse_args(argv)
    ids, sem_id = coletar()
    faltam = [i for i in ids if not (ICONS / f"{i}.png").exists()]
    lista = ROOT / "data" / "itens_sem_id.txt"
    if sem_id:
        salvar_texto(lista, "\n".join(sem_id) + "\n")
    elif lista.exists():
        lista.unlink()
    print(
        f"{len(ids)} IDs conhecidos · {len(faltam)} ícones faltando · {len(sem_id)} nomes sem ID (veja data/itens_sem_id.txt)"
    )
    if args.dry_run or not faltam:
        return
    ICONS.mkdir(parents=True, exist_ok=True)
    erros, seguidas = [], 0
    for n, i in enumerate(faltam, 1):
        try:
            baixar(i)
            seguidas = 0
            print(f"[{n}/{len(faltam)}] {i}.png")
        except urllib.error.HTTPError as e:
            erros.append(i)
            seguidas += 1
            print(f"[{n}/{len(faltam)}] {i}: HTTP {e.code}")
            if e.code == 429:  # limite de requisições: respeitar o Retry-After e tentar de novo uma vez
                time.sleep(min(segundos_retry_after(e.headers.get("Retry-After"), padrao=30), 120))
                try:
                    baixar(i)
                    erros.pop()
                    seguidas = 0
                    print(f"    {i}.png ok após esperar")
                except Exception as e2:
                    print(f"    continua falhando ({msg_erro(e2)}); interrompendo. Rode de novo mais tarde.")
                    break
        except (urllib.error.URLError, ValueError, TimeoutError) as e:
            erros.append(i)
            seguidas += 1
            print(f"[{n}/{len(faltam)}] {i}: falhou ({msg_erro(e)})")
        if deve_abortar(seguidas, "5 falhas seguidas; interrompendo. Verifique a conexão ou tente mais tarde."):
            break
        time.sleep(DELAY)
    if erros:
        print("Sem ícone no servidor ou com erro:", *erros)


if __name__ == "__main__":
    main()
