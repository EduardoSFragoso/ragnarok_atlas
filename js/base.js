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
    return `<img class="item-icon" src="assets/icons/${id}.png" alt="" loading="lazy">`;
}

/* Ícone de item cujo PNG não existe: remove o <img> em vez de exibir imagem quebrada. O evento "error"
   de <img> não borbulha, mas pode ser ouvido na fase de captura — assim o HTML gerado não precisa de
   onerror inline (que o sanitizador não aceita mais). */
document.addEventListener(
    "error",
    (e) => {
        if (e.target?.matches?.("img.item-icon")) e.target.remove();
    },
    true
);

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

/* ===== Injeção de HTML — PONTO ÚNICO do site =====
   As views produzem strings HTML (dados sempre passam por esc()/richText antes da
   interpolação), mas a *injeção* na página é toda via API de DOM:
   defineHTML(alvo, html) constrói os nós num <template>, remove conteúdo perigoso
   (defesa em profundidade caso alguém interpole um dado sujo um dia; veja saneiaSubarvore) e entra com
   replaceChildren — sem innerHTML de produção em nenhum outro arquivo. */

/* Tags que nunca devem aparecer no HTML gerado pelo site (nomes em minúsculas): scripts e
   documentos embutidos, formulários, folhas de estilo, <template> e, em SVG/MathML, os elementos
   que carregam ou alteram URLs (use, set, animate*, foreignObject). */
const TAGS_BLOQUEADAS = new Set([
    "script",
    "iframe",
    "frame",
    "frameset",
    "object",
    "embed",
    "applet",
    "base",
    "form",
    "meta",
    "link",
    "style",
    "template",
    "noscript",
    "math",
    "foreignobject",
    "use",
    "set",
    "animate",
    "animatetransform",
    "animatemotion",
]);

/* Atributos que carregam URL (inclui o xlink:href do SVG). */
const ATR_URL = new Set([
    "href",
    "src",
    "srcset",
    "action",
    "formaction",
    "xlink:href",
    "poster",
    "data",
    "background",
    "ping",
    "cite",
    "longdesc",
    "manifest",
    "codebase",
]);

/* Esquemas aceitos; relativas (assets/…, #âncora) resolvem para http: e passam. */
const ESQUEMAS_PERMITIDOS = new Set(["http:", "https:", "mailto:", "tel:"]);

/** A URL é segura? Usa o parser URL do navegador (WHATWG), que já ignora TAB/quebras de linha e
    espaços/controles no início ao decidir o esquema — então "java\tscript:" e "\u0001javascript:"
    viram `javascript:` aqui, igual ao que o navegador faria, e são recusadas. */
function urlPermitida(valor) {
    try {
        return ESQUEMAS_PERMITIDOS.has(new URL(valor, "http://relativa.invalid/").protocol);
    } catch {
        return false;
    }
}

/** srcset é uma lista "url [descritor], url …": cada URL precisa passar. */
function srcsetPermitido(valor) {
    return valor
        .split(",")
        .map((parte) => parte.trim().split(/\s+/)[0])
        .filter(Boolean)
        .every(urlPermitida);
}

/** Saneia uma subárvore já parseada: remove tags perigosas, TODO atributo on* (sem exceções) e
    atributos de URL com esquema fora da lista. Não há mais onerror inline: o ícone de item ausente
    é tratado por um ouvinte de "error" na captura (logo abaixo de itemIcon). */
function saneiaSubarvore(raiz) {
    for (const el of [...raiz.querySelectorAll("*")]) {
        if (TAGS_BLOQUEADAS.has(el.tagName.toLowerCase())) {
            el.remove();
            continue;
        }
        for (const atributo of [...el.attributes]) {
            const nome = atributo.name.toLowerCase();
            if (nome.startsWith("on")) {
                el.removeAttribute(atributo.name);
            } else if (ATR_URL.has(nome)) {
                const ok = nome === "srcset" ? srcsetPermitido(atributo.value) : urlPermitida(atributo.value);
                if (!ok) el.removeAttribute(atributo.name);
            }
        }
    }
}

/** Ponto único de injeção de HTML: substitui o conteúdo de `alvo` pelos nós
    parseados e saneados de `html`. Devolve o próprio alvo para encadear. */
function defineHTML(alvo, html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = String(html ?? ""); // único innerHTML do projeto, dentro de base.js
    saneiaSubarvore(tpl.content);
    alvo.replaceChildren(tpl.content);
    return alvo;
}

/** Construtor de DOM para código NOVO: el("tr", { class: "x", dataset: {…} },
    el("td", {}, "texto"), …). Strings viram nós de texto, Elementos entram como
    estão, { html: "…" } insere fragmento (use só com saída de richText/esc).
    Prefira isto a montar strings quando o conteúdo é estrutural. */
function el(tag, atributos = {}, ...filhos) {
    const no = document.createElement(tag);
    for (const [chave, valor] of Object.entries(atributos || {})) {
        if (valor == null || valor === false) continue;
        if (chave === "dataset") Object.assign(no.dataset, valor);
        else if (chave === "html") defineHTML(no, valor);
        else no.setAttribute(chave, valor === true ? "" : String(valor));
    }
    for (const filho of filhos.flat()) {
        if (filho == null || filho === false) continue;
        no.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
    }
    return no;
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
