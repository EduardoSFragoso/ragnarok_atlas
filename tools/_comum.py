"""Utilidades compartilhadas pelos scripts de tools/ do ragnarok_atlas.

Reúne o que era duplicado entre os scripts: leitura de "planilhas" JSON
com linhas homogêneas, escrita atômica de JSON/texto em LF (evita CRLF
local vs LF no CI), requisição HTTP com retry (429, falha de rede) e o
aborto após muitas falhas consecutivas.
"""

import email.utils
import json
import re
import time
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

# Códigos HTTP que valem nova tentativa em outro servidor (item inexistente
# ou requisição malformada podem ser aceitos por um servidor e não por outro).
FALHAS_FATAIS = {400, 404}

# Limite de falhas consecutivas antes de abortar a rodada.
LIMITE_FALHAS_SEGUIDAS = 5

# Esconde o valor de apiKey=... em qualquer mensagem de erro impressa.
RE_APIKEY = re.compile(r"apiKey=[^&\s'\"]+")


def msg_erro(erro):
    """Sanitiza uma mensagem de erro para exibição no log.

    Substitui o valor de apiKey=... por ***, para que a chave nunca
    apareça impressa nem em exceções nem em URLs mostradas.

    Args:
        erro: exceção capturada, ou qualquer objeto/str com mensagem.
    Returns:
        str: mensagem sanitizada.
    """
    return RE_APIKEY.sub("apiKey=***", str(erro))


def carregar_json(path, padrao=None):
    """Lê um arquivo JSON, tolerando arquivos ainda inexistentes.

    Args:
        path: caminho do arquivo JSON (Path ou str).
        padrao: valor devolvido quando o arquivo não existe.
    Returns:
        objeto decodificado do JSON, ou `padrao`.
    """
    path = Path(path)
    if not path.exists():
        return padrao
    return json.loads(path.read_text(encoding="utf-8"))


def linhas_json(path):
    """Lê uma "planilha" JSON (lista de objetos) como linhas homogêneas.

    A leitura usa open(..., newline="") para preservar as quebras
    originais do arquivo, seja qual for o sistema onde ele foi gravado.

    Args:
        path: caminho do arquivo JSON (Path ou str).
    Returns:
        list[list[str]]: uma linha por registro; células sempre str,
            na ordem das colunas do primeiro registro.
    """
    dados = carregar_json(path, padrao=[])
    colunas = list(dados[0].keys()) if dados else []
    return [[str(r.get(c) or "") for c in colunas] for r in dados]


def salvar_json_atomico(path, dados, indent=1, sort_keys=True):
    """Grava JSON (UTF-8, LF) de forma atômica: .tmp + rename.

    Evita perder o cache acumulado se o processo morrer no meio da
    escrita, e força "\\n" mesmo no Windows (evita CRLF local vs LF no CI).

    Args:
        path: destino do arquivo JSON.
        dados: objeto serializável.
        indent: indentação para json.dump (padrão 1, dos caches do projeto).
        sort_keys: ordenar as chaves (padrão True; use False para manter
            a ordem original, ex.: planilhas convertidas de TSV).
    """
    path = Path(path)
    tmp = path.with_name(path.name + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(dados, f, ensure_ascii=False, indent=indent, sort_keys=sort_keys)
        f.write("\n")
    tmp.replace(path)


def salvar_texto(path, texto):
    """Grava texto UTF-8 com quebras de linha LF (independente do SO).

    Args:
        path: destino do arquivo de texto.
        texto: conteúdo completo a gravar.
    """
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(texto)


def segundos_retry_after(valor, padrao=20):
    """Converte o cabeçalho Retry-After em segundos, de forma tolerante.

    Aceita número puro de segundos ou data HTTP (RFC 7231, ex. "Wed,
    21 Oct 2015 07:28:00 GMT"); qualquer valor ausente ou ininteligível
    cai no padrão.

    Args:
        valor: conteúdo bruto do cabeçalho Retry-After (ou None).
        padrao: segundos usados quando o valor não serve para nada.
    Returns:
        int: segundos a esperar (>= 0).
    """
    bruto = (valor or "").strip()
    if not bruto:
        return padrao
    try:
        return max(int(bruto), 0)
    except ValueError:
        pass
    try:
        data = email.utils.parsedate_to_datetime(bruto)
    except (TypeError, ValueError):
        return padrao
    if data.tzinfo is None:
        data = data.replace(tzinfo=UTC)
    segundos = int((data - datetime.now(UTC)).total_seconds())
    return segundos if segundos > 0 else padrao


def buscar_url(url, api_key, servidores=None, tentar_404=False):
    """GET de JSON na API do Divine Pride com retry para 429 e falhas de rede.

    Comportamento:
        - 429: espera conforme Retry-After (tolerante a data HTTP) com
          backoff multiplicativo, até 6 tentativas;
        - URLError/TimeoutError/OSError: backoff curto (2s, 4s, 6s), até
          3 tentativas;
        - outros HTTP: abandona a tentativa no mesmo servidor; quando o
          código é 400/404, passa a tentar o próximo servidor (um item
          pode existir em um servidor e não em outro);
        - percorre `servidores` (cabeçalho x-server) até um responder bem.

    Args:
        url: URL sem a apiKey (ela é anexada aqui).
        api_key: chave da API (ou "" — alguns endpoints não exigem).
        servidores: lista de valores do cabeçalho x-server; None não envia
            o cabeçalho (padrão [None]).
        tentar_404: se True, um 404 continua testando os próximos servidores
            (usado quando o ID é só um palpite).
    Returns:
        (dado, falha, servidor_usado): JSON decodificado ou None; a última
        exceção (sanitizar com msg_erro antes de imprimir) ou None; e o
        x-server que respondeu ("padrão" quando nenhum cabeçalho foi enviado).
    """
    if servidores is None:
        servidores = [None]
    fatal = FALHAS_FATAIS | ({404} if tentar_404 else set())
    ultimo = None
    destino = url + ("&" if "?" in url else "?") + f"apiKey={api_key}"
    for srv in servidores:
        cabec = {"Accept-Language": "pt", "User-Agent": "ragnarok-atlas-ench-sync"}
        if srv:
            cabec["x-server"] = srv
        req = urllib.request.Request(destino, headers=cabec)
        tentativa_429 = tentativa_rede = 0
        while True:
            try:
                with urllib.request.urlopen(req, timeout=25) as r:
                    return json.loads(r.read()), None, (srv or "padrão")
            except urllib.error.HTTPError as e:
                ultimo = e
                if e.code != 429:
                    break
                tentativa_429 += 1
                if tentativa_429 >= 6:
                    break
                base = max(segundos_retry_after(e.headers.get("Retry-After"), padrao=20), 20)
                espera = min(base * (2 ** (tentativa_429 - 1)), 180)
                print(f"  limite do servidor (429); esperando {espera}s (tentativa {tentativa_429}/6)…")
                time.sleep(espera)
            except (urllib.error.URLError, TimeoutError, OSError) as e:
                ultimo = e
                tentativa_rede += 1
                if tentativa_rede >= 3:
                    break
                time.sleep(2 * tentativa_rede)
        # Um 429 esgotado ou um erro de rede podem ser do nosso lado; só troca
        # de servidor quando o 400/404 sugere que é um problema de conteúdo.
        if ultimo is None or getattr(ultimo, "code", None) not in fatal:
            break
    return None, ultimo, None


def deve_abortar(seguidas, mensagem="5 falhas seguidas; interrompendo. Rode de novo mais tarde."):
    """Diz se a rodada deve ser interrompida por falhas consecutivas.

    Args:
        seguidas: quantidade de falhas consecutivas contadas até agora.
        mensagem: aviso impresso quando o limite é atingido.
    Returns:
        bool: True quando `seguidas >= LIMITE_FALHAS_SEGUIDAS`, imprimindo
        o aviso antes; False caso contrário.
    """
    if seguidas >= LIMITE_FALHAS_SEGUIDAS:
        print(mensagem)
        return True
    return False
