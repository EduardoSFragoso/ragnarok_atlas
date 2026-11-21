/* ===== Ragnarök Atlas — js/base.js =====
   Base: arquivos de dados, estado global, utilitários de texto/ícone/busca e armazenamento local. */

const DATA_FILES = {
    equips: "data/equips_de_episodio.json",
    custo: "data/custo_de_encantamento.json",
    encantos: "data/encantamentos_disponiveis.json",
    fontes: "data/fontes_de_obtencao.json",
    reforma: "data/reforma_de_armas.json",
    itemIds: "data/itens_divine_pride.json",
    reformaPagina: "data/reforma_pagina.json",
    fides: "data/reforma_fides.json",
    guia: "data/guia_episodio.json",
    recompensas: "data/recompensas_episodio.json",
    flechas: "data/fabricar_flechas.json",
    toxina: "data/criar_toxina.json",
    veneno: "data/criar_veneno_mortal.json",
    runas: "data/pericia_em_runas.json",
    preparar: "data/preparar_pocao.json",
    manipular: "data/manipular_pocao.json",
    farmacia: "data/farmacologia_avancada.json",
    culinaria: "data/culinaria_avancada.json",
    referencias: "data/referencias.json",
    colunas: "data/colunas.json",
};

const db = {};

/* eslint-disable prefer-const -- estas variáveis são reatribuídas em outros scripts (telas.js, ui.js, dados.js) */
let currentView = "inicio",
    globalTerm = "";
/* Preenchido em loadData a partir de data/referencias.json (itens_conhecidos
   e ep19_ids), dos mapas do Divine Pride e das receitas. */
let ICON_IDS = {};
/* eslint-enable prefer-const */

const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];

function esc(v) {
    return escapeEntities(v);
}

/** Escapa as entidades HTML (&, <, >, " e ') de qualquer valor. */
function escapeEntities(s) {
    return String(s ?? "").replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
}

/** Formata um número no padrão pt-BR (até 1 casa decimal). */
function fmt(n) {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(n);
}

/** Extrai a versão numérica do episódio de um rótulo ("Ep. 19", "Episódio 16.2"…). */
function episodeRank(s) {
    const m = String(s || "").match(/(?:Epis[oó]dio|Ep\.)\s*(\d+(?:\.\d+)?)/i);
    return m ? Number(m[1]) : -1;
}

/** Ordena grupos pelo episódio (mais recente primeiro, empate alfabético). */
function sortEpisodes(groups, epCol) {
    return groups.sort(
        (a, b) =>
            episodeRank(b[0][epCol]) - episodeRank(a[0][epCol]) ||
            String(a[0][epCol]).localeCompare(String(b[0][epCol]), "pt-BR")
    );
}

/** Debounce simples: executa fn só depois de `ms` sem novas chamadas. */
function debounce(fn, ms = 150) {
    let token = 0;
    return (...args) => {
        const meu = ++token;
        setTimeout(() => {
            if (meu === token) fn(...args);
        }, ms);
    };
}

/** Índice de busca por linha (minúsculas), computado uma única vez por linha. */
const rowSearchCache = new WeakMap();

function rowText(r) {
    let t = rowSearchCache.get(r);
    if (t === undefined) {
        t = r.join(" ").toLocaleLowerCase("pt-BR");
        rowSearchCache.set(r, t);
    }
    return t;
}

/** Ícone do item (assets/icons/<id>.png); só interpola o id se for numérico. */
function itemIcon(name) {
    const id = ICON_IDS[String(name || "").trim()];
    if (!id || !/^\d+$/.test(String(id))) return "";
    return `<img class="item-icon" src="assets/icons/${id}.png" alt="" loading="lazy" onerror="this.remove()">`;
}

/** Link externo do Divine Pride: id numérico validado ou busca pelo nome. */
function itemHref(name) {
    const clean = String(name || "")
        .trim()
        .replace(/\s+\[\d+\]$/, "");
    const id = ICON_IDS[String(name || "").trim()] || ICON_IDS[clean];
    if (id && /^\d+$/.test(String(id))) return `https://www.divine-pride.net/database/item/${id}`;
    const query = /Vivatus Fides/i.test(clean)
        ? "Vivatus Fides"
        : /Adulter Fides/i.test(clean)
          ? "Adulter Fides"
          : /Autom[oó]dulo/i.test(clean)
            ? "Module"
            : /Lobo Cinzento/i.test(clean)
              ? "Grey Wolf"
              : clean;
    return `https://www.divine-pride.net/database/item?query=${encodeURIComponent(query)}&server=LATAM`;
}

/** Link de item com ícone (label opcional); nomes genéricos viram texto puro. */
function itemLink(name, label = null) {
    const n = String(name || "").trim();
    if (/varia por habilidade|lista a confirmar/i.test(n)) return esc(n);
    return n
        ? `<a class="item-link" href="${itemHref(n)}" title="Abre no Divine Pride (confira se o servidor LATAM ` +
              `está selecionado)" target="_blank" rel="noopener noreferrer">` +
              `${label ?? `${itemIcon(n)}${esc(n)}`}</a>`
        : "—";
}

function groupBy(rows, keyFn) {
    const groups = new Map();
    rows.forEach((r) => {
        const key = keyFn(r);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(r);
    });
    return [...groups.values()];
}

/* Caixa de erro padrão (role="alert") usada nos fallbacks de render. */
function caixaErroHtml(titulo, detalhe) {
    return `<div class="error-box" role="alert"><b>${esc(titulo)}</b><br>${esc(detalhe || "")}</div>`;
}

/* Executa a função da view capturando exceções: devolve o HTML ou cai na caixa de erro. */
function seguro(fn, nome) {
    try {
        return fn();
    } catch (err) {
        console.error(`Erro ao renderizar "${nome}":`, err);
        return caixaErroHtml(`Não foi possível exibir esta seção (${nome}).`, err && err.message);
    }
}

const numQty = (s) => {
    s = String(s ?? "").trim();
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ""));
    const n = Number(s.replace(",", "."));
    return s && Number.isFinite(n) ? n : NaN;
};

const totalList = (map, extras = []) =>
    [...map]
        .map(([n, q]) => `<div class="ingredient"><span class="item-label">${itemLink(n)}</span><b>${fmt(q)}</b></div>`)
        .join("") + extras.map((x) => `<div class="ingredient"><span>${esc(x)}</span><b>sem total</b></div>`).join("");
/** Lê e faz parse de uma chave do localStorage, devolvendo o padrão se falhar. */
const stLoad = (k, f) => {
        try {
            const v = JSON.parse(localStorage.getItem(k));
            return v ?? f;
        } catch {
            return f;
        }
    },
    stSave = (k, v) => {
        try {
            localStorage.setItem(k, JSON.stringify(v));
        } catch {}
    };

/** Coage um valor salvo a número; não-numérico/NaN vira o padrão. */
function stNum(v, def = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
}
