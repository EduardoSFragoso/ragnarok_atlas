#!/usr/bin/env node
/**
 * Validador de esquema dos JSONs em data/.
 *
 * Por que existe: o app.js lê as tabelas por POSIÇÃO de coluna (r[4], r[7]...)
 * e assume formatos específicos no guia de episódios. Um campo com tipo errado
 * (ex.: objeto no lugar de lista) só aparece como erro em tempo de execução,
 * como o "list.map is not a function" do Ep. 18. Aqui o erro aparece na CI,
 * com o caminho exato do problema.
 *
 * Uso:  node tools/validar_dados.mjs [pasta-do-projeto]
 * Saída: código 1 se houver erros; avisos (⚠) não derrubam a CI.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* ===== Contrato das tabelas =====
   data/colunas.json lista, por tabela, as colunas que o app.js lê. O app as lê
   POR NOME (ordem e colunas extras nos JSONs não importam); o layout em memória
   segue a ordem de colunas.json, que é a fonte única desse contrato. */
const TABELAS = {
    "equips_de_episodio.json": "equips",
    "custo_de_encantamento.json": "custo",
    "encantamentos_disponiveis.json": "encantos",
    "fontes_de_obtencao.json": "fontes",
    "reforma_de_armas.json": "reforma",
    "fabricar_flechas.json": "flechas",
    "criar_toxina.json": "toxina",
    "criar_veneno_mortal.json": "veneno",
    "pericia_em_runas.json": "runas",
    "preparar_pocao.json": "preparar",
    "manipular_pocao.json": "manipular",
    "farmacologia_avancada.json": "farmacia",
    "culinaria_avancada.json": "culinaria",
};

/* ===== Utilitários de tipo ===== */
const tipo = (v) => (v === null ? "null" : Array.isArray(v) ? "lista" : typeof v === "object" ? "objeto" : typeof v);
const NOMES = {
    string: "texto",
    number: "número",
    boolean: "booleano",
    objeto: "objeto",
    lista: "lista",
    null: "null",
};
const nome = (v) => NOMES[tipo(v)] ?? tipo(v);

function contexto() {
    const erros = [];
    const avisos = [];
    return { erros, avisos, erro: (p, m) => erros.push(`${p}: ${m}`), aviso: (p, m) => avisos.push(`${p}: ${m}`) };
}

/* Cada validador recebe (valor, caminho, ctx). */
const texto = (v, p, c) => {
    if (typeof v !== "string") c.erro(p, `esperava texto, veio ${nome(v)}`);
};
const inteiro = (v, p, c) => {
    if (!Number.isInteger(v) || v <= 0) c.erro(p, `esperava inteiro positivo, veio ${JSON.stringify(v)}`);
};
const numero = (v, p, c) => {
    if (typeof v !== "number" || Number.isNaN(v)) c.erro(p, `esperava número, veio ${nome(v)}`);
};
const qualquer = () => {};
const ouNulo = (fn) => (v, p, c) => {
    if (v !== null) fn(v, p, c);
};
const lista =
    (item, { min = 0 } = {}) =>
    (v, p, c) => {
        if (!Array.isArray(v)) return c.erro(p, `esperava lista, veio ${nome(v)}`);
        if (v.length < min) c.erro(p, `lista com ${v.length} item(ns); mínimo ${min}`);
        v.forEach((x, i) => item(x, `${p}[${i}]`, c));
    };
const tupla =
    (...itens) =>
    (v, p, c) => {
        if (!Array.isArray(v)) return c.erro(p, `esperava lista, veio ${nome(v)}`);
        if (v.length !== itens.length) c.erro(p, `esperava ${itens.length} posições, veio ${v.length}`);
        itens.forEach((fn, i) => fn(v[i], `${p}[${i}]`, c));
    };
const dicionario = (valor) => (v, p, c) => {
    if (tipo(v) !== "objeto") return c.erro(p, `esperava objeto, veio ${nome(v)}`);
    for (const [k, x] of Object.entries(v)) valor(x, `${p}.${k}`, c);
};
/* obrigatorios: campos que precisam existir; opcionais: podem faltar.
   Campo desconhecido gera AVISO (provável erro de digitação), não erro. */
const objeto =
    (obrigatorios, opcionais = {}) =>
    (v, p, c) => {
        if (tipo(v) !== "objeto") return c.erro(p, `esperava objeto, veio ${nome(v)}`);
        for (const [k, fn] of Object.entries(obrigatorios)) {
            if (!(k in v)) c.erro(p, `campo obrigatório ausente: "${k}"`);
            else fn(v[k], `${p}.${k}`, c);
        }
        for (const [k, fn] of Object.entries(opcionais)) if (k in v) fn(v[k], `${p}.${k}`, c);
        for (const k of Object.keys(v))
            if (!(k in obrigatorios) && !(k in opcionais)) c.aviso(p, `campo desconhecido: "${k}"`);
    };

/* Tabela do guia: toda linha precisa ter a mesma largura que "colunas". */
const tabela = (extras = {}, { comTitulo = true } = {}) => {
    const base = objeto(
        { ...(comTitulo ? { titulo: texto } : {}), colunas: lista(texto, { min: 1 }), linhas: lista(lista(texto)) },
        { nota: texto, ...extras }
    );
    return (v, p, c) => {
        base(v, p, c);
        if (tipo(v) === "objeto" && Array.isArray(v.colunas) && Array.isArray(v.linhas))
            v.linhas.forEach((l, i) => {
                if (Array.isArray(l) && l.length !== v.colunas.length)
                    c.erro(`${p}.linhas[${i}]`, `${l.length} células, mas há ${v.colunas.length} colunas`);
            });
    };
};

/* ===== Esquemas ===== */
const passo = objeto({ texto }, { navi: texto });
const comum = { passos: lista(passo, { min: 1 }) };
const opcionaisQuest = { recompensa: texto, desbloqueia: texto, itens: lista(texto), nota: texto };

const guiaEpisodio = objeto(
    {
        id: (v, p, c) => {
            texto(v, p, c);
            if (typeof v === "string" && !/^ep\d+$/.test(v)) c.erro(p, `id inválido "${v}" (esperado ep + dígitos)`);
        },
        titulo: texto,
        requisitos: texto,
        recompensaTotal: texto,
        principal: lista(objeto({ capitulo: texto, ...comum }, opcionaisQuest), { min: 1 }),
        secundarias: lista(objeto({ codigo: texto, titulo: texto, prerequisito: texto, ...comum }, opcionaisQuest)),
        diarias: objeto(
            {
                aviso: texto,
                grupos: lista(
                    objeto({
                        nome: texto,
                        diarias: lista(
                            objeto(
                                { nome: texto, tarefa: texto, itens: texto },
                                {
                                    recompensa: texto,
                                    linkBrowiki: texto,
                                    obs: texto,
                                    detalhes: lista(texto),
                                    tabela: tabela({}, { comTitulo: false }),
                                }
                            ),
                            { min: 1 }
                        ),
                    }),
                    { min: 1 }
                ),
            },
            { titulo: texto }
        ),
    },
    {
        avisos: lista(texto),
        itensNecessarios: objeto({ embarque: tabela({ observacaoEquip: texto }) }, { nota: texto }),
        servicos: tabela(),
        lojaReputacao: tabela(),
    }
);

const recompensaEp = objeto(
    {
        nome: texto,
        moedas: lista(qualquer),
        questPrincipal: ouNulo(lista(qualquer)),
        questSecundarias: ouNulo(lista(qualquer)),
        total_moedas: dicionario(qualquer),
    },
    { fontes: lista(qualquer), somas: dicionario(qualquer), obs: qualquer }
);

const par = tupla(texto, texto);
const chances = dicionario(lista(tupla(inteiro, inteiro, texto), { min: 1 }));
const referencias = objeto({
    browiki: lista(tupla(texto, texto, texto), { min: 1 }),
    hazy: lista(par),
    irowiki: lista(par),
    itens_conhecidos: dicionario(inteiro),
    ep19_ids: dicionario(inteiro),
    grau19: objeto({ steps: lista(texto), mats: lista(tupla(texto, lista(numero))) }),
    reciclagem19: lista(tupla(texto, lista(tupla(texto, inteiro, inteiro)))),
    atividades: dicionario(texto),
    refino_chances: chances,
    grau_chances: chances,
});

const reformaFides = objeto(
    {
        npc: objeto({ nome: texto, navi: texto }),
        requisitos: lista(texto),
        metodos: lista(objeto({ nome: texto, mats: qualquer, nota: texto }), { min: 1 }),
        classes: lista(objeto({ classe: texto, armas: qualquer }), { min: 1 }),
        bonus: objeto({
            regras: lista(texto),
            variaveis: lista(qualquer),
            combinadores: qualquer,
            fisicos: qualquer,
            magicos: qualquer,
        }),
    },
    { gerado: texto, fonte: texto }
);

const reformaPagina = objeto({
    equipes: lista(objeto({ nome: texto, sufixo: texto, navi: texto, grupos: qualquer }), { min: 1 }),
});

/* ===== Verificações por arquivo ===== */
function lerJson(dir, arquivo, c) {
    const caminho = path.join(dir, "data", arquivo);
    if (!existsSync(caminho)) {
        c.erro(`data/${arquivo}`, "arquivo ausente");
        return undefined;
    }
    try {
        return JSON.parse(readFileSync(caminho, "utf8"));
    } catch (e) {
        c.erro(`data/${arquivo}`, `JSON inválido (${e.message})`);
        return undefined;
    }
}

function validarTabela(arquivo, dados, esperado, c) {
    const p = `data/${arquivo}`;
    if (!Array.isArray(dados) || dados.length === 0) return c.erro(p, "esperava lista não vazia de linhas");
    const atual = Object.keys(dados[0] ?? {});
    const faltam = esperado.filter((k) => !atual.includes(k));
    if (faltam.length) c.erro(p, `coluna(s) obrigatória(s) ausente(s): ${faltam.join(" | ")}`);
    const extras = atual.filter((k) => !esperado.includes(k));
    if (extras.length) c.aviso(p, `coluna(s) fora do contrato (o app.js ignora): ${extras.join(" | ")}`);
    const conjunto = [...atual].sort().join("\x00");
    dados.forEach((linha, i) => {
        if (tipo(linha) !== "objeto") return c.erro(`${p}[${i}]`, `esperava objeto, veio ${nome(linha)}`);
        const chaves = Object.keys(linha);
        if ([...chaves].sort().join("\x00") !== conjunto) {
            const ausentes = atual.filter((k) => !chaves.includes(k));
            const novas = chaves.filter((k) => !atual.includes(k));
            c.erro(
                `${p}[${i}]`,
                `colunas diferentes da 1ª linha` +
                    (ausentes.length ? ` (faltam: ${ausentes.join(" | ")})` : "") +
                    (novas.length ? ` (a mais: ${novas.join(" | ")})` : "")
            );
            return;
        }
        for (const [k, v] of Object.entries(linha))
            if (v !== null && typeof v !== "string") c.erro(`${p}[${i}].${k}`, `esperava texto, veio ${nome(v)}`);
    });
}

function validarGuia(dados, c) {
    const p = "data/guia_episodio.json";
    lista(guiaEpisodio, { min: 1 })(dados, p, c);
    if (!Array.isArray(dados)) return;
    const ids = new Set();
    dados.forEach((ep, i) => {
        if (tipo(ep) !== "objeto") return;
        if (ids.has(ep.id)) c.erro(`${p}[${i}].id`, `id duplicado "${ep.id}"`);
        ids.add(ep.id);
        if (Array.isArray(ep.secundarias)) {
            const vistos = new Set();
            ep.secundarias.forEach((s, j) => {
                if (vistos.has(s?.codigo))
                    c.erro(`${p}[${i}].secundarias[${j}].codigo`, `código duplicado "${s.codigo}"`);
                vistos.add(s?.codigo);
            });
        }
    });
}

function validarRecompensas(dados, c) {
    const p = "data/recompensas_episodio.json";
    objeto(
        {
            episodios: (v, q, cc) => {
                if (tipo(v) !== "objeto") return cc.erro(q, `esperava objeto, veio ${nome(v)}`);
                for (const [k, ep] of Object.entries(v)) {
                    if (!/^ep\d+(\.\d+)?$/.test(k)) cc.erro(`${q}.${k}`, `chave de episódio inválida "${k}"`);
                    recompensaEp(ep, `${q}.${k}`, cc);
                }
            },
        },
        { gerado: texto, observacoes: lista(texto) }
    )(dados, p, c);
}

/* Todo ID de item conhecido precisa de ícone em assets/icons (o site não
   depende de requisições externas para ícones). */
function validarIcones(dir, itens, refs, c) {
    const pasta = path.join(dir, "assets", "icons");
    if (!existsSync(pasta)) return c.aviso("assets/icons", "pasta ausente; checagem de ícones ignorada");
    const arquivos = new Set(readdirSync(pasta).map((f) => f.replace(/\.[^.]+$/, "")));
    const conferir = (origem, mapa) => {
        if (tipo(mapa) !== "objeto") return;
        for (const [nomeItem, id] of Object.entries(mapa))
            if (Number.isInteger(id) && !arquivos.has(String(id)))
                c.erro(origem, `ícone ausente para "${nomeItem}" (assets/icons/${id}.png)`);
    };
    conferir("data/itens_divine_pride.json", itens);
    conferir("data/referencias.json › itens_conhecidos", refs?.itens_conhecidos);
    conferir("data/referencias.json › ep19_ids", refs?.ep19_ids);
}

/* ===== Entrada principal ===== */
export function validar(dir) {
    const c = contexto();
    const colunas = lerJson(dir, "colunas.json", c);
    if (colunas !== undefined) dicionario(lista(texto, { min: 1 }))(colunas, "data/colunas.json", c);
    for (const [arquivo, chave] of Object.entries(TABELAS)) {
        const d = lerJson(dir, arquivo, c);
        const esperado = colunas?.[chave];
        if (colunas !== undefined && !Array.isArray(esperado)) c.erro("data/colunas.json", `falta a tabela "${chave}"`);
        else if (d !== undefined && Array.isArray(esperado)) validarTabela(arquivo, d, esperado, c);
    }
    const guia = lerJson(dir, "guia_episodio.json", c);
    if (guia !== undefined) validarGuia(guia, c);
    const rec = lerJson(dir, "recompensas_episodio.json", c);
    if (rec !== undefined) validarRecompensas(rec, c);
    const refs = lerJson(dir, "referencias.json", c);
    if (refs !== undefined) referencias(refs, "data/referencias.json", c);
    const fides = lerJson(dir, "reforma_fides.json", c);
    if (fides !== undefined) reformaFides(fides, "data/reforma_fides.json", c);
    const pagina = lerJson(dir, "reforma_pagina.json", c);
    if (pagina !== undefined) reformaPagina(pagina, "data/reforma_pagina.json", c);
    const itens = lerJson(dir, "itens_divine_pride.json", c);
    if (itens !== undefined) dicionario(inteiro)(itens, "data/itens_divine_pride.json", c);
    validarIcones(dir, itens, refs, c);
    return { erros: c.erros, avisos: c.avisos };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const raiz = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
    const { erros, avisos } = validar(raiz);
    for (const a of avisos) console.warn(`⚠ ${a}`);
    for (const e of erros) console.error(`✖ ${e}`);
    if (erros.length) {
        console.error(`\n${erros.length} erro(s) de esquema nos dados.`);
        process.exit(1);
    }
    console.log(`Dados válidos (${avisos.length} aviso(s)).`);
}
