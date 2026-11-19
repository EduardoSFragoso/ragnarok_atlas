#!/usr/bin/env python3
"""Consulta a API do Divine Pride e salva os efeitos dos encantamentos pendentes.

A API oficial (https://www.divine-pride.net/api) só atende por ID de item e
precisa de uma apiKey gratuita. Este script:

    1. Lê data/encantamentos_disponiveis.json e separa as linhas dos
       Episódios 17.2 e 18 cujo "Efeito (+11)" está pendente (ver Divine Pride
       ou valor não informado).
    2. Resolve o ID de cada encantamento: primeiro pelo registro local
       data/itens_divine_pride.json ("Automódulo de H-Dragão" e
       afins); nomes ainda sem ID passam pela listagem da própria API
       (/api/database/Item?query=…&server=LATAM), marcada como "busca" no
       arquivo de saída para conferência manual.
    3. Consulta o detalhe de cada item/skill UMA vez, em português via
       cabeçalhos Accept-Language: pt e x-server (LATAM, com iRO como
       reserva), com pausa entre pedidos, respeitando o Retry-After quando o
       servidor responder 429, e salvando tudo em
       tools/divine_pride_saida.json (acumulativo: rodar de novo continua de
       onde parou).

A chave da API é lida SOMENTE da variável de ambiente DP_API_KEY — nunca do
argv, para não aparecer em histórico de comandos. Mensagens de erro são
sanitizadas (apiKey=***) antes de ir para o log.

Uso (na raiz do projeto):
    export DP_API_KEY=sua_chave              # peça a chave no perfil do fórum
    python3 tools/puxar_efeitos_divine_pride.py            # busca o que falta
    python3 tools/puxar_efeitos_divine_pride.py --dry-run   # só lista pendências

Depois envie tools/divine_pride_saida.json de volta para eu atualizar a planilha.
"""

import argparse
import os
import re
import time
import urllib.parse
from pathlib import Path

from _comum import (
    buscar_url,
    carregar_json,
    deve_abortar,
    linhas_json,
    msg_erro,
    salvar_json_atomico,
    salvar_texto,
)

ROOT = Path(__file__).resolve().parent.parent
API = "https://www.divine-pride.net/api/database/Item/{}"
BUSCA = "https://www.divine-pride.net/api/database/Item"
SAIDA = ROOT / "tools" / "divine_pride_saida.json"
PEND = ROOT / "tools" / "divine_pride_faltando.txt"
SKILL_API = "https://www.divine-pride.net/api/database/Skill/{}"
SKILL_BUSCA = "https://www.divine-pride.net/api/database/Skill"
SKILLS = ROOT / "tools" / "divine_pride_skills.json"
SKILLS_FALTA = ROOT / "tools" / "divine_pride_skills_faltando.txt"
SKILL_IDS = ROOT / "tools" / "skills_ids.json"
DELAY = 1.2  # segundos entre pedidos; aumente com --delay se quiser mais calma

# Servidores tentados em ordem: LATAM atende em português, iRO é a reserva.
SERVIDORES_ITEM = ["LATAM", None]
SERVIDORES_SKILL = ["LATAM", "iRO"]

# Tipos de dano que aparecem em "Increases X damage" mas não são habilidades.
ESPECIAIS = {
    "critical",
    "long ranged physical",
    "long range physical",
    "short range physical",
    "short ranged physical",
    "all property magical",
    "melee physical",
    "ranged physical",
    "magical",
    "physical",
    "melee",
    "ranged",
}


def pendentes():
    """Levanta os encantamentos com "Efeito (+11)" pendente na planilha.

    Args: nenhum (lê data/ direto).
    Returns:
        dict: chave "alvo\\x00encantamento" -> registro com 'encantamento',
        'nome_busca', 'id' (quando resolvido offline) e 'alvos'.
    """
    ids = carregar_json(ROOT / "data" / "itens_divine_pride.json", padrao={})
    linhas = []
    for r in linhas_json(ROOT / "data" / "encantamentos_disponiveis.json")[1:]:
        r += [""] * 12
        ep, alvo, enc, efeito = r[0], r[1], r[5], r[6]
        if not re.search(r"17\.2|Ep\. 18|Oração", ep):
            continue
        if not re.search(r"Divine|não informado", efeito, re.I):
            continue
        chave = f"{alvo}\x00{enc}"
        nome = r[8].strip() or enc
        cand = ids.get(nome) or ids.get(enc) or ids.get(re.sub(r"\s*\[\d+\]$", "", enc))
        linhas.append((chave, enc, nome, cand))
    dedup = {}
    for chave, enc, nome, cand in linhas:
        grupo = dedup.setdefault(enc, {"encantamento": enc, "nome_busca": nome, "id": cand, "alvos": []})
        grupo["alvos"].append(chave.split("\x00")[0])
    return dedup


def buscar_item(i, key):
    """Busca o detalhe de um item pelo ID.

    Args:
        i: ID do item no Divine Pride.
        key: chave da API (DP_API_KEY).
    Returns:
        (dado, falha): detalhe do item (Lista de resultados achatada em 1)
        ou None, e a exceção em caso de falha (sanitizar com msg_erro).
    """
    dado, falha, _srv = buscar_url(API.format(i), key, servidores=SERVIDORES_ITEM)
    if dado is None:
        return None, falha
    if isinstance(dado, list):
        dado = dado[0] if dado else None
    return dado, None


def buscar_nome(nome, key):
    """Busca itens pelo nome usando a listagem da própria API.

    Args:
        nome: nome do encantamento (o sufixo "[n]" é ignorado).
        key: chave da API (DP_API_KEY).
    Returns:
        (lista, falha): candidatos devolvidos pela API (ou []) e a
        exceção em caso de falha.
    """
    texto = urllib.parse.quote(re.sub(r"\s*\[\d+\]$", "", nome))
    dado, falha, _srv = buscar_url(f"{BUSCA}?query={texto}", key, servidores=SERVIDORES_ITEM)
    lista = dado.get("list") if isinstance(dado, dict) else dado
    return (lista or []), falha


def escolher(lista, nome):
    """Escolhe o candidato de uma busca cujo nome case com o alvo.

    Args:
        lista: resultado da API (/database/Item?query=…).
        nome: nome do encantamento esperado.
    Returns:
        dict: o item com nome exatamente igual (ignorando caixa), ou o
        primeiro da lista, ou None se não veio nada.
    """
    alvo = re.sub(r"\s*\[\d+\]$", "", nome).casefold()
    if not lista:
        return None
    for it in lista:
        if str(it.get("name", "")).casefold() == alvo:
            return it
    return lista[0]


def limpar(desc):
    """Normaliza a descrição da API para a planilha.

    Args:
        desc: descrição crua (com códigos de cor ^rrggbb e quebras \\r\\n).
    Returns:
        str: texto limpo, quebras viradas em " / ".
    """
    texto = re.sub(r"\^([0-9a-fA-F]{6}|\^000000)", "", desc or "")
    texto = texto.replace("\\r\\n", " / ").replace("\r\n", " / ").replace("\n", " / ")
    return re.sub(r"\s*/\s*(?:/\s*)+", " / ", texto).strip(" /")


def nomes_de_skill(desc):
    """Extrai os nomes de habilidade citados em um efeito.

    Procura padrões "Increases X damage" e "reduces skill cooldown of X by",
    descartando tipos de dano genéricos ("melee physical" et caterva).

    Args:
        desc: efeito já limpo (função limpar()).
    Returns:
        list[str]: nomes únicos, em ordem alfabética.
    """
    nomes = []
    for frag in re.findall(r"(?i)increases (.+?) damage", desc or ""):
        nomes += [n.strip() for n in re.split(r", | and ", frag)]
    for m in re.finditer(r"(?i)reduces skill cooldown of (.+?) by", desc or ""):
        nomes += [n.strip() for n in re.split(r", | and ", m.group(1))]
    return sorted({n for n in nomes if n and n.casefold() not in ESPECIAIS})


def coletar_nomes_skills(cache_saida):
    """Reúne os nomes de habilidade citados em todos os efeitos salvos.

    Args:
        cache_saida: cache tools/divine_pride_saida.json.
    Returns:
        set[str]: nomes distintos de habilidades.
    """
    nomes = set()
    for v in cache_saida.values():
        nomes.update(nomes_de_skill(v.get("efeito")))
    return nomes


def separar_falta(nomes, ids_offline, cache_skills):
    """Divide os nomes entre quem tem ID local e quem precisa de busca.

    Nomes já resolvidos no cache de skills (com 'cru' ou 'nada') são
    descartados dos dois lados.

    Args:
        nomes: todos os nomes de habilidades citados nos efeitos.
        ids_offline: mapa nome -> ID de tools/skills_ids.json.
        cache_skills: cache tools/divine_pride_skills.json.
    Returns:
        (offline, faltam): listas ordenadas — 'offline' com ID conhecido,
        'faltam' começa com as de ID conhecido.
    """

    def resolvido(nome):
        entrada = cache_skills.get(nome) or {}
        return bool(entrada.get("cru") or entrada.get("nada"))

    offline = sorted(n for n in nomes if n in ids_offline and not resolvido(n))
    faltam = offline + sorted(n for n in nomes if n not in ids_offline and not resolvido(n))
    return offline, faltam


def detalhar_por_id(nome, sid, key):
    """Busca o detalhe de uma habilidade pelo ID conhecido.

    Args:
        nome: nome (pt-BR) da habilidade.
        sid: ID da habilidade no Divine Pride.
        key: chave da API (DP_API_KEY).
    Returns:
        (entrada, falha): registro pronto para o cache (ou None) e a
        exceção em caso de falha.
    """
    detalhe, falha, srv = buscar_url(SKILL_API.format(sid), key, servidores=SERVIDORES_SKILL, tentar_404=True)
    if falha:
        return None, falha
    entrada = {
        "nome_busca": nome,
        "id": sid,
        "cru": detalhe,
        "srv_detalhe": srv if detalhe is not None else None,
        "busca_candidatos": [{"id": sid, "nome": nome}],
        "nada": detalhe is None,
    }
    print(f"  detalhe: {srv or 'sem detalhe'} ({'PT' if srv == 'LATAM' else 'EN'})")
    return entrada, None


def detalhar_por_busca(nome, key):
    """Resolve uma habilidade pelo nome, pela busca da própria API.

    A busca roda só no iRO (nomes em inglês); o detalhe do candidato
    escolhido é buscado no LATAM para pegar em português.

    Args:
        nome: nome da habilidade conforme citado no efeito.
        key: chave da API (DP_API_KEY).
    Returns:
        (entrada, falha): registro pronto para o cache (com 'nada': True
        quando ninguém casa) ou None, e a exceção em caso de falha.
    """
    lista, falha, _srv = buscar_url(f"{SKILL_BUSCA}?query={urllib.parse.quote(nome)}", key, servidores=["iRO"])
    if falha:
        return None, falha
    if isinstance(lista, dict):
        lista = lista.get("list") or lista.get("Body") or lista.get("body")
    lista = lista or []
    alvo = nome.casefold()
    # Candidato com nome exatamente igual; se nenhum casar, o primeiro da lista.
    candidato = next((it for it in lista if str(it.get("name", "")).casefold() == alvo), lista[0] if lista else None)
    if candidato is None:
        return {"nome_busca": nome, "nada": True}, None
    detalhe, _falha_detalhe, srv = buscar_url(SKILL_API.format(candidato["id"]), key, servidores=SERVIDORES_SKILL)
    cru = detalhe
    entrada = {
        "nome_busca": nome,
        "id": candidato.get("id"),
        "cru": cru,
        "srv_detalhe": srv if cru is not None else None,
        "busca_candidatos": [{"id": c.get("id"), "nome": c.get("name")} for c in lista[:5]],
        "nada": cru is None,
    }
    print(f"  detalhe: {srv or 'sem detalhe'}")
    return entrada, None


def estagio_skills(key, delay, seco):
    """Segunda fase do script: detalhes das habilidades citadas nos efeitos.

    Percorre os nomes extraídos do cache de itens, obtém o detalhe de cada
    habilidade (por ID local ou pela busca) e grava o cache de skills a cada
    acerto. Ao final, lista as habilidades sem dados em
    tools/divine_pride_skills_faltando.txt.

    Args:
        key: chave da API (DP_API_KEY); sem ela a fase é pulada (exceto --dry-run).
        delay: pausa em segundos entre requisições.
        seco: True para --dry-run (só imprime o que faltaria).
    """
    cache_saida = carregar_json(SAIDA, {})
    cache_skills = carregar_json(SKILLS, {})
    ids_offline = carregar_json(SKILL_IDS, {})
    nomes = coletar_nomes_skills(cache_saida)
    offline, faltam = separar_falta(nomes, ids_offline, cache_skills)
    print(f"fase skills: {len(nomes)} habilidades distintas · {len(faltam)} a buscar ({len(offline)} por ID direto)")
    if seco:
        for n in faltam:
            print(f"  faltando: {n}")
        return
    if not key:
        return
    erros, seguidas = [], 0
    for ordem, nome in enumerate(faltam, 1):
        sid = ids_offline.get(nome)
        if sid is not None:
            entrada, falha = detalhar_por_id(nome, sid, key)
            etapa = f"detalhe {sid}"
        else:
            entrada, falha = detalhar_por_busca(nome, key)
            etapa = "busca"
        if falha is not None:
            erros.append((nome, etapa, falha))
            seguidas += 1
            print(f"[{ordem}/{len(faltam)}] {nome}: {etapa} falhou ({msg_erro(falha)})")
            if deve_abortar(seguidas):
                break
            time.sleep(delay)
            continue
        seguidas = 0
        cache_skills[nome] = entrada
        salvar_json_atomico(SKILLS, cache_skills)
        print(f"[{ordem}/{len(faltam)}] {nome} → {entrada.get('id') or 'sem detalhe'}")
        time.sleep(delay)
    if erros:
        print("Com erro:", *[f"{a} ({b})" for a, b, _ in erros], sep="\n  ")
    faltando = sorted(n for n in nomes if (cache_skills.get(n) or {}).get("nada"))
    if faltando:
        salvar_texto(SKILLS_FALTA, "\n".join(faltando) + "\n")
    elif SKILLS_FALTA.exists():
        SKILLS_FALTA.unlink()


def parse_args(argv=None):
    """Configura e faz o parse dos argumentos de linha de comando.

    Args:
        argv: lista de argumentos; None usa sys.argv[1:].
    Returns:
        argparse.Namespace com .dry_run (bool) e .delay (float > 0).
    """
    parser = argparse.ArgumentParser(
        description="Consulta a API do Divine Pride para preencher os 'Efeito (+11)' pendentes.",
        epilog=(
            "A chave da API é lida somente da variável de ambiente DP_API_KEY "
            "(gratuita: registre-se no fórum do Divine Pride e configure no seu perfil)."
        ),
    )
    parser.add_argument("--dry-run", action="store_true", help="só lista as pendências, sem chamar a API")
    parser.add_argument(
        "--delay",
        type=segundos_positivos,
        default=DELAY,
        help=f"pausa entre requisições, em segundos (padrão {DELAY})",
    )
    return parser.parse_args(argv)


def segundos_positivos(texto):
    """Converte --delay em float positivo (validação do argparse).

    Args:
        texto: valor bruto passado na linha de comando.
    Returns:
        float: valor convertido.
    Raises:
        argparse.ArgumentTypeError: se não for número ou se for <= 0.
    """
    try:
        valor = float(texto)
    except ValueError:
        raise argparse.ArgumentTypeError(f"número inválido: {texto!r}") from None
    if valor <= 0:
        raise argparse.ArgumentTypeError(f"o valor de --delay deve ser maior que zero (recebi {valor})")
    return valor


def main(argv=None):
    """Orquestra a primeira fase (itens) e chama a fase de skills.

    Args:
        argv: argumentos de linha de comando; None usa sys.argv[1:].
    """
    args = parse_args(argv)
    key = os.environ.get("DP_API_KEY") or ""
    pend = pendentes()
    com_id = {k: v for k, v in pend.items() if v["id"]}
    sem_id = {k: v for k, v in pend.items() if not v["id"]}
    cache = carregar_json(SAIDA, {})
    if sem_id:
        salvar_texto(PEND, "\n".join(f"{v['encantamento']}\t{v['nome_busca']}" for v in sem_id.values()) + "\n")
    elif PEND.exists():
        PEND.unlink()
    feitos = len([k for k in com_id if k in cache and cache[k].get("efeito")])
    print(
        f"{len(pend)} encantamentos pendentes · {len(com_id)} com ID · {feitos} já salvos"
        f" · {len(sem_id)} sem ID (tools/divine_pride_faltando.txt)"
    )
    if args.dry_run:
        for k, v in sorted(com_id.items()):
            if k not in cache:
                print(f"  faltando: {v['encantamento']} (id {v['id']})")
        return
    if not key:
        print(
            "Defina DP_API_KEY (variável de ambiente). A chave é gratuita: "
            "registre-se no fórum do Divine Pride e configure no seu perfil."
        )
        return
    erros, seguidas = [], 0
    ordenados = sorted(pend.items(), key=lambda x: (x[1]["id"] is None, x[0]))
    for n, (k, v) in enumerate(ordenados, 1):
        if cache.get(k, {}).get("efeito"):
            continue
        i = v["id"]
        if i is None:
            lista, falha = buscar_nome(v["encantamento"], key)
            if falha:
                erros.append((v["encantamento"], "busca", falha))
                seguidas += 1
                print(f"[{n}/{len(pend)}] {k}: busca falhou ({msg_erro(falha)})")
                if deve_abortar(seguidas):
                    break
                time.sleep(args.delay)
                continue
            seguidas = 0
            it = escolher(lista, v["encantamento"])
            cache[k] = {
                "encantamento": k,
                "alvos": sorted(set(v["alvos"])),
                "id": it and it.get("id"),
                "nome_en": it and it.get("name"),
                "busca": True,
                "candidatos": [{"id": c.get("id"), "nome": c.get("name")} for c in lista[:5]],
            }
            salvar_json_atomico(SAIDA, cache)
            if it:
                print(f"[{n}/{len(pend)}] {k}: busca → {it.get('name')} ({it.get('id')})")
            else:
                print(f"[{n}/{len(pend)}] {k}: nada parecido na busca")
            time.sleep(args.delay)
            continue
        dado, falha = buscar_item(i, key)
        if dado is None:
            erros.append((v["encantamento"], i, falha))
            seguidas += 1
            print(f"[{n}/{len(pend)}] {v['encantamento']} (id {i}): falhou ({msg_erro(falha)})")
            if deve_abortar(seguidas):
                break
        else:
            seguidas = 0
            cache.setdefault(k, {})
            cache[k].update(
                {
                    "id": i,
                    "nome_en": dado.get("name"),
                    "efeito": limpar(dado.get("description")),
                    "busca": False,
                    "alvos": sorted(set(v.get("alvos", []))),
                }
            )
            salvar_json_atomico(SAIDA, cache)
            print(f"[{n}/{len(com_id)}] {v['encantamento']} ok ({i})")
        time.sleep(args.delay)
    if erros:
        print("Com erro:", *[f"{a} ({b})" for a, b, _ in erros], sep="\n  ")
    estagio_skills(key, args.delay, args.dry_run)


if __name__ == "__main__":
    main()
