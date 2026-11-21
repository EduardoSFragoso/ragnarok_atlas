/* ===== Ragnarök Atlas — app.js =====
   Aplicação de página única em JavaScript puro (sem build): carrega os JSONs da
   pasta data/ via fetch, renderiza as views como strings (padrão *View) e
   injeta o HTML em #content com innerHTML, além de ligar os eventos por
   delegação/onclick após cada render. O tema claro/escuro é salvo no
   localStorage ("ro-atlas-theme") e aplicado como atributo data-theme em
   <html>/<body> (tokens do tema vivem no styles.css). */

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
/* ===== Bases de conteúdo estático (links de referência; migrar para data/ depois) ===== */
/* ===== Referências, links e conteúdo estático (carregados de data/referencias.json em loadData) ===== */
let BROWIKI = [],
    HAZY_EP = [],
    IROWIKI = [];
const CALCS = [
    {
        id: "veneno",
        title: "Criar Veneno Mortal",
        kind: "Chance de sucesso",
        desc: "DES e SOR definem a chance estimada de criar uma Garrafa de Veneno.",
        fields: [
            ["des", "DES", 130],
            ["luk", "SOR", 130],
        ],
        calc: (v) => ({
            value: 20 + v.des * 0.4 + v.luk * 0.2,
            caption: "Chance estimada = 20 + DES × 0,4 + SOR × 0,2.",
            unit: "%",
        }),
    },
    {
        id: "toxina",
        title: "Criar Toxina",
        kind: "Chance de sucesso",
        desc: "Inclui a chance-base informada e a variação aleatória da fórmula.",
        fields: [
            ["nivel", "Pesquisa de Toxinas (1–10)", 10],
            ["base", "Chance-base da habilidade (%)", 80],
            ["des", "DES", 130],
            ["classe", "Nível de classe", 70],
            ["luk", "SOR", 130],
            ["rng", "Variação aleatória (−5 a +5)", -5],
        ],
        calc: (v) => ({
            value: v.base + (v.des + v.classe + v.luk * 2) / 20 + v.rng,
            caption:
                "A planilha não detalha a curva da chance-base por nível. O padrão inicial de 80% reproduz o exemplo " +
                "da própria planilha; ajuste a base conforme sua referência.",
            unit: "%",
        }),
    },
    {
        id: "runas",
        title: "Perícia em Runas",
        kind: "Chance de sucesso",
        desc: "Estima a chance para uma runa bruta e uma dificuldade escolhidas.",
        fields: [
            ["nivel", "Nível de Perícia em Runas (1–10)", 10],
            ["des", "DES", 120],
            ["luk", "SOR", 120],
            ["classe", "Nível de classe", 70],
            [
                "raridade",
                "Runa Bruta (bônus fixo)",
                60,
                [
                    ["Runa Bruta Comum", 4],
                    ["Runa Bruta Forte", 8],
                    ["Runa Bruta Rara", 15],
                    ["Runa Bruta Antiga", 30],
                    ["Runa Bruta Mística", 60],
                ],
            ],
            ["dificuldade", "Dificuldade da runa (%)", 5],
        ],
        calc: (v) => ({
            value: 30 + v.nivel * 2 + v.des / 30 + v.luk / 10 + v.classe / 10 + v.raridade - v.dificuldade,
            caption:
                "Chance-base por nível consultada na tabela da habilidade; o bônus é editável e a dificuldade vem da runa escolhida.",
            unit: "%",
        }),
    },
    {
        id: "preparar",
        title: "Preparar Poção",
        kind: "Chance de sucesso",
        desc: "Calcule uma chance para receita e dificuldade escolhidas.",
        fields: [
            ["pesquisa", "Pesquisa de Poções", 10],
            ["preparar", "Preparar Poção", 10],
            ["planos", "Mudança de Planos", 5],
            ["classe", "Nível de classe", 70],
            ["des", "DES", 120],
            ["luk", "SOR", 120],
            ["int", "INT", 120],
            ["dificuldade", "Dificuldade (%)", -15],
        ],
        calc: (v) => ({
            value:
                v.pesquisa +
                v.preparar +
                v.planos +
                v.classe * 0.2 +
                v.des * 0.1 +
                v.luk * 0.1 +
                v.int * 0.05 +
                v.dificuldade,
            caption: "A fórmula e as dificuldades editáveis vieram da planilha de Preparar Poção.",
            unit: "%",
        }),
    },
    {
        id: "manipular",
        title: "Manipular Poção",
        kind: "Estimativa de produção",
        desc: "Compara a fórmula A (resultado) à taxa do item (fórmula B).",
        fields: [
            ["nivel", "Nível da habilidade (1–5)", 5],
            ["int", "INT", 100],
            ["crv", "CRV", 100],
            ["luk", "SOR", 100],
            ["base", "Nível base", 200],
            ["pesquisa", "Pesquisa de Poções", 10],
            ["aleatorio", "Aleatório (50–200)", 125],
            ["taxa", "Taxa do item", 30],
        ],
        calc: (v) => {
            const a = v.int / 3 + v.crv + v.luk / 3 + v.base / 5 + v.aleatorio + (v.base - 100) + v.pesquisa * 5,
                b = v.taxa + v.nivel * 10,
                d = a - b,
                max = 5 + 2 * v.nivel,
                penalty = d >= 550 ? 0 : d >= 450 ? 3 : d >= 200 ? 5 : d > 0 ? 6 : 7;
            return {
                value: Math.max(0, max - penalty),
                unit: "poções",
                caption:
                    `Diferença A−B: ${fmt(d)} pontos. Máximo pelo nível: ${fmt(max)}. Faixa estimada: máximo − ${penalty}. ` +
                    `Fórmula A: ${fmt(a)} · Fórmula B: ${fmt(b)}.`,
            };
        },
    },
    {
        id: "farmacia",
        title: "Farmacologia Avançada",
        kind: "Estimativa de produção",
        desc: "Compara a fórmula A à taxa do produto para estimar a quantidade.",
        fields: [
            ["nivel", "Nível da habilidade", 10],
            ["int", "INT", 100],
            ["des", "DES", 200],
            ["luk", "SOR", 100],
            ["classe", "Nível de classe", 70],
            ["base", "Nível base", 250],
            ["pesquisa", "Pesquisa de Poções", 10],
            ["protecao", "Proteção Química Total", 5],
            ["delta", "Aleatório Δ (30–150)", 90],
            ["alpha", "Aleatório α (4–10)", 7],
            ["taxa", "Taxa do item", 10],
        ],
        calc: (v) => {
            const a =
                    v.int +
                    v.des / 2 +
                    v.luk +
                    v.classe +
                    v.delta +
                    (v.base - 100) +
                    v.pesquisa * 5 +
                    v.protecao * v.alpha,
                b = v.taxa + v.nivel * 10,
                d = a - b,
                max = 2 + v.nivel,
                penalty = d >= 400 ? 0 : d >= 300 ? 3 : d >= 100 ? 4 : d >= 1 ? 5 : 6;
            return {
                value: Math.max(0, max - penalty),
                unit: "poções",
                caption:
                    `Diferença A−B: ${fmt(d)} pontos. Máximo pelo nível: ${fmt(max)}. Faixa estimada: máximo − ${penalty}. ` +
                    `Fórmula A: ${fmt(a)} · Fórmula B: ${fmt(b)}.`,
            };
        },
    },
    {
        id: "culinaria",
        title: "Culinária Avançada",
        kind: "Estimativa de produção",
        desc: "Compara a criação à dificuldade aleatória e à dificuldade do prato.",
        fields: [
            ["classe", "Nível de classe", 70],
            ["des", "DES", 130],
            ["luk", "SOR", 130],
            ["aleatorio", "Aleatório (30–150)", 90],
            ["dificuldade", "Dificuldade do prato", 0],
        ],
        calc: (v) => {
            const a = v.classe / 4 + v.des / 3 + v.luk / 2,
                d = v.aleatorio + v.dificuldade,
                diff = a - d;
            return {
                value: diff,
                unit: "pts",
                caption: `Criação: ${fmt(a)} · Dificuldade: ${fmt(d)}. ${diff >= 30 ? "Estimativa indicada: 10 a 12 pratos." : diff >= 10 ? "Estimativa indicada: 10 pratos." : diff === 0 ? "Estimativa indicada: 8 pratos." : diff > -50 ? "Estimativa indicada: 5 pratos." : "Estimativa indicada: falha."}`,
            };
        },
    },
];
const db = {};
let currentView = "inicio",
    globalTerm = "";
/* ===== Mapas de IDs de itens e ícones ===== */
/* ===== Ícones: mapa nome -> id do Divine Pride ===== */
/* Preenchido em loadData a partir de data/referencias.json (itens_conhecidos
   e ep19_ids), dos mapas do Divine Pride e das receitas. */
let ICON_IDS = {};
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
/* ===== Normalização do formato das tabelas ===== */
const ROW_JSON_KEYS = [
    "equips",
    "custo",
    "encantos",
    "fontes",
    "reforma",
    "flechas",
    "toxina",
    "veneno",
    "runas",
    "preparar",
    "manipular",
    "farmacia",
    "culinaria",
];
/* Índices de coluna por NOME LÓGICO: COL.custo.material, COL.equips.npc etc.
   data/colunas.json liga cada nome lógico ao nome da coluna no JSON; aqui os
   nomes viram índices da matriz montada por rowsFromJson. O código das views
   usa COL e não números soltos (r[7]) — reordenar colunas não quebra nada. */
const COL = {};
function resolverColunas() {
    for (const key of ROW_JSON_KEYS) {
        const cabecalho = db[key]?.[0] || [];
        COL[key] = {};
        for (const [campo, nome] of Object.entries(db.colunas?.[key]?.campos || {})) {
            const i = cabecalho.indexOf(nome);
            if (i < 0) {
                console.error(`Campo "${campo}" aponta para a coluna "${nome}", ausente em ${DATA_FILES[key]}`);
                falhasCarga.push(`${DATA_FILES[key]} (coluna "${nome}" ausente)`);
            } else COL[key][campo] = i;
        }
    }
}
/* Converte as linhas-objeto dos JSONs em matriz (1ª linha = cabeçalho). As colunas
   são lidas POR NOME, na ordem definida em data/colunas.json: reordenar ou
   acrescentar colunas nos JSONs não desloca mais os índices usados pelo app.
   Sem o contrato (arquivo ausente), usa as chaves da primeira linha como antes. */
function rowsFromJson(dados, colunas, caminho = "") {
    const nomes = Array.isArray(colunas) && colunas.length ? colunas : Object.keys(dados[0] || {});
    if (Array.isArray(colunas) && dados.length) {
        const presentes = new Set(Object.keys(dados[0]));
        const faltam = nomes.filter((n) => !presentes.has(n));
        if (faltam.length) {
            console.error(`Coluna(s) ausente(s) em ${caminho}: ${faltam.join(", ")}`);
            falhasCarga.push(`${caminho} (coluna ausente: ${faltam.join(", ")})`);
        }
    }
    return [
        nomes.slice(),
        ...dados.map((r) =>
            nomes.map((k) => {
                const v = r[k];
                return v == null ? "" : String(v).trim();
            })
        ),
    ];
}
/* ===== Carga de dados (fetch dos JSONs em data/) ===== */
const falhasCarga = [];
/** Mostra o banner discreto com os arquivos que não carregaram. */
function mostrarBannerCarga(paths) {
    const b = $("#loadBanner");
    if (!b) return;
    b.hidden = false;
    b.innerHTML =
        `<span aria-hidden="true">⚠️</span> Falha ao carregar: ${paths
            .map((p) => `<code>${esc(p)}</code>`)
            .join(", ")}. ` + `Algumas seções podem ficar incompletas.`;
}
/** Aviso local para views que dependem de um arquivo ausente. */
function avisoSeFalha(chave) {
    const path = DATA_FILES[chave];
    return falhasCarga.includes(path)
        ? `<p class="table-search-note aviso-dados">⚠️ Falha ao carregar <code>${esc(path)}` +
              `</code> — esta seção pode estar incompleta.</p>`
        : "";
}
/* Carrega cada arquivo JSON separadamente: um erro não derruba o site. */
async function loadData() {
    const entries = Object.entries(DATA_FILES);
    const resultado = await Promise.allSettled(
        entries.map(async ([key, path]) => {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP ${response.status} em ${path}`);
            db[key] = JSON.parse(await response.text());
        })
    );
    resultado.forEach((res, i) => {
        if (res.status !== "rejected") return;
        const path = entries[i][1];
        falhasCarga.push(path);
        console.error(`Falha ao carregar ${path}`, res.reason);
    });
    entries.forEach(([key]) => {
        if (db[key] === undefined) db[key] = ["itemIds", "referencias", "colunas"].includes(key) ? {} : [];
    });
    for (const key of ROW_JSON_KEYS)
        db[key] = Array.isArray(db[key]?.[0])
            ? db[key]
            : rowsFromJson(db[key] || [], db.colunas?.[key]?.colunas, DATA_FILES[key]);
    resolverColunas();
    /* Conteúdo estático migrado para data/referencias.json: links, IDs
       conhecidos, Ep. 19 (grau/reciclagem) e chances expandidas com rb(). */
    const ref = db.referencias || {};
    BROWIKI = ref.browiki || [];
    HAZY_EP = ref.hazy || [];
    IROWIKI = ref.irowiki || [];
    GRAU19 = ref.grau19 || { steps: [], mats: [] };
    RECYCLE19 = ref.reciclagem19 || [];
    ACTIVITY_LINKS = ref.atividades || {};
    const expandChance = (bloco) =>
        Object.fromEntries(
            Object.entries(bloco || {}).map(([chave, linhas]) => [chave, linhas.flatMap(([a, b, v]) => rb(a, b, v))])
        );
    REF_CH = expandChance(ref.refino_chances);
    GRAU_CH = expandChance(ref.grau_chances);
    ICON_IDS = Object.assign({}, ref.itens_conhecidos || {}, ref.ep19_ids || {});
    Object.assign(ICON_IDS, db.itemIds || {});
    for (const key of ["toxina", "veneno", "runas", "preparar", "manipular", "farmacia", "culinaria"]) {
        const K = COL[key];
        for (const r of (db[key] || []).slice(1)) {
            if (r[K.idProduto] && r[K.produto]) ICON_IDS[r[K.produto]] = r[K.idProduto];
            if (r[K.idMaterial] && r[K.material]) ICON_IDS[r[K.material]] = r[K.idMaterial];
        }
    }
    if (falhasCarga.length) mostrarBannerCarga(falhasCarga);
}
/* ===== Receitas por habilidade ===== */
function getRecipes(id) {
    const K = COL[id];
    if (K?.produto == null) return [];
    let active = "";
    const recipes = [];
    for (const r of (db[id] || []).slice(id === "flechas" ? 2 : 1)) {
        if (r[K.produto]) {
            active = r[K.produto];
            recipes.push({ name: active, raw: r, materials: [] });
        }
        if (active && r[K.material]) {
            const recipe = recipes[recipes.length - 1],
                name = r[K.material],
                qty = r[K.quantidade] || "1";
            let material = recipe.materials.find((m) => m.name === name);
            if (!material) {
                material = { name, quantities: [] };
                recipe.materials.push(material);
            }
            material.quantities.push(qty);
        }
    }
    return recipes;
}
function setView(view) {
    currentView = view;
    $$(".nav-link").forEach((b) => {
        const on = b.dataset.view === view;
        b.classList.toggle("active", on);
        if (on) b.setAttribute("aria-current", "page");
        else b.removeAttribute("aria-current");
    });
    const names = {
        inicio: "VISÃO GERAL",
        guia: "GUIA DE EPISÓDIO",
        diarias: "MISSÕES DIÁRIAS DE EPISÓDIO",
        equipamentos: "EQUIPAMENTOS",
        encantamentos: "ENCANTAMENTOS",
        custos: "CUSTOS & MATERIAIS",
        reformas: "REFORMA DE ARMAS",
        grau: "GRAU & REFINAMENTO",
        reciclagem: "RECICLAGEM (EP. 19)",
        calculadoras: "CALCULADORAS",
        fontes: "FONTES & REFERÊNCIAS",
    };
    $("#crumb").textContent = names[view] || "VISÃO GERAL";
    render();
}
/* ===== Navegação e views ===== */
function landing() {
    return (
        `<div class="eyebrow">Guia comunitário · Ragnarok Online LATAM</div>
<div class="section-heading">` +
        `<div><h2>O que você procura?</h2><p>Acesse uma seção ou use a busca no topo para encontrar qualquer dado.</p>` +
        `</div></div><div class="quick-grid">${[
            ["guia", "❖", "Guia de Episódio", "Passo a passo da história e secundárias com /navi copiável."],
            ["diarias", "⟳", "Missões diárias", "Tarefas diárias do episódio com itens e recompensas."],
            ["equipamentos", "◈", "Equipamentos", "Veja peças por episódio, categoria e NPC."],
            ["encantamentos", "✳", "Encantamentos", "Compare efeitos disponíveis por slot."],
            ["custos", "◇", "Custos & materiais", "Veja requisitos, NPCs e materiais de encanto."],
            ["reformas", "↗", "Reforma de armas", "Consulte conversões, materiais e perda de refino."],
            ["grau", "⬆", "Grau & Refinamento", "Consulte regras, chances e materiais de melhoria."],
            [
                "reciclagem",
                "♻",
                "Reciclagem (Ep. 19)",
                "Veja o que o Incinerador devolve ao reciclar armas Vis Invernais.",
            ],
            ["calculadoras", "∑", "Calculadoras", "Estime chances e resultados de criação."],
            ["fontes", "↗", "Fontes e referências", "Consulte as páginas de apoio e as observações dos dados."],
        ]
            .map(
                (c) =>
                    `<button class="quick-card card" data-go="${c[0]}"><span class="quick-icon">${c[1]}` +
                    `</span><h3>${c[2]}</h3><p>${c[3]}</p></button>`
            )
            .join("")}` +
        `</div>`
    );
}
const TABLES = {
    equipamentos: {
        key: "equips",
        title: "Equipamentos de episódio",
        desc: "Peças disponíveis, NPCs, materiais de troca e observações.",
        cols: [
            ["ep", "Episódio"],
            ["cat", "Categoria"],
            ["equip", "Equipamento"],
            ["npc", "NPC"],
            ["navi", "/navi"],
            ["mat1", "Material"],
            ["qtd1", "Qtd."],
            ["mat2", "Material 2"],
            ["qtd2", "Qtd. 2"],
            ["obs", "Observação"],
        ],
        filters: ["ep", "cat"],
    },
    encantamentos: {
        key: "encantos",
        title: "Encantamentos disponíveis",
        desc: "Efeitos listados por episódio, equipamento-alvo e slot.",
        cols: [
            ["ep", "Episódio"],
            ["alvo", "Equipamento-alvo"],
            ["slot", "Slot"],
            ["efeito", "Tipo de efeito"],
            ["encanto", "Encantamento"],
            ["valor", "Efeito"],
            ["consumido", "Item consumido"],
            ["chance", "Chance (%)"],
            ["obs", "Observação"],
        ],
        filters: ["ep", "alvo", "slot"],
    },
    custos: {
        key: "custo",
        title: "Custos de encantamento",
        desc: "Materiais, quantidades, NPCs e observações para preparar cada encantamento.",
        cols: [
            ["ep", "Episódio"],
            ["alvo", "Equipamento-alvo"],
            ["slot", "Slot"],
            ["efeito", "Tipo de efeito"],
            ["material", "Material"],
            ["qtd", "Qtd."],
            ["npc", "NPC / origem"],
            ["navi", "/navi"],
            ["obs", "Observação"],
        ],
        filters: ["ep", "alvo", "slot"],
    },
};
/* ===== Busca (termo único em globalTerm, com debounce e cache por linha) ===== */
function tableView(view) {
    const config = TABLES[view],
        rows = (db[config.key] || []).slice(1).filter((r) => r.some(Boolean));
    const eps = [...new Set(rows.map((r) => r[COL[config.key].ep]).filter(Boolean))].sort(
        (a, b) => episodeRank(b) - episodeRank(a)
    );
    return (
        `<div class="page-head"><div><div class="eyebrow">BIBLIOTECA DE DADOS</div><h1 class="page-title">` +
        `${config.title}</h1><p class="page-subtitle">${config.desc}</p></div><span class="count-pill">` +
        `${rows.length} REGISTROS</span></div>${avisoSeFalha(config.key)}<div class="toolbar">` +
        `<input id="tableSearch" type="search" aria-label="Filtrar a tabela" placeholder="Filtrar por nome, material ` +
        `ou observação…" value="${esc(globalTerm)}">` +
        `<select id="episodeFilter" aria-label="Filtrar por episódio"><option value="">Todos os episódios</option>` +
        `${eps.map((e) => `<option>${esc(e)}</option>`).join("")}</select><button class="button" id="clearFilters">Limpar ` +
        `filtros</button>` +
        `</div><div id="tableMount"></div>`
    );
}
function filteredRows(view) {
    const cfg = TABLES[view],
        rows = (db[cfg.key] || []).slice(1).filter((r) => r.some(Boolean));
    const term = globalTerm.trim().toLocaleLowerCase("pt-BR"),
        ep = $("#episodeFilter")?.value || "";
    return rows.filter((r) => (!term || rowText(r).includes(term)) && (!ep || r[COL[cfg.key].ep] === ep));
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
function tableFrame(headers, body, extra = "") {
    return (
        `<div class="table-wrap"><table class="data-table ${extra}"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}` +
        `</tr></thead><tbody>${body || `<tr><td class="empty" colspan="${headers.length}">Nenhum resultado para esse filtro.</td></tr>`}` +
        `</tbody></table></div>`
    );
}
function rowspanBody(rows, cols, mergeCols = []) {
    if (!rows.length) return "";
    let out = "";
    for (let i = 0; i < rows.length; i++) {
        out += "<tr>";
        cols.forEach((c, j) => {
            if (mergeCols.includes(j)) {
                const parents = mergeCols.filter((n) => n <= j),
                    same = (a, b) =>
                        parents.every((k) => String(rows[a][cols[k][0]] || "") === String(rows[b][cols[k][0]] || ""));
                if (i > 0 && same(i - 1, i)) return;
                let span = 1;
                while (i + span < rows.length && same(i, i + span)) span++;
                out += `<td rowspan="${span}">${c[2] ? c[2](rows[i]) : esc(rows[i][c[0]] || "—")}</td>`;
            } else out += `<td>${c[2] ? c[2](rows[i]) : esc(rows[i][c[0]] || "—")}</td>`;
        });
        out += "</tr>";
    }
    return out;
}
function renderEquipmentTable(rows) {
    const K = COL.equips;
    const sections = sortEpisodes(
        groupBy(rows, (r) => `${r[K.ep]}\x00${r[K.cat]}`),
        K.ep
    );
    const equipment = sections
        .map((section) => {
            const byCost = groupBy(section, (r) =>
                [r[K.npc], r[K.navi], r[K.mat1], r[K.qtd1], r[K.mat2], r[K.qtd2]].join("\x00")
            );
            const rowsHtml = byCost
                .map((costGroup) => {
                    const unique = [...new Map(costGroup.map((r) => [r[K.equip], r])).values()];
                    const c = costGroup[0],
                        note = String(c[K.obs] || "")
                            .replace(/Preço por equipamento\.?\s*/i, "")
                            .replace(/Armaduras?(?:\s*\/[^.]*)?\.?/i, "")
                            .trim(),
                        price = [
                            c[K.qtd1] && `${esc(c[K.qtd1])} ${itemLink(c[K.mat1])}`,
                            note && esc(note),
                            c[K.npc] && `NPC: ${esc(c[K.npc])}`,
                            c[K.navi] && esc(c[K.navi]),
                            c[K.qtd2] && `${esc(c[K.qtd2])} ${itemLink(c[K.mat2])}`,
                        ].filter(Boolean);
                    return unique
                        .map(
                            (r, i) =>
                                `<tr><td><span class="item-label">${itemLink(r[K.equip])}</span></td>${
                                    i === 0
                                        ? `<td rowspan="${unique.length}" class="material-cell"><div class="material-lines">` +
                                          `${price
                                              .map(
                                                  (x, j) =>
                                                      `<span class="${j === 0 ? "material-line" : "table-meta"}">${j === 0 ? `<b class="material-qty">${x}</b>` : x}` +
                                                      `</span>`
                                              )
                                              .join("")}` +
                                          `</div></td>`
                                        : ""
                                }` + `</tr>`
                        )
                        .join("");
                })
                .join("");
            return (
                `<section class="table-section"><div class="table-section-head"><h2>${esc(section[0][K.ep])} · ${esc(section[0][K.cat])}` +
                `</h2><span>${new Set(section.map((r) => r[K.equip])).size} equipamentos</span></div>` +
                `${tableFrame([`Equipamentos · ${esc(section[0][K.cat])}`, "Preço por equipamento"], rowsHtml, "grouped-table")}` +
                `</section>`
            );
        })
        .join("");
    const episode = $("#episodeFilter")?.value || "",
        term = globalTerm,
        showRefiner = (!episode || /Automatron/i.test(episode)) && (!term || /Automatron|refinador/i.test(term));
    return (
        equipment +
            (showRefiner
                ? `<section class="table-section"><div class="table-section-head"><h2>Automatron · refinamento</h2>` +
                  `<span>1 refinador</span></div>${tableFrame(
                      ["Item", "Refino exigido", "Resultado", "Custo", "Equipamentos compatíveis"],
                      `<tr><td>${itemLink("Refinador de Automatron")}</td><td>+4 a +6</td><td>+7</td><td>30.000.000 Zeny</td>` +
                          `<td>Colete, Perna e Motor Automatron A/B</td></tr>`,
                      "grouped-table"
                  )}` +
                  `</section>`
                : "") ||
        `<div class="table-wrap"><table class="data-table"><tbody><tr><td class="empty">Nenhum resultado para esse filtro.</td>` +
            `</tr></tbody></table></div>`
    );
}
function renderEnchantTable(rows) {
    const K = COL.encantos;
    const sections = sortEpisodes(
        groupBy(rows, (r) => `${r[K.ep]}\x00${r[K.alvo]}`),
        K.ep
    );
    return (
        sections
            .map((section) => {
                const dedup = [
                    ...new Map(
                        section.map((r) => [
                            [r[K.slot], r[K.efeito], r[K.encanto], r[K.valor], r[K.consumido], r[K.obs]].join("\x00"),
                            r,
                        ])
                    ).values(),
                ];
                const cols = [
                    [K.slot, "Slot(s)"],
                    [K.efeito, "Tipo de efeito"],
                    [K.encanto, "Encantamento", (r) => `<span class="item-label">${itemLink(r[K.encanto])}</span>`],
                    [K.valor, "Efeito (+11 quando aplicável)", (r) => esc(r[K.valor] || "—")],
                ];
                const body = rowspanBody(dedup, cols, [0, 1]);
                return (
                    `<section class="table-section"><div class="table-section-head"><h2>${esc(section[0][K.ep])} · ${esc(section[0][K.alvo])}` +
                    `</h2><span>${dedup.length} opções</span></div><p class="table-search-note">Os valores são os publicados ` +
                    `para o equipamento em +11 quando aplicável; nos acessórios, mantive o efeito normal indicado pela referência.</p>` +
                    `${tableFrame(
                        cols.map((c) => esc(c[K.alvo])),
                        body,
                        "grouped-table align-top"
                    )}` +
                    `</section>`
                );
            })
            .join("") ||
        `<div class="table-wrap"><table class="data-table"><tbody><tr><td class="empty">Nenhum resultado para esse filtro.</td>` +
            `</tr></tbody></table></div>`
    );
}
function renderCostTable(rows) {
    const K = COL.custo;
    const episodes = sortEpisodes(
        groupBy(rows, (r) => r[K.ep]),
        K.ep
    );
    return (
        episodes
            .map((episode) => {
                const all = episode;
                if (/Ep\.\s*19\b/i.test(episode[0][K.ep])) {
                    const targets = [...new Set(all.map((r) => r[K.alvo]).filter(Boolean))],
                        body = targets
                            .map((target) => {
                                const groups = groupBy(
                                        all.filter((x) => x[K.alvo] === target),
                                        (r) => `${r[K.slot]}\x00${r[K.efeito]}`
                                    ),
                                    isArmor =
                                        /Armadura|Veste|Manto|Sobrepeliz|Bota|Sapato|Anel|Brinco|Pingente|Colar/i.test(
                                            target
                                        );
                                const mats = (g) =>
                                    `<div class="material-lines">${g
                                        .map(
                                            (x) =>
                                                `<div class="material-line"><b class="material-qty">${esc(x[K.qtd] || "—")} ×</b>` +
                                                `${itemLink(x[K.material])}</div>`
                                        )
                                        .join("")}` + `</div>`;
                                if (!isArmor)
                                    return groups
                                        .map(
                                            (g) =>
                                                `<tr><td>${esc(target)}</td><td>${esc(g[0][K.slot] || "—")}</td><td>${esc(g[0][K.efeito] || "—")}` +
                                                `</td><td class="material-cell">${mats(g)}</td></tr>`
                                        )
                                        .join("");
                                const slots = groups.map((g) => esc(g[0][K.slot] || "—")).join("<br>"),
                                    fx = groups.map((g) => esc(g[0][K.efeito] || "—")).join("<br>");
                                const mkey = (g) => g.map((x) => [x[K.material], x[K.qtd]].join("\x00")).join("|"),
                                    uniq = new Map();
                                groups.forEach((g) => {
                                    if (!uniq.has(mkey(g))) uniq.set(mkey(g), g);
                                });
                                const matHtml =
                                    uniq.size === 1
                                        ? mats(groups[0])
                                        : [...uniq.values()]
                                              .map(
                                                  (g) =>
                                                      `<span class="table-meta">Encantamento ${esc(g[0][K.slot] || "")} · ${esc(g[0][K.efeito] || "")}` +
                                                      `</span>${mats(g)}`
                                              )
                                              .join("");
                                return `<tr><td>${esc(target)}</td><td>${slots}</td><td>${fx}</td><td class="material-cell">${matHtml}</td></tr>`;
                            })
                            .join("");
                    const navis = [...new Set(all.map((r) => r[K.navi]).filter(Boolean))];
                    return (
                        `<section class="table-section"><div class="table-section-head"><h2>${esc(episode[0][K.ep])} · custo de encantamento</h2>` +
                        `<span>${targets.length} equipamentos</span></div><div class="panel-note cost-summary">` +
                        `<b>Armaduras e acessórios:</b> 35 × ${itemLink("Pétala de Flor Invernal")} em Vellgunde (${esc(navis[0] || "")}). ` +
                        `A troca entrega <b>1 Peça de Flor Invernal aleatória</b>. Os custos dos encantamentos de armas variam ` +
                        `por slot e estão na tabela.</div>` +
                        `${
                            all.some((r) => /\*/.test(r[K.efeito] || ""))
                                ? '<p class="table-search-note" style="margin:6px 0 10px">* Encantamentos de habilidade de classe 3: valores ' +
                                  "confirmados somente no Hazy Forest (kRO); não constam na bROWiki ou iROWiki.</p>"
                                : ""
                        }${tableFrame(["Equipamento", "Slot(s)", "Tipo de efeito", "Materiais por tentativa"], body, "grouped-table align-top")}` +
                        `</section>`
                    );
                }
                const perTarget = groupBy(all, (r) => `${r[K.alvo]}\x00${r[K.slot]}\x00${r[K.efeito]}`).map((g) => {
                    const r = g[0],
                        materials = [
                            ...new Map(
                                g.map((x) => [[x[K.material], x[K.qtd], x[K.npc], x[K.navi], x[K.obs]].join("\x00"), x])
                            ).values(),
                        ];
                    const signature = materials
                        .flatMap((x) => [x[K.material], x[K.qtd], x[K.npc], x[K.navi], x[K.obs]])
                        .join("\x00");
                    return {
                        target: r[K.alvo] || "—",
                        slot: r[K.slot] || "—",
                        effect: r[K.efeito] || "—",
                        materials,
                        signature,
                    };
                });
                const sameCosts = groupBy(perTarget, (x) => x.signature);
                return sameCosts
                    .map((costGroup) => {
                        const first = costGroup[0],
                            targets = [...new Set(costGroup.map((x) => x.target))],
                            materials = first.materials
                                .map(
                                    (x) =>
                                        `<div class="material-line"><b class="material-qty">${esc(x[K.qtd] || "—")} ×</b>` +
                                        `${itemLink(x[K.material])}</div>${x[K.npc] ? `<span class="table-meta">${esc(x[K.npc])}${x[K.navi] ? ` · ${esc(x[K.navi])}` : ""}</span>` : ""}${x[K.obs] ? `<span class="table-meta">${esc(x[K.obs])}</span>` : ""}`
                                )
                                .join(""),
                            body = costGroup
                                .map(
                                    (x, i) =>
                                        `<tr><td>${esc(x.target)}</td><td>${esc(x.slot)}</td><td>${esc(x.effect)}</td>${i === 0 ? `<td rowspan="${costGroup.length}" class="material-cell"><div class="material-lines">${materials}</div></td>` : ""}` +
                                        `</tr>`
                                )
                                .join("");
                        return (
                            `<section class="table-section"><div class="table-section-head"><h2>${esc(episode[0][K.ep])} · custo por encantamento</h2>` +
                            `<span>${targets.length} peças com o mesmo custo</span></div>${tableFrame(["Equipamento", "Slot(s)", "Tipo de efeito", "Materiais por tentativa"], body, "grouped-table align-top")}` +
                            `</section>`
                        );
                    })
                    .join("");
            })
            .join("") ||
        `<div class="table-wrap"><table class="data-table"><tbody><tr><td class="empty">Nenhum resultado para esse filtro.</td>` +
            `</tr></tbody></table></div>`
    );
}
let activeDiaEp = null,
    diaBonus = false;
function diaRows() {
    const K = COL.fontes;
    return (db.fontes || []).slice(1).filter((r) => r[K.ep] && r[K.atividade] && r[K.item]);
}
function diaEps() {
    const K = COL.fontes;
    return [...new Set(diaRows().map((r) => r[K.ep]))].sort((a, b) => episodeRank(b) - episodeRank(a));
}
function guiaEpFor(label) {
    const rank = episodeRank(label);
    if (rank < 0) return null;
    return (
        (db.guia || []).find((e) => {
            const m = String(e.titulo || "").match(/(\d+(?:\.\d+)?)/);
            return m && Number(m[1]) === rank;
        }) || null
    );
}
function diaTotals(rows, bonus) {
    const K = COL.fontes;
    const m = new Map();
    rows.forEach((r) => {
        const incl = String(r[K.incluir] || "").toLowerCase() === "sim",
            base = incl ? Number(r[K.qtd]) || 0 : 0,
            extra = bonus && incl && Number(r[K.bonus]) > 0 ? Number(r[K.bonus]) : 0,
            q = base + extra;
        if (q > 0) m.set(r[K.item], (m.get(r[K.item]) || 0) + q);
    });
    return m;
}
function diaTotalsHtml(rows, bonus) {
    return (
        [...diaTotals(rows, bonus)]
            .map(
                ([n, q]) =>
                    `<span class="total-item"><span class="item-label">${itemLink(n)}</span>: <b>${fmt(q)}</b></span>`
            )
            .join("") || "—"
    );
}
function diaTablesTsv(rows) {
    const K = COL.fontes;
    const tipos = [...new Set(rows.map((r) => r[K.tipo] || "—"))],
        temBonus = rows.some((r) => Number(r[K.bonus]) > 0),
        cols = [
            [K.atividade, "Atividade", (c) => activityLink(c[K.atividade])],
            [K.item, "Item", (c) => `<span class="item-label">${itemLink(c[K.item])}</span>`],
            [K.qtd, "Qtd. por execução", (c) => esc(c[K.qtd] || "0")],
        ];
    if (temBonus)
        cols.push([
            K.bonus,
            "Bônus por reputação",
            (c) => ((Number(c[K.bonus]) || 0) > 0 ? `+${esc(c[K.bonus])}` : "—"),
        ]);
    cols.push([K.obs, "Observação", (c) => esc(c[K.obs] || "—")]);
    const merge = [0];
    if (temBonus) merge.push(cols.length - 2);
    return tipos
        .map((t) => {
            const rs = rows.filter((r) => (r[K.tipo] || "—") === t),
                n = new Set(rs.map((r) => r[K.atividade])).size,
                title =
                    t === "Missão diária"
                        ? "Missões diárias"
                        : t === "Instância diária"
                          ? "Instâncias diárias"
                          : esc(t),
                body = rowspanBody(rs, cols, merge);
            return (
                `<section class="table-section"><div class="table-section-head"><h2>${title}</h2>` +
                `<span>${n} atividade${n > 1 ? "s" : ""}</span></div>${tableFrame(
                    cols.map((c) => esc(c[1])),
                    body,
                    "grouped-table align-top"
                )}` +
                `</section>`
            );
        })
        .join("");
}
function diariasView() {
    const K = COL.fontes;
    const eps = diaEps();
    activeDiaEp = eps.includes(activeDiaEp) ? activeDiaEp : eps[0];
    const rows = diaRows().filter((r) => r[K.ep] === activeDiaEp);
    const ges = guiaEpFor(activeDiaEp),
        grupos = ges?.diarias?.grupos;
    /* Título cru: o esc() é aplicado na interpolação, depois. */
    const title = grupos ? ges.diarias.titulo : activeDiaEp;
    const gruposHtml = grupos
        ? grupos
              .map((gr) => {
                  const body = trs(
                      gr.diarias.map((d) => [
                          d.linkBrowiki
                              ? `<a class="table-link" href="${d.linkBrowiki}" target="_blank" rel="noopener noreferrer" title="Abrir na bROWiki">` +
                                `${esc(d.nome)} ↗</a>`
                              : esc(d.nome),
                          richText(d.tarefa),
                          richText(d.itens),
                          richText(d.recompensa),
                          d.obs ? esc(d.obs) : "",
                      ])
                  );
                  const extra = gr.diarias
                      .filter((d) => (d.detalhes && d.detalhes.length) || d.tabela)
                      .map((d) => {
                          const passos =
                              d.detalhes && d.detalhes.length
                                  ? `<ol class="guide-steps">${d.detalhes.map((x) => `<li class="guide-step"><span class="step-text">${richText(x)}</span></li>`).join("")}` +
                                    `</ol>`
                                  : "";
                          const tabela = d.tabela
                              ? tableFrame(
                                    d.tabela.colunas.map((c) => esc(c)),
                                    trs(d.tabela.linhas.map((r) => r.map(richText))),
                                    "align-top"
                                )
                              : "";
                          return (
                              `<section class="guide-section" id="${esc(activeDiaEp)}-como-${esc(d.nome)
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]+/g, "-")}">` +
                              `<div class="guide-section-head"><h3>Como fazer — ${esc(d.nome)}</h3></div>${passos}${tabela}` +
                              `</section>`
                          );
                      })
                      .join("");
                  return (
                      `<section class="table-section"><div class="table-section-head"><h2>${esc(gr.nome)}` +
                      `</h2><span>${gr.diarias.length} diária${gr.diarias.length > 1 ? "s" : ""}</span>` +
                      `</div>${tableFrame(["Diária", "Tarefa", "Itens", "Recompensa", "Observação"], body, "align-top")}${extra}` +
                      `</section>`
                  );
              })
              .join("")
        : diaTablesTsv(rows);
    const temBonus = rows.some((r) => Number(r[K.bonus]) > 0);
    return (
        `
    <div class="page-head">
      <div>
        <div class="eyebrow">DIÁRIAS DE EPISÓDIO</div>
        <h1 class="page-title">` +
        `${esc(title)}</h1>
        <p class="page-subtitle">Tarefas repetíveis do episódio, com os itens de ` +
        `cada uma.</p>
      </div>
      ${diariasEstoqueWidget(activeDiaEp, rows)}
    </div>
    <div class="toolbar" ` +
        `style="margin-bottom:14px">` +
        `<label for="diaSelect" style="font-size:14px">Episódio:</label><select id="diaSelect">` +
        `${eps.map((e) => `<option${e === activeDiaEp ? " selected" : ""}>${esc(e)}</option>`).join("")}` +
        `</select></div>
    ${avisoSeFalha("fontes")}
    ${ges?.diarias?.aviso ? `<div class="panel-note">${richText(ges.diarias.aviso)}</div>` : ""}
    ` +
        `<div class="panel-note">` +
        `<b>Ganho por dia:</b> <span id="diaTotalsList">${diaTotalsHtml(rows, diaBonus && temBonus)}` +
        `</span></div>
    ${gruposHtml}
  `
    );
}
/* ===== Controle de farm: estoque por episódio (na página de diárias) ===== */
/* O estoque fica salvo POR EPISÓDIO (chave "ro-atlas-estoque-ep"): o valor
   inicial é o que sobrou das quests quando o episódio termina; o ganho das
   diárias pode ser somado com o botão "+ N" ou digitado à mão. */
function recompensaFor(ep) {
    return (db.recompensas?.episodios || {})["ep" + episodeRank(ep)] || null;
}
function estEpCarregar(ep) {
    return stLoad("ro-atlas-estoque-ep", {})[ep] || {};
}
function estEpSalvar(ep, itens) {
    const tudo = stLoad("ro-atlas-estoque-ep", {});
    tudo[ep] = itens;
    stSave("ro-atlas-estoque-ep", tudo);
}
/* Cartão do estoque exibido no topo direito da página de diárias. */
function diariasEstoqueWidget(ep, rows) {
    const K = COL.fontes;
    const rec = recompensaFor(ep),
        totals = diaTotals(rows, diaBonus),
        temBonus = rows.some((r) => Number(r[K.bonus]) > 0),
        moedas = rec?.moedas?.length ? rec.moedas : [...totals.keys()];
    if (!moedas.length) return "";
    const est = estEpCarregar(ep);
    return (
        `<div id="diaEstoque" data-ep="${esc(ep)}" class="estoque-widget"><div class="est-head">` +
        `<span class="eyebrow">ESTOQUE · ${esc(ep)}</span>${
            temBonus
                ? `<label class="bonus-entry"><input type="checkbox" id="diaBonus"${diaBonus ? " checked" : ""}> incluir ` +
                  `bônus por reputação</label>`
                : ""
        }` +
        `</div>${moedas
            .map((m) => {
                const farm = totals.get(m) || 0;
                return (
                    `<div class="est-item"><span class="item-label">${itemIcon(m)}${esc(m)}</span><span class="est-controls">` +
                    `<label>Tem <input type="number" min="0" step="1" data-est-item="${esc(m)}" value="${esc(est[m] ?? rec?.total_moedas?.[m] ?? 0)}" ` +
                    `title="Valor salvo; vazio ou 0 volta ao total das quests">` +
                    `</label><button type="button" class="button" data-est-add="${esc(m)}" data-farm="${farm}" title="Somar ` +
                    `o ganho das diárias de hoje ao estoque">+ ${fmt(farm)}` +
                    `</button><button type="button" class="button stock-reset" data-est-rst="${esc(m)}" title="Voltar ao ` +
                    `total das quests deste item">↺</button>` +
                    `</span></div>`
                );
            })
            .join("")}` +
        `<p class="table-search-note">O valor inicial é o total das quests do episódio; use “+ N” para somar ` +
        `o farm de hoje. Salvo no navegador, por episódio.</p>` +
        `</div>`
    );
}
function bindDiariasEstoque() {
    const widget = $("#diaEstoque");
    if (!widget) return;
    const ep = activeDiaEp;
    $$("[data-est-item]").forEach((inp) => {
        inp.oninput = () => {
            const est = estEpCarregar(ep),
                v = inp.value.trim();
            if (v === "") delete est[inp.dataset.estItem];
            else est[inp.dataset.estItem] = Math.max(0, stNum(v));
            estEpSalvar(ep, est);
        };
    });
    $$("[data-est-add]").forEach((b) => {
        b.onclick = () => {
            const item = b.dataset.estAdd,
                est = estEpCarregar(ep);
            est[item] = stNum(est[item]) + stNum(b.dataset.farm);
            estEpSalvar(ep, est);
            render();
        };
    });
    $$("[data-est-rst]").forEach(
        (b) =>
            (b.onclick = () => {
                const est = estEpCarregar(ep);
                delete est[b.dataset.estRst];
                estEpSalvar(ep, est);
                render();
            })
    );
}
/* ===== Tabelas de dados (montagem por view) ===== */
function renderDataTable(view) {
    const found = filteredRows(view);
    if (view === "equipamentos") {
        $("#tableMount").innerHTML = renderEquipmentTable(found);
        return;
    }
    if (view === "encantamentos") {
        $("#tableMount").innerHTML = renderEnchantTable(found);
        return;
    }
    if (view === "custos") {
        $("#tableMount").innerHTML = renderCostTable(found);
        return;
    }
    const cfg = TABLES[view],
        cols = cfg.cols.map(([campo, rotulo]) => [COL[cfg.key][campo], rotulo]),
        body = rowspanBody(found, cols, cfg.mergeCols || []);
    $("#tableMount").innerHTML = tableFrame(
        cols.map((c) => esc(c[1])),
        body
    );
}
function renderReformTable() {
    const f = db.fides || {},
        term = globalTerm.toLocaleLowerCase("pt-BR");
    $("#reformNote").innerHTML =
        `<p class="table-search-note">Armas Adulter Fides (+9 ou mais) viram Vivatus Fides com o ${esc(f.npc?.nome || "Bamdatt")} ${naviBtn("/navi " + (f.npc?.navi || "wolfvill 170/131"))}. ` +
        `Os três métodos têm o mesmo custo fixo para todas as classes e armas; o Esboço de Arma deve corresponder ` +
        `à arma desejada.</p>`;
    const classes = (f.classes || []).filter(
        (cl) =>
            !term ||
            `${cl.classe} ${cl.armas.map((a) => `${a.o} ${a.r}`).join(" ")}`.toLocaleLowerCase("pt-BR").includes(term)
    );
    const ritual = f.metodos?.length
        ? `<div class="ritual-card"><div class="ritual-head"><h2>Materiais dos rituais</h2>` +
          `<span class="ritual-note">Iguais para todas as classes e armas · dropam no modo difícil da Mansão da Desilusão</span>` +
          `</div><div class="ritual-grid">${f.metodos
              .map(
                  (m) =>
                      `<div class="ritual-met"><h3>${esc(m.nome)}</h3><span class="table-meta">${esc(m.nota || "\u2014")}` +
                      `</span>${refMats(m.mats)}</div>`
              )
              .join("")}` +
          `</div></div>`
        : "";
    $("#reformConversionMount").innerHTML =
        ritual +
        tableFrame(
            ["Classe", "Adulter \u2192 Vivatus"],
            classes
                .map(
                    (cl) =>
                        `<tr><td class="classe-cell">${esc(cl.classe)}</td><td><div class="ver-grid">${cl.armas
                            .map((a) => `<div class="adu">${refItem(a.o)}</div><div class="viv">${refItem(a.r)}</div>`)
                            .join("")}` + `</div></td></tr>`
                )
                .join(""),
            "conv-table align-top"
        );
}
/* ===== Calculadoras (catálogo e painéis) ===== */
function calcView(selected = "") {
    const cards =
        CALCS.map(
            (c) =>
                `<button class="card calc-card" data-calc="${c.id}"><span class="calc-type">${c.kind}` +
                `</span><h3>${c.title}</h3><p>${c.desc}</p></button>`
        ).join("") +
        `<button class="card calc-card" data-calc="flechas"><span class="calc-type">Materiais por lote</span>` +
        `<h3>Fabricar Flechas</h3><p>Consulte todos os tipos de flecha e seus materiais.</p>` +
        `</button>` +
        EXTRA_CALCS.map(
            (c) =>
                `<button class="card calc-card" data-calc="${c.id}"><span class="calc-type">${c.kind}` +
                `</span><h3>${c.title}</h3><p>${c.desc}</p></button>`
        ).join("");
    return (
        `<div class="page-head"><div><div class="eyebrow">FERRAMENTAS DE JOGO · VERSÃO 1.3</div>` +
        `<h1 class="page-title">Calculadoras</h1><p class="page-subtitle">Os valores são calculados no seu navegador ` +
        `e não são enviados nem salvos.</p>` +
        `</div><span class="count-pill">${CALCS.length + EXTRA_CALCS.length + 1} FERRAMENTAS</span>` +
        `</div><div class="calc-grid">${cards}</div><div id="calcMount">${selected ? calcPanel(selected) : ""}` +
        `</div><div id="recipeCatalog">${selected ? recipeCatalog(selected) : ""}</div>`
    );
}
function calcExplanation(id) {
    const notes = {
        manipular:
            `<b>Como a diferença determina a quantidade</b><ul><li>Δ = Fórmula A − Fórmula B.</li>` +
            `<li>Produção máxima no nível 5: 15 poções.</li><li>Δ ≥ 550: sem redução; 450–549: −3; 200–449: −5; 1–199: −6; Δ ≤ 0: −7.</li>` +
            `<li>Exemplo: Δ 401,7 aplica −5; resultado estimado: 10 poções.</li></ul>`,
        farmacia:
            `<b>Como a diferença determina a quantidade</b><ul><li>Δ = Fórmula A − Fórmula B.</li>` +
            `<li>Produção máxima: nível da habilidade + 2 poções.</li><li>Δ ≥ 400: sem redução; 300–399: −3; 100–299: ` +
            `−4; 1–99: −5; Δ ≤ 0: −6.</li>` +
            `<li>O valor final é a produção máxima menos a penalidade da faixa.</li></ul>`,
        culinaria:
            `<b>Como a diferença determina a quantidade</b><ul><li>Δ = Criação − Dificuldade do prato.</li>` +
            `<li>Δ ≥ 30: 10 a 12 pratos; 10–29: 10; Δ = 0: 8.</li><li>Δ entre −1 e −49: 5 pratos; Δ ≤ −50: falha.</li>` +
            `<li>A calculadora mostra a faixa prevista; não trata a diferença como quantidade direta.</li>` +
            `</ul>`,
    };
    return notes[id] ? `<div class="calc-explanation">${notes[id]}</div>` : "";
}
function calcPanel(id) {
    if (EXTRA_PANELS[id]) return EXTRA_PANELS[id]();
    const recipes = getRecipes(id);
    if (id === "flechas")
        return (
            `<section class="calculator" data-active-calc="flechas"><div class="card calc-form">` +
            `<h3>Fabricar Flechas</h3><p>Escolha o tipo de flecha para ver os materiais necessários.</p>` +
            `<div class="fields"><div class="field"><label for="arrowType">Tipo de flecha</label>` +
            `<select id="arrowType" name="arrowType">${recipes.map((r) => `<option>${esc(r.name)}</option>`).join("")}` +
            `</select></div></div></div><div class="card calc-result"><div class="eyebrow">MATERIAIS NECESSÁRIOS</div>` +
            `<h3 id="arrowTitle">—</h3><p>Materiais para uma fabricação.</p><div class="ingredient-list" id="arrowIngredients">` +
            `</div></div></section>`
        );
    const c = CALCS.find((x) => x.id === id);
    if (!c) return "";
    return (
        `<section class="calculator" data-active-calc="${c.id}"><div class="card calc-form">` +
        `<h3>${c.title}</h3><p>${c.desc}</p><div class="fields"><div class="field"><label for="recipeProduct">Produto / receita</label>` +
        `<select id="recipeProduct" name="recipeProduct">${recipes.map((r) => `<option>${esc(r.name)}</option>`).join("")}` +
        `</select></div>${c.fields
            .map(
                ([name, label, value, choices]) =>
                    `<div class="field"><label for="f_${name}">${label}</label>${
                        choices
                            ? `<select id="f_${name}" name="${name}">${choices.map(([text, n]) => `<option value="${n}" ${n === value ? "selected" : ""}>${text} (+${n}%)</option>`).join("")}` +
                              `</select>`
                            : `<input id="f_${name}" name="${name}" type="number" step="any" value="${value}"${id === "runas" && name === "dificuldade" ? ' readonly title="Preenchido automaticamente pela receita escolhida"' : ""}>`
                    }` + `</div>`
            )
            .join("")}` +
        `</div>${id === "preparar" ? '<p class="table-search-note" data-difficulty-range hidden></p>' : ""}` +
        `</div><div class="card calc-result"><div class="eyebrow">RESULTADO EM TEMPO REAL</div>` +
        `<h3>Estimativa</h3><p>Atualizada automaticamente quando você altera um campo.</p>` +
        `<div class="result-value" id="calcValue">—</div><div class="result-caption" id="calcCaption">` +
        `</div>${calcExplanation(id)}<div class="chance-bar" id="chanceBar"><i></i></div>` +
        `<div id="selectedMaterials">${recipeIngredients(id, recipes[0]?.name)}</div></div>` +
        `</section>`
    );
}
function recipeIngredients(id, name) {
    const recipe = getRecipes(id).find((r) => r.name === name) || getRecipes(id)[0];
    if (!recipe) return "";
    const materials = recipe.materials
        .map(
            (m) =>
                `<div class="ingredient"><span class="item-label">${itemLink(m.name)}</span><b>${m.quantities.map(esc).join(" + ")}` +
                `</b></div>`
        )
        .join("");
    return (
        `<div class="ingredient-list"><div class="ingredient"><span class="item-label">Materiais para ${itemLink(recipe.name)}` +
        `</span><b>POR UNID.</b></div>${materials || '<span class="recipe-empty">Materiais não informados.</span>'}` +
        `</div>`
    );
}
function recipeCatalog(id) {
    const recipes = getRecipes(id);
    if (!recipes.length) return "";
    return (
        `<section class="recipe-catalog"><div class="section-heading"><div><h2>Lista completa de produtos e materiais</h2>` +
        `<p>${recipes.length} receitas · cada linha mostra apenas os materiais daquele produto.</p>` +
        `</div></div><div class="toolbar"><input id="recipeSearch" type="search" placeholder="Filtrar produto ` +
        `ou material…" aria-label="Filtrar receitas">` +
        `</div><div class="table-wrap"><table class="recipe-table"><thead><tr><th>Produto</th>` +
        `<th>Materiais por receita</th></tr></thead><tbody id="recipeRows">${recipes
            .map(
                (r) =>
                    `<tr data-recipe-row data-search="${esc([r.name, ...r.materials.map((m) => m.name)].join(" ").toLocaleLowerCase("pt-BR"))}">` +
                    `<td><div class="recipe-product"><a class="recipe-select item-label" href="${itemHref(r.name)}" target="_blank" ` +
                    `rel="noopener noreferrer" title="Abrir ${esc(r.name)} no Divine Pride">` +
                    `${itemIcon(r.name)}${esc(r.name)}</a></div></td><td><div class="recipe-materials">` +
                    `${
                        r.materials
                            .map(
                                (m) =>
                                    `<div class="recipe-material"><span class="item-label">${itemLink(m.name)}</span>` +
                                    `<b>${m.quantities.map(esc).join(" + ")}</b></div>`
                            )
                            .join("") || '<span class="recipe-empty">Materiais não informados na planilha.</span>'
                    }` +
                    `</div></td></tr>`
            )
            .join("")}` +
        `</tbody></table></div></section>`
    );
}
function updateArrowCalc() {
    const name = $("#arrowType")?.value,
        recipe = getRecipes("flechas").find((r) => r.name === name);
    if (!recipe) return;
    $("#arrowTitle").textContent = name;
    $("#arrowIngredients").innerHTML = recipe.materials
        .map(
            (m) =>
                `<div class="ingredient"><span class="item-label">${itemLink(m.name)}</span><b>${m.quantities.map((q) => fmt(Number(q) || 0)).join(" + ")}` +
                `</b></div>`
        )
        .join("");
}
function syncRecipeChoice() {
    const section = $("[data-active-calc]");
    if (!section) return;
    const id = section.dataset.activeCalc,
        name = section.querySelector('[name="recipeProduct"]')?.value;
    if (name) {
        $("#selectedMaterials").innerHTML = recipeIngredients(id, name);
        const K = COL[id] ?? {},
            recipe = getRecipes(id).find((r) => r.name === name);
        if (K.fator != null && recipe?.raw?.[K.fator]) {
            const factor = section.querySelector('[name="taxa"]');
            if (factor) factor.value = Number(recipe.raw[K.fator]) || factor.value;
        }
        if (K.dificuldade != null && recipe?.raw?.[K.dificuldade]) {
            const field = section.querySelector('[name="dificuldade"]'),
                text = recipe.raw[K.dificuldade];
            if (field) {
                const nums = [...text.matchAll(/[+−-]?\d+(?:[,.]\d+)?/g)].map((x) =>
                    Number(x[0].replace("−", "-").replace(",", "."))
                );
                if (nums.length) field.value = nums[0];
                else if (text.toLowerCase().includes("não indicada")) field.value = 0;
                const note = section.querySelector("[data-difficulty-range]");
                if (note) {
                    note.textContent =
                        nums.length > 1
                            ? `Esta receita tem dificuldade variável: ${text}. A calculadora usa o menor valor (${fmt(nums[0])}%).`
                            : text.toLowerCase().includes("não indicada")
                              ? "A página não informa dificuldade para esta receita."
                              : `Dificuldade desta receita: ${text}.`;
                    note.hidden = false;
                }
            }
        }
    }
}
function updateCalc() {
    const section = $("[data-active-calc]");
    if (!section) return;
    if (EXTRA_UPDATE[section.dataset.activeCalc]) {
        EXTRA_UPDATE[section.dataset.activeCalc](section);
        return;
    }
    if (section.dataset.activeCalc === "flechas") {
        updateArrowCalc();
        return;
    }
    const c = CALCS.find((x) => x.id === section.dataset.activeCalc);
    const values = {};
    c.fields.forEach(([k]) => (values[k] = Number(section.querySelector(`[name="${k}"]`).value) || 0));
    const result = c.calc(values);
    const shown =
        result.unit === "%"
            ? `${fmt(Math.max(0, Math.min(100, result.value)))}%`
            : `${fmt(result.value)} ${result.unit}`;
    $("#calcValue").textContent = shown;
    $("#calcCaption").textContent = result.caption;
    const bar = $("#chanceBar");
    bar.style.display = result.unit === "%" ? "block" : "none";
    bar.querySelector("i").style.width = `${Math.max(0, Math.min(100, result.value))}%`;
}
function sourceView() {
    const categories = [...new Set(BROWIKI.map(([categoria]) => categoria))].sort(
        (a, b) => episodeRank(b) - episodeRank(a) || a.localeCompare(b, "pt-BR")
    );
    return (
        `<div class="page-head"><div><div class="eyebrow">CONSULTA E RASTREABILIDADE</div>` +
        `<h1 class="page-title">Fontes & referências</h1><p class="page-subtitle">Páginas consultadas como apoio ` +
        `e referências indicadas para expandir a base.</p>` +
        `</div><span class="count-pill">${BROWIKI.length + HAZY_EP.length + IROWIKI.length + 4} LINKS</span>` +
        `</div>${avisoSeFalha("referencias")}<div class="panel-note">Os dados estruturados ficam em arquivos ` +
        `JSON na pasta <code>data/</code>, reunindo informações da bROWiki e da API do Divine Pride, com apoio ` +
        `do Hazy Forest e do iRO Wiki como fontes complementares. A permissão para redistribuir os dados e textos ` +
        `do Divine Pride foi confirmada pelo mantenedor. <br>` +
        `<b>Aviso:</b> os links de itens abrem no Divine Pride, que mostra o servidor escolhido no próprio site. ` +
        `Para ver os dados do LATAM, selecione LATAM no seletor de servidor do Divine Pride (a escolha fica salva).<br>` +
        `<i>Ragnarök Online © Gravity Co., Ltd. Projeto de fãs, sem afiliação com a Gravity Co., Ltd. ou com ` +
        `seus publicadores; todas as marcas pertencem aos respectivos detentores.</i>` +
        `</div><div class="section-heading"><div><h2>Bases de dados e licenças</h2></div>` +
        `</div><div class="source-grid"><article class="card source-card"><h3>API do Divine Pride</h3>` +
        `<a href="https://www.divine-pride.net/tools/api-doc" target="_blank" rel="noopener noreferrer">Documentação da API ↗</a>` +
        `<p>Fonte consultada para IDs, ícones e parte dos dados dos itens catalogados.</p>` +
        `</article><article class="card source-card"><h3>Termos de uso do Divine</h3><a href="https://divine.inc/terms" ` +
        `target="_blank" rel="noopener noreferrer">Ler os termos ↗</a>` +
        `<p>Dados, textos e ícones da API são conteúdo de terceiros, fora da licença do código do projeto.</p>` +
        `</article></div><div class="section-heading"><div><h2>Fontes de refino Automatron</h2>` +
        `<p>Referências do refinador +7 utilizado na seção de equipamentos.</p></div></div>` +
        `<div class="source-grid"><article class="card source-card"><h3>Refinador de Automatron</h3>` +
        `<a href="https://ragnaplace.com/pt/laro-pt/item/100252/refinador-de-automatron" target="_blank" rel="noopener ` +
        `noreferrer">RagnaPlace · registro LATAM ↗</a>` +
        `<p>Dados de refino e equipamentos compatíveis.</p></article><article class="card source-card">` +
        `<h3>Hazy Forest · Enchants: Glacier Weapons</h3><a href="https://hazyforest.com/enchants:glacier_weapons" ` +
        `target="_blank" rel="noopener noreferrer">Hazy Forest (wiki do kRO) ↗</a>` +
        `<p>Detalhamento dos encantos de habilidade de classe 3 das Armas Invernais (custos e drops não confirmados ` +
        `na bROWiki/iROWiki). Os rótulos entre parênteses, como <code>Cristal Invernal (Kagerou)</code>, seguem ` +
        `os nomes oficiais das pedras de encantamento no LATAM.</p>` +
        `</article></div>${categories
            .map(
                (cat) =>
                    `<div class="section-heading"><div><h2>${esc(cat)}</h2></div></div><div class="source-grid">` +
                    `${BROWIKI.filter(([categoria]) => categoria === cat)
                        .map(
                            ([, nome, url]) =>
                                `<article class="card source-card"><h3>${esc(nome)}</h3><a href="${esc(url)}" target="_blank" rel="noopener ` +
                                `noreferrer">Abrir página no bROWiki ↗</a>` +
                                `</article>`
                        )
                        .join("")}` +
                    `</div>`
            )
            .join("")}` +
        `<div class="section-heading"><div><h2>Hazy Forest (fonte complementar)</h2><p>Páginas dos episódios ` +
        `usadas nas missões diárias e nos consumos (wiki do kRO).</p>` +
        `</div></div><div class="source-grid">${HAZY_EP.map(
            ([, nome, url]) =>
                `<article class="card source-card"><h3>${esc(nome)}</h3><a href="${esc(url)}" target="_blank" rel="noopener ` +
                `noreferrer">Abrir página no Hazy Forest ↗</a>` +
                `</article>`
        ).join("")}` +
        `</div><div class="section-heading"><div><h2>iRO Wiki (fonte complementar)</h2><p>Conferência dos passos ` +
        `dos episódios 19, 18, 17.2 e 17.1 e das missões diárias.</p>` +
        `</div></div><div class="source-grid">${IROWIKI.map(
            ([, nome, url]) =>
                `<article class="card source-card"><h3>${esc(nome)}</h3><a href="${esc(url)}" target="_blank" rel="noopener ` +
                `noreferrer">Abrir página no iRO Wiki ↗</a>` +
                `</article>`
        ).join("")}` +
        `</div><div class="section-heading"><div><h2>Notas da base</h2><p>Os arquivos de dados em JSON podem ` +
        `ser editados para manter o conteúdo atualizado.</p>` +
        `</div></div><div class="card source-card"><p><b>Dados estruturados:</b> equipamentos, custos de encantamento, ` +
        `encantamentos disponíveis, fontes de obtenção e reformas de armas.</p>` +
        `<p><b>Receitas e calculadoras:</b> oito arquivos por habilidade na pasta <code>data/</code>. O site ` +
        `lê esses JSONs diretamente, sem etapa de build.</p>` +
        `<p><b>Mapas de IDs (referência de busca):</b> <code>tools/itens_hazy_kr.json</code> (drops do Hazy Forest: ` +
        `kRO → id/nome PT), <code>tools/skills_hazy_ids.json</code> (habilidades e pedras de encantamento do ` +
        `Hazy Forest: kRO → id/handle/PT) e <code>tools/skills_pt_ids.json</code> (nome PT → id) registram os ` +
        `IDs já consultados no Divine Pride para evitar buscas repetidas.</p>` +
        `<p><b>Licenças:</b> a página arquivada “bROWiki” declara CC BY 3.0 para contribuições; o código original ` +
        `está sob MIT; conteúdos de terceiros são regidos por seus respectivos direitos.</p>` +
        `</div>`
    );
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
function render() {
    const host = $("#content");
    try {
        if (currentView === "inicio") host.innerHTML = seguro(landing, "visão geral");
        else if (currentView === "guia") host.innerHTML = seguro(guideView, "guia de episódio");
        else if (currentView === "diarias") host.innerHTML = seguro(diariasView, "missões diárias");
        else if (TABLES[currentView]) host.innerHTML = seguro(() => tableView(currentView), currentView);
        else if (currentView === "reformas") host.innerHTML = seguro(reformView, "reforma");
        else if (currentView === "grau") host.innerHTML = seguro(upgradesView, "grau & refinamento");
        else if (currentView === "reciclagem") host.innerHTML = seguro(recycleView, "reciclagem");
        else if (currentView === "calculadoras") host.innerHTML = seguro(calcView, "calculadoras");
        else host.innerHTML = seguro(sourceView, "fontes");
        if (TABLES[currentView]) seguro(() => renderDataTable(currentView), `tabela ${currentView}`);
        if (currentView === "reformas") seguro(renderReformTable, "tabela reforma");
    } catch (err) {
        console.error("Erro ao renderizar:", err);
        host.innerHTML = caixaErroHtml("Erro inesperado ao montar a página.", err && err.message);
    }
    try {
        bindContent();
        if (currentView === "diarias") bindDiariasEstoque();
        if (currentView === "reciclagem") bindRecycle();
        if (currentView === "grau") bindUpgrades();
    } catch (err) {
        console.error("Erro ao ligar os eventos da página:", err);
    }
}
function bindContent() {
    $$(".nav-link").forEach((b) => (b.onclick = () => setView(b.dataset.view)));
    $$("[data-go]").forEach((b) => (b.onclick = () => setView(b.dataset.go)));
    $("#epSelect")?.addEventListener("change", (e) => {
        activeEpid = e.target.value;
        render();
    });
    /* Busca com debounce: o termo vive em globalTerm (fonte única). */
    const refiltrarTabela = debounce(
        () => (currentView === "reformas" ? renderReformTable() : renderDataTable(currentView)),
        150
    );
    $("#tableSearch")?.addEventListener("input", (e) => {
        globalTerm = e.target.value;
        refiltrarTabela();
    });
    $("#episodeFilter")?.addEventListener("change", () => renderDataTable(currentView));
    $("#clearFilters")?.addEventListener("click", () => {
        if ($("#tableSearch")) $("#tableSearch").value = "";
        if ($("#globalSearch")) $("#globalSearch").value = "";
        if ($("#episodeFilter")) $("#episodeFilter").value = "";
        globalTerm = "";
        renderDataTable(currentView);
    });
    $("#diaSelect")?.addEventListener("change", (e) => {
        activeDiaEp = e.target.value;
        render();
    });
    $("#diaBonus")?.addEventListener("change", (e) => {
        diaBonus = e.target.checked;
        render();
    });
    $$("[data-calc]").forEach(
        (b) =>
            (b.onclick = () => {
                $("#calcMount").innerHTML = calcPanel(b.dataset.calc);
                $$("[data-calc]").forEach((x) => x.classList.toggle("active", x === b));
                bindCalc();
                $("#calcMount").scrollIntoView({ behavior: "smooth", block: "nearest" });
            })
    );
    const filtrarReceitas = debounce((valor) => {
        const termo = valor.toLocaleLowerCase("pt-BR");
        $$("#recipeRows [data-recipe-row]").forEach((r) => (r.hidden = !r.dataset.search.includes(termo)));
    }, 150);
    $("#recipeSearch")?.addEventListener("input", (e) => filtrarReceitas(e.target.value));
    bindCalc();
}
function bindCalc() {
    const sec = $("[data-active-calc]");
    if (!sec) return;
    if (EXTRA_UPDATE[sec.dataset.activeCalc]) {
        sec.oninput = sec.onchange = updateCalc;
        updateCalc();
        return;
    }
    if (sec.dataset.activeCalc === "flechas") {
        const sel = $("#arrowType");
        sel.addEventListener("change", updateCalc);
        updateCalc();
        return;
    }
    const product = sec.querySelector('[name="recipeProduct"]');
    product?.addEventListener("change", () => {
        syncRecipeChoice();
        updateCalc();
    });
    sec.querySelectorAll("input").forEach((i) => i.addEventListener("input", updateCalc));
    sec.querySelectorAll("select").forEach((i) => i.addEventListener("change", updateCalc));
    syncRecipeChoice();
    updateCalc();
}
/* ===== Busca global, menu móvel e tema ===== */
function aplicarBuscaGlobal() {
    if (["equipamentos", "encantamentos", "custos"].includes(currentView)) {
        const i = $("#tableSearch");
        if (i) {
            i.value = globalTerm;
            renderDataTable(currentView);
        }
    } else if (currentView === "reformas") {
        const i = $("#tableSearch");
        if (i) {
            i.value = globalTerm;
            renderReformTable();
        }
    } else if (globalTerm.trim()) {
        if (currentView !== "equipamentos") setView("equipamentos");
        const i = $("#tableSearch");
        if (i) {
            i.value = globalTerm;
            renderDataTable("equipamentos");
        }
    }
}
const buscarComDebounce = debounce(aplicarBuscaGlobal, 150);
$("#globalSearch").addEventListener("input", (e) => {
    globalTerm = e.target.value;
    buscarComDebounce();
});
/* Gaveta do menu no celular: abre com o botão e fecha por scrim, clique externo ou Esc. */
function setMenu(abrir) {
    const gaveta = $(".sidebar"),
        scrim = $("#mobileScrim");
    const aberto = typeof abrir === "boolean" ? abrir : !gaveta.classList.contains("open");
    gaveta.classList.toggle("open", aberto);
    document.body.classList.toggle("menu-aberto", aberto);
    if (scrim) scrim.hidden = !aberto;
    $("#menuToggle")?.setAttribute("aria-expanded", aberto ? "true" : "false");
    $("#menuToggle")?.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
}
$("#menuToggle").addEventListener("click", () => setMenu());
$("#mobileScrim")?.addEventListener("click", () => setMenu(false));
document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
        e.preventDefault();
        $("#globalSearch").focus();
    }
    if (e.key === "Escape") setMenu(false);
});
/* Tema: aplica o atributo em <html> e <body> e atualiza a cor de título do navegador. */
function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
    const dark = theme === "dark";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#101923" : "#f4f6f7");
    $("#themeToggle").innerHTML = dark ? "☼ <span>Modo claro</span>" : "☾ <span>Modo escuro</span>";
    $("#themeToggle").setAttribute("aria-label", dark ? "Ativar modo claro" : "Ativar modo escuro");
    $("#themeToggle").title = dark ? "Ativar modo claro" : "Ativar modo escuro";
    try {
        localStorage.setItem("ro-atlas-theme", theme);
    } catch {}
}
$("#themeToggle").addEventListener("click", () => setTheme(document.body.dataset.theme === "dark" ? "light" : "dark"));
try {
    const savedTheme = localStorage.getItem("ro-atlas-theme");
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    else setTheme("light");
} catch {
    setTheme("light");
}
/* ===== v1.3: encantamento total, Grau do Ep. 19 e reciclagem ===== */
/* EP19_IDS, GRAU19 e RECYCLE19 são conteúdo do site, carregados de
   data/referencias.json em loadData (edite lá, não aqui). */
let GRAU19 = { steps: [], mats: [] },
    RECYCLE19 = [];
const EXTRA_CALCS = [
    {
        id: "encanto",
        kind: "Materiais totais",
        title: "Custo total de encantamento",
        desc:
            "Soma os materiais dos efeitos escolhidos em cada slot. Os aleatórios do Ep. 19 ficam de fora; nos demais " +
            "episódios o custo de cada sorteio é somado.",
    },
];
const EXTRA_PANELS = { encanto: enchantPanel },
    EXTRA_UPDATE = { encanto: updateEnchantCalc };
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
function enchIsRandom(g) {
    const K = COL.custo;
    return (
        /aleat/i.test(g.map((x) => x.join(" ")).join(" ")) ||
        g.every((x) => /^P[eé]tala de Flor Invernal$/i.test(x[K.material] || ""))
    );
}
const slotPos = (s) => {
    const a = [...String(s || "").matchAll(/\{(\d)\}/g)].map((m) => +m[1]);
    if (a.length) return a;
    const m = String(s || "").match(/slot\s*(\d)/i);
    return m ? [+m[1]] : [];
};
/* Mapa de encantamentos: cache guardado; só reconstrói se db.custo mudar de referência. */
let enchCache = null,
    enchCacheRef = null;
function enchIndex() {
    const K = COL.custo;
    if (enchCache && enchCacheRef === db.custo) return enchCache;
    const idx = new Map();
    groupBy(
        (db.custo || []).slice(1).filter((r) => r[K.ep] && r[K.alvo] && r[K.material]),
        (r) => [r[K.ep], r[K.alvo], r[K.slot], r[K.efeito]].join("\x00")
    ).forEach((g) => {
        const r = g[0];
        if (/reset/i.test(r[K.efeito] || "") || (/\b19\b/.test(r[K.ep]) && enchIsRandom(g))) return;
        if (!idx.has(r[K.ep])) idx.set(r[K.ep], new Map());
        const E = idx.get(r[K.ep]);
        if (!E.has(r[K.alvo])) E.set(r[K.alvo], []);
        E.get(r[K.alvo]).push({
            slot: r[K.slot] || "",
            pos: slotPos(r[K.slot]),
            effect: r[K.efeito] || "—",
            mats: [...new Map(g.map((x) => [[x[K.material], x[K.qtd]].join("\x00"), x])).values()].map((x) => ({
                name: x[K.material],
                qty: x[K.qtd],
            })),
        });
    });
    enchCacheRef = db.custo;
    enchCache = idx;
    return idx;
}
/* ===== Armazenamento local (localStorage seguro) ===== */
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
/* Painel do farm diário: episódio + dias -> ganho estimado por item. */
function enchantPanel() {
    const eps = [...enchIndex().keys()].sort((a, b) => episodeRank(b) - episodeRank(a)),
        lv = (n) => (n ? `Nv. ${n}` : "Sem grau (aplicar Nv. 1)");
    return (
        `<section class="calculator" data-active-calc="encanto"><div class="card calc-form">` +
        `<h3>Custo total de encantamento</h3><p>Escolha o episódio, o equipamento e o efeito de cada encantamento ` +
        `(posições 1, 2, 3…). Aleatórios do Ep. 19 ficam de fora; nos demais episódios o custo de cada sorteio ` +
        `é somado. No Ep. 19 dá para incluir os materiais do upgrade de grau da Arma Vil Invernal.</p>` +
        `<div class="fields"><div class="field"><label for="ecEp">Episódio</label><select id="ecEp">` +
        `${eps.map((e) => `<option>${esc(e)}</option>`).join("")}</select></div><div class="field">` +
        `<label for="ecTarget">Equipamento-alvo</label><select id="ecTarget"></select></div>` +
        `</div><div class="fields" data-grau hidden style="margin-top:11px"><div class="field">` +
        `<label for="ecGrauDe">Grau da Arma Vil Invernal — de</label><select id="ecGrauDe">` +
        `${[0, 1, 2, 3, 4].map((n) => `<option value="${n}">${lv(n)}</option>`).join("")}` +
        `</select></div><div class="field"><label for="ecGrauAte">até</label><select id="ecGrauAte">` +
        `${[1, 2, 3, 4, 5].map((n) => `<option value="${n}"${n === 5 ? " selected" : ""}>Nv. ${n}</option>`).join("")}` +
        `</select></div><p class="table-search-note">Materiais do upgrade de grau da Arma Vil Invernal (encantamento {2}).</p>` +
        `</div><div class="fields" id="ecSlots" style="margin-top:11px"></div><p class="table-search-note" id="ecHint" ` +
        `style="margin-top:10px">` +
        `</p></div><div class="card calc-result"><div class="eyebrow">CUSTO TOTAL</div><h3 id="ecTitle">—</h3>` +
        `<p id="ecNote"></p><div class="ingredient-list" id="ecTotals"></div></div></section>`
    );
}
function updateEnchantCalc(sec) {
    const idx = enchIndex(),
        ep = sec.querySelector("#ecEp"),
        tg = sec.querySelector("#ecTarget"),
        box = sec.querySelector("#ecSlots"),
        hint = sec.querySelector("#ecHint"),
        is19 = /Ep\.\s*19\b/.test(ep.value);
    if (tg.dataset.ep !== ep.value) {
        tg.dataset.ep = ep.value;
        tg.innerHTML = [...(idx.get(ep.value)?.keys() || [])].map((t) => `<option>${esc(t)}</option>`).join("");
    }
    sec.querySelectorAll("[data-grau]").forEach((el) => (el.hidden = !(is19 && /Vil Invern/i.test(tg.value))));
    const E = idx.get(ep.value)?.get(tg.value) || [],
        fixed = E.filter((e) => e.pos.length),
        any = E.filter((e) => !e.pos.length),
        key = ep.value + "\x00" + tg.value;
    if (box.dataset.key !== key) {
        box.dataset.key = key;
        const positions = [...new Set(fixed.flatMap((e) => e.pos))].sort((a, b) => a - b),
            opt = (e) => `<option value="${E.indexOf(e)}">${esc(e.effect)}</option>`;
        let h = positions
            .map((p) => {
                const list = fixed.filter((e) => e.pos.includes(p)).sort((x, y) => x.pos.length - y.pos.length);
                return (
                    `<div class="field"><label for="ecPos${p}">Encantamento ${p}</label><select id="ecPos${p}" data-pos="${p}">` +
                    `${list.map(opt).join("")}<option value="-1">— nenhum —</option></select></div>`
                );
            })
            .join("");
        if (any.length) {
            const n = Number((any[0].slot.match(/até\s*(\d+)/i) || [])[1]) || 1;
            h +=
                `<div class="field"><label for="ecAny">Efeito do encantamento</label><select id="ecAny" data-any>` +
                `${any.map(opt).join("")}<option value="-1">— nenhum —</option></select></div><div class="field">` +
                `<label for="ecAnyN">Quantidade de encantos</label><select id="ecAnyN">${Array.from({ length: n }, (_, k) => `<option>${k + 1}</option>`).join("")}` +
                `</select></div>`;
        }
        box.innerHTML = h || '<p class="muted">Sem dados para este equipamento.</p>';
        const multi = [...new Set(fixed.filter((e) => e.pos.length > 1).map((e) => e.effect))].map((f) => {
            const ps = fixed.find((e) => e.effect === f && e.pos.length > 1).pos;
            return `“${f}” pode ser usado nos encantamentos ${ps.length > 1 ? `${ps.slice(0, -1).join(", ")} ou ${ps[ps.length - 1]}` : ps[0]}`;
        });
        hint.textContent = multi.length ? multi.join(". ") + "." : "";
    }
    const totals = new Map(),
        extras = [],
        picked = [];
    const add = (e, n, label) => {
        picked.push(`${label}: ${e.effect}${n > 1 ? ` ×${n}` : ""}`);
        e.mats.forEach((m) => {
            const q = numQty(m.qty);
            if (m.name && !Number.isNaN(q) && !/variados|a confirmar|varia por habilidade/i.test(m.name))
                totals.set(m.name, (totals.get(m.name) || 0) + q * n);
            else if (m.name || m.qty) extras.push(`${m.qty || ""} ${m.name || ""}`.trim() + ` (${label})`);
        });
    };
    box.querySelectorAll("[data-pos]").forEach((s) => {
        const e = E[Number(s.value)];
        if (e) add(e, 1, `Encantamento ${s.dataset.pos}`);
    });
    const sa = box.querySelector("[data-any]");
    if (sa) {
        const e = E[Number(sa.value)];
        if (e) add(e, Number(box.querySelector("#ecAnyN").value) || 1, "Encantamentos");
    }
    let grauNota = "";
    if (is19 && /Vil Invern/i.test(tg.value)) {
        const gf = Number(sec.querySelector("#ecGrauDe").value),
            gt = Number(sec.querySelector("#ecGrauAte").value);
        if (gt > gf) {
            GRAU19.mats.forEach(([nm, c]) => {
                const q = c.slice(gf, gt).reduce((a, b) => a + b, 0);
                if (q > 0) totals.set(nm, (totals.get(nm) || 0) + q);
            });
            grauNota = ` · Inclui o upgrade de grau da Arma Vil Invernal (${gf ? `Nv. ${gf}` : "sem grau"} → Nv. ${gt}).`;
        }
    }
    $("#ecTitle").textContent = picked.length || grauNota ? "Custo de 1 equipamento" : "Escolha ao menos um efeito";
    $("#ecNote").textContent =
        (picked.join(" · ") || "Nenhum efeito escolhido.") +
        grauNota +
        (picked.some((p) => p.includes("*"))
            ? " · * Valores confirmados somente no Hazy Forest (kRO); não constam na bROWiki ou iROWiki."
            : "");
    $("#ecTotals").innerHTML = totalList(totals, extras);
}
function recycleView() {
    if (!RECYCLE19.length)
        return caixaErroHtml("Reciclagem do Ep. 19 indisponível", "Falha ao carregar data/referencias.json");
    const body = RECYCLE19.map(([group, items]) =>
        items
            .map(
                ([nome, min, max], i) =>
                    `<tr>${
                        i === 0
                            ? `<td rowspan="${items.length}"><b>3 × Armas Vil Invernais [1]</b><span class="table-meta">escolhidas por você</span>` +
                              `<span class="table-meta">${esc(group)}</span></td>`
                            : ""
                    }` +
                    `<td><span class="item-label">${itemLink(nome)}</span></td><td>${min === max ? min : `${min} ~ ${max}`}` +
                    `</td></tr>`
            )
            .join("")
    ).join("");
    return (
        `<div class="page-head"><div><div class="eyebrow">ISSGARD · EPISÓDIO 19</div><h1 class="page-title">Reciclagem de itens</h1>` +
        `<p class="page-subtitle">O que o Incinerador devolve ao reciclar armas Vil Invernais.</p>` +
        `</div><span class="count-pill">${RECYCLE19.length} GRUPOS</span></div><div class="panel-note">` +
        `<b>Como funciona:</b> fale com o Incinerador, junto ao quartel ${naviBtn("/navi icecastle 186/221")}. ` +
        `Cada reciclagem consome 3 Armas Vil Invernais e entrega materiais de encantamento em quantidades variáveis.</div>` +
        `<div class="section-heading"><div><h2>Resultados possíveis</h2><p>Faixas “mín ~ máx” indicam quantidade ` +
        `sorteada. A página de origem lista quatro grupos de resultado; confirme lá se são opções do menu ou ` +
        `resultados simultâneos.</p>` +
        `</div></div>${tableFrame(["Entrada", "Resultado", "Quantidade por reciclagem"], body, "grouped-table align-top")}` +
        `<div class="section-heading"><div><h2>Estimativa por quantidade</h2><p>Quantas reciclagens você consegue ` +
        `fazer e quanto pode receber de um grupo.</p>` +
        `</div></div><div class="calculator"><div class="card calc-form"><div class="fields">` +
        `<div class="field"><label>Armas Vil Invernais</label><div class="rc-stepper"><button type="button" class="button" ` +
        `data-rc="sub" aria-label="Remover 3">− 3</button>` +
        `<b id="rcQty">3</b><button type="button" class="button" data-rc="add" aria-label="Adicionar 3">+ 3</button>` +
        `</div></div><div class="field"><label for="rcGroup">Grupo de resultado</label><select id="rcGroup">` +
        `${RECYCLE19.map((g, i) => `<option value="${i}">${esc(g[0])}</option>`).join("")}` +
        `</select></div><div class="field"><label for="rcDay">Armas por dia</label><input id="rcDay" type="number" ` +
        `min="0" step="3" value="${stNum(stLoad("ro-atlas-armas-dia", 0))}">` +
        `</div></div><p class="table-search-note" id="rcDayNote"></p></div><div class="card calc-result">` +
        `<div class="eyebrow">ESTIMATIVA</div><h3 id="rcTitle">—</h3><div class="ingredient-list" id="rcTotals">` +
        `</div></div></div>`
    );
}
function bindRecycle() {
    let n = 3;
    const g = () => RECYCLE19[+$("#rcGroup").value],
        dayIn = $("#rcDay"),
        dayNote = () => {
            const d = Math.max(0, Number(dayIn.value) || 0),
                c = Math.floor(d / 3);
            $("#rcDayNote").textContent =
                d > 0
                    ? `${fmt(c)} reciclagens por dia (${fmt(d)} armas ÷ 3).`
                    : "Informe quantas armas você consegue farmar por dia para estimar as reciclagens diárias.";
        },
        run = () => {
            const cycles = n / 3;
            $("#rcQty").textContent = fmt(n);
            $("#rcTitle").textContent = `${fmt(cycles)} reciclage${cycles === 1 ? "m" : "ns"}`;
            $("#rcTotals").innerHTML = g()[1]
                .map(
                    ([nome, min, max]) =>
                        `<div class="ingredient"><span class="item-label">${itemLink(nome)}</span><b>${fmt(min * cycles)}${min === max ? "" : ` ~ ${fmt(max * cycles)}`}` +
                        `</b></div>`
                )
                .join("");
        };
    $$("[data-rc]").forEach(
        (b) =>
            (b.onclick = () => {
                n = Math.max(3, n + (b.dataset.rc === "add" ? 3 : -3));
                run();
            })
    );
    $("#rcGroup").onchange = run;
    dayIn.oninput = () => {
        stSave("ro-atlas-armas-dia", Math.max(0, Number(dayIn.value) || 0));
        dayNote();
    };
    run();
    dayNote();
}
/* ===== v1.4: links das atividades e Grau & Refinamento (páginas completas da bROWiki) ===== */
/* Links das atividades (nome -> página da bROWiki), de data/referencias.json. */
let ACTIVITY_LINKS = {};
function activityLink(name) {
    const key = String(name || "")
            .split(" – ")[0]
            .replace(/\s*\(.*\)\s*$/, "")
            .trim(),
        u = ACTIVITY_LINKS[key];
    return u
        ? `<a class="table-link" href="${u}" target="_blank" rel="noopener noreferrer" title="Abrir a página na bROWiki">` +
              `${esc(name)}</a>`
        : esc(name);
}
let upMode = "normal",
    upTable = "refino",
    upSpecial = false;
const tbl = (thead, body, cls = "") =>
    `<div class="table-wrap"><table class="data-table ${cls}"><thead>${thead}</thead>` +
    `<tbody>${body}</tbody></table></div>`;
const ths = (a) => `<tr>${a.map((x) => `<th>${x}</th>`).join("")}</tr>`;
const trs = (rows) => rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
const ul = (a) => `<ul>${a.map((x) => `<li>${x}</li>`).join("")}</ul>`;
const secH = (h, p = "") => `<div class="section-heading"><div><h2>${h}</h2>${p ? `<p>${p}</p>` : ""}</div></div>`;
const cst = (z, list = []) => [z, ...list.map(([q, n]) => `${q} ${itemLink(n)}`)].filter(Boolean).join(" + ");
const rb = (a, b, v) => {
    const r = [];
    for (let n = a; n <= b; n++) r.push([`+${n}`, ...v.split(",").map((x) => (x === "-" ? "-" : x + "%"))]);
    return r;
};
/* Tabelas de chance de refino/grau: compactas em data/referencias.json,
   expandidos com rb() em loadData (cada linha: ["+n", "x%", ...]). */
let REF_CH = { comuns: [], comunsEv: [], especiais: [], especiaisEv: [] },
    GRAU_CH = { normal: [], evento: [] };
const refChanceTable = (k) =>
    tbl(
        `<tr><th rowspan="2">Refino</th><th colspan="5">Arma</th><th colspan="3">Armadura</th>` +
            `</tr><tr><th>Nível 1</th><th>Nível 2</th><th>Nível 3</th><th>Nível 4</th><th>Nível 5</th>` +
            `<th>Nível 1</th><th>Nível 2</th><th>Sombrio</th></tr>`,
        trs(REF_CH[k])
    );
const grauChanceTable = (m) => tbl(ths(["Refino", "x → D", "D → C", "C → B", "B → A"]), trs(GRAU_CH[m]));
const mine = (rows) =>
    tbl(
        ths(["Minério", "Nv.", "Refina entre", "Penalidade da falha", "Obtenção via NPC"]),
        trs(rows.map(([n, nv, f, p, c]) => [`<span class="item-label">${itemLink(n)}</span>`, nv, f, p, c]))
    );
function refinoPage() {
    return (
        `<div class="panel-note">Refinar significa adicionar mais poder em armas e equipamentos. Itens refinados ` +
        `mostram quantas vezes foram refinados: <code>Espada</code> (sem refino) e <code>+2 Espada</code> (refinado ` +
        `2 vezes).</div>
${secH("Como refinar")}` +
        `<div class="card" style="padding:16px 20px"><ol><li>Vá para uma Refinaria e fale com o NPC.</li>` +
        `<li>A interface de refino será aberta: arraste o item até a janela e selecione os materiais.</li>` +
        `</ol><b>Preste atenção!</b>${ul([
            "Existem chances de falha e de perda total do item.",
            "Existe um limite de segurança em que o item pode ser refinado com 100% de sucesso: armas nível 1: +7; " +
                "armas nível 2: +6; armas nível 3: +5; armas nível 4 e armaduras nível 1: +4; armas nível 5 e armaduras " +
                "nível 2: +3.",
            "Itens indicados como “Indestrutíveis em Batalha” ainda serão destruídos em refinamentos.",
            "<b>Equipamentos Sombrios:</b> o limite máximo de refino é +10 (não vão até o +20 como os equipamentos " +
                "comuns); as Manoplas Sombrias têm os mesmos requisitos das armas nível 4; o restante tem nível 1; os " +
                "acessórios sombrios (Brinco e Colar) podem ser refinados; a Bênção do Ferreiro e os Pergaminhos de Refino " +
                "não funcionam.",
        ])}` +
        `</div>
${secH(
    "Bônus por refino",
    "Cada refino dá um bônus acumulativo; ao passar do limite de segurança (Over), o bônus aumenta bastante. " +
        "Refinado a partir do +15, o item ganha o bônus adicional, que aumenta ATQ e ATQM a cada refino acima " +
        "do +16. Armas de ataque à distância não recebem bônus de ATQM nem o bônus de Over das outras armas. " +
        "Equipamentos Sombrios não recebem estes bônus."
)}
${tbl(
    ths([
        "Arma",
        "ATQ/ATQM por refino",
        "Bônus de Over",
        "Bônus adicional",
        "Bônus adic. por refino",
        "P.ATQ/S.ATQM por refino",
    ]),
    trs([
        ["Nv.1", "2", "1 ~ 3", "16", "1", "-"],
        ["Nv.2", "3", "1 ~ 5", "32", "2", "-"],
        ["Nv.3", "5", "1 ~ 8", "32", "2", "-"],
        ["Nv.4", "7", "1 ~ 14", "48", "3", "-"],
        ["Nv.5 sem Grau", "8", "-", "-", "-", "2"],
        ["Nv.5 e Grau D", "8,8", "-", "-", "-", "2"],
        ["Nv.5 e Grau C", "10,4", "-", "-", "-", "2"],
        ["Nv.5 e Grau B", "12", "-", "-", "-", "2"],
        ["Nv.5 e Grau A", "16", "-", "-", "-", "2"],
    ])
)}
<div ` +
        `style="height:12px">` +
        `</div>${tbl(
            `<tr><th rowspan="2">Armadura</th><th colspan="4">DEF/DEFM por refino</th><th rowspan="2">TEN/TENM por refino</th>` +
                `</tr><tr><th>+1 ~ +4</th><th>+5 ~ +8</th><th>+9 ~ +12</th><th>+13 ~ +20</th></tr>`,
            `<tr><td>Nv.1</td><td>1</td><td>2</td><td>3</td><td>4 ~ 5</td><td>-</td></tr><tr>` +
                `<td>Nv.2</td><td colspan="4">20% da DEF dada pelo refino da armadura</td><td>2</td>` +
                `</tr>`
        )}
${secH(
    "Minérios",
    "Refinar custa dinheiro e exige o minério correto para o nível do item. Os minérios são obtidos nos NPCs " +
        "das refinarias, por zeny ou trocando por itens."
)}
<h3 ` +
        `class="table-group-title">Minérios comuns para armas</h3>` +
        `${mine([
            ["Fracon", "1", "0 ao +9", "Perde a arma", "200z"],
            ["Emveretarcon", "2", "0 ao +9", "Perde a arma", "1.000z"],
            ["Oridecon", "3 ~ 4", "0 ao +9", "Perde a arma", cst("", [[5, "Minério de Oridecon"]])],
            [
                "Bradium",
                "1 ~ 4",
                "+10 ao +19",
                "Perde 3 refinos ou 20% de perda do item",
                cst("50.000z", [[3, "Oridecon"]]),
            ],
            [
                "Eteridecon",
                "5",
                "0 ao +9",
                "Perde 3 refinos",
                cst("10.000z", [
                    [1, "Oridecon"],
                    [1, "Pó de Éter"],
                ]),
            ],
            [
                "Bradium de Éter",
                "5",
                "+10 ao +19",
                "Perde a arma",
                cst("30.000z", [
                    [1, "Bradium"],
                    [3, "Pó de Éter"],
                ]),
            ],
        ])}
<h3 ` +
        `class="table-group-title" style="margin-top:16px">Minérios especiais para armas</h3>` +
        `${mine([
            ["Oridecon Enriquecido", "3 ~ 4", "0 ao +9", "Perde a arma", "JoyCoins"],
            ["Oridecon Perfeito", "3 ~ 4", "+7 ao +9", "Perde 1 refino", "JoyCoins"],
            ["Bradium Perfeito", "1 ~ 4", "+10 ao +19", "Perde 1 refino", "JoyCoins"],
            [
                "Eteridecon Enriquecido",
                "5",
                "0 ao +9",
                "Perde 1 refino",
                cst("20.000z", [
                    [1, "Oridecon Enriquecido"],
                    [2, "Pó de Éter"],
                ]),
            ],
            [
                "Eteridecon Perfeito",
                "5",
                "+10 ao +14",
                "Perde a arma",
                cst("50.000z", [
                    [1, "Oridecon Perfeito"],
                    [3, "Pó de Éter"],
                ]),
            ],
            [
                "Bradium de Éter Perfeito",
                "5",
                "+15 ao +19",
                "Perde a arma",
                cst("50.000z", [
                    [1, "Bradium Perfeito"],
                    [3, "Pó de Éter"],
                ]),
            ],
        ])}
<h3 ` +
        `class="table-group-title" style="margin-top:16px">Minérios comuns para armaduras</h3>` +
        `${mine([
            ["Elunium", "Nv.1", "0 ao +9", "Perde a armadura", cst("", [[5, "Minério de Elunium"]])],
            [
                "Carnium",
                "Nv.1",
                "+10 ao +19",
                "Perde 3 refinos ou 20% de perda do item",
                cst("50.000z", [[3, "Elunium"]]),
            ],
            [
                "Eterium",
                "Nv.2",
                "0 ao +9",
                "Perde 3 refinos",
                cst("10.000z", [
                    [1, "Elunium"],
                    [1, "Pó de Éter"],
                ]),
            ],
            [
                "Carnium de Éter",
                "Nv.2",
                "+10 ao +19",
                "Perde a armadura",
                cst("50.000z", [
                    [1, "Carnium"],
                    [3, "Pó de Éter"],
                ]),
            ],
        ])}
<h3 ` +
        `class="table-group-title" style="margin-top:16px">Minérios especiais para armaduras</h3>` +
        `${mine([
            ["Elunium Enriquecido", "Nv.1", "0 ao +9", "Perde a armadura", "JoyCoins"],
            ["Elunium Perfeito", "Nv.1", "+7 ao +9", "Perde 1 refino", "JoyCoins"],
            ["Carnium Perfeito", "Nv.1", "+10 ao +19", "Perde 1 refino", "JoyCoins"],
            [
                "Eterium Enriquecido",
                "Nv.2",
                "0 ao +9",
                "Perde 1 refino",
                cst("20.000z", [
                    [1, "Elunium Enriquecido"],
                    [2, "Pó de Éter"],
                ]),
            ],
            [
                "Eterium Perfeito",
                "Nv.2",
                "+10 ao +14",
                "Perde a armadura",
                cst("50.000z", [
                    [1, "Elunium Perfeito"],
                    [3, "Pó de Éter"],
                ]),
            ],
            [
                "Carnium de Éter Perfeito",
                "Nv.2",
                "+15 ao +19",
                "Perde a armadura",
                cst("50.000z", [
                    [1, "Carnium Perfeito"],
                    [3, "Pó de Éter"],
                ]),
            ],
        ])}
${secH("Outros métodos", "Na maioria dos casos, são itens especiais.")}
${tbl(
    ths(["Item", "Efeito"]),
    trs([
        [
            `<span class="item-label">${itemLink("Bênção do Ferreiro")}</span>`,
            "Armas e equipamentos não são perdidos nem têm o refino rebaixado em caso de falha.<br>Só pode ser usada " +
                "junto com outro minério e não funciona com Equipamentos Sombrios.<br>Funciona somente nos refinos +7 " +
                "ao +13: +7 → +8: 1 un.; +8 → +9: 2 un.; +9 → +10: 4 un.; +10 → +11: 7 un.; +11 → +12: 11 un.; +12 → " +
                "+13: 16 un.; +13 → +14: 22 un.; +6 e anteriores, e +14 em diante: não funciona.",
        ],
        [
            `<span class="item-label">${itemLink("Pergaminho de Refino")}</span>`,
            "Leva a arma ou o equipamento direto para o refino indicado no pergaminho, sem acumular com refinos já " +
                "existentes.<br>Não pode ser negociado (vai em envelope no shopping) e não funciona em armas nível 5 " +
                "nem em equipamentos nível 2.<br>Deve ser levado ao Mestre do Refino (prontera 184/177).",
        ],
        [
            `<span class="item-label">${itemLink("Cubos de Refino")}</span>`,
            "Levam a arma ou o equipamento direto para o refino indicado pelo cubo, sem acumular com refinos já existentes. " +
                "Funcionam pelo sistema de Combinação.",
        ],
        [
            `<span class="item-label">${itemLink("Martelos de Refino")}</span>`,
            "Funcionam em Equipamentos Sombrios e levam direto ao refino indicado ou a um aleatório, sem acumular " +
                "com refinos já existentes. Funcionam pelo sistema de Combinação.",
        ],
        [
            "Manufatura",
            `Os minérios de manufatura são refinados em qualquer NPC das refinarias: ${cst("", [[20, "Minério de Zelunium"]])} ` +
                `→ ${itemLink("Zelunium")}; ${cst("", [[20, "Minério de Sombridecon"]])} → ${itemLink("Sombridecon")}. ` +
                `Refinador de Prontera (prt_in 62/57).`,
        ],
    ])
)}`
    );
}
function grauPage() {
    if (!GRAU_CH.normal.length)
        return caixaErroHtml("Tabela de grau indisponível", "Falha ao carregar data/referencias.json");

    return (
        `<div class="panel-note">Grau é um sistema de aprimoramento que concede bônus especiais e altera a estética ` +
        `dos equipamentos. Só armaduras nível 2 e armas nível 5 são afetadas.</div>
${secH(
    "Bônus por grau",
    "Cada Grau adiciona um bônus percentual a cada refino de uma arma nível 5. (O texto da bROWiki diz “nível " +
        "2”, mas os valores são os das armas nível 5 da página Refinamento.) A letra do Grau aparece na frente " +
        "do nome do item, como em [B] Adaga."
)}
${tbl(
    ths(["Arma", "ATQ & ATQM por refino", "Bônus", "Prefixo"]),
    trs([
        ["Sem Grau", "+8,00", "0% de aumento", "—"],
        ["Grau D", "+8,80", "10% de aumento", "[D]"],
        ["Grau C", "+10,4", "30% de aumento", "[C]"],
        ["Grau B", "+12,0", "50% de aumento", "[B]"],
        ["Grau A", "+16,0", "100% de aumento", "[A]"],
    ])
)}
${secH("Como funciona")}` +
        `<div class="card" style="padding:16px 20px"><ol><li>Vá para uma refinaria e fale com o NPC com indicação de Grau.</li>` +
        `<li>A interface de Grau será aberta: arraste o item até a janela e selecione os materiais.</li>` +
        `</ol><b>Preste atenção!</b>${ul([
            "Para subir de grau, o item precisa de um refino mínimo. Quando o Grau sobe, <b>o refino volta para +0</b>.",
            "<b>Processos:</b> em caso de sucesso, encantamentos, cartas e bônus aleatórios são preservados; em caso " +
                "de falha em processo seguro, também são preservados; em caso de falha fora do processo seguro, o equipamento " +
                "é perdido.",
            "<b>Materiais:</b> no processo seguro, use 5 minérios em vez de 1; ele garante que o item não seja perdido em caso de falha.",
            "<b>Bênção de Éter:</b> é opcional; cada adição aumenta as chances de sucesso, até 10% no máximo; o número " +
                "de Bênçãos necessárias para subir 1% varia com o grau.",
        ])}` +
        `</div>
${secH("Informações", "Atualmente, para subir de grau, o item deve estar no +11 no mínimo.")}
${tbl(
    ths([
        "Etapa",
        "Refino mínimo",
        "Materiais",
        "Zeny",
        "Penalidade da falha",
        "Chance de sucesso (fora do evento)",
        "Bênção de Éter",
    ]),
    trs([
        [
            "Sem Grau → Grau D",
            "+11",
            cst("", [[1, "Aquamarina de Éter"]]),
            "100.000z",
            "Perde tudo",
            "70%",
            "+1% a cada 1 Bênção",
        ],
        ["", "", cst("", [[5, "Aquamarina de Éter"]]), "500.000z", "Seguro", "—", "—"],
        [
            "Grau D → Grau C",
            "+11",
            cst("", [[1, "Topázio de Éter"]]),
            "125.000z",
            "Perde tudo",
            "60%",
            "+1% a cada 3 Bênçãos",
        ],
        ["", "", cst("", [[5, "Topázio de Éter"]]), "625.000z", "Seguro", "—", "—"],
        [
            "Grau C → Grau B",
            "+11",
            cst("", [[1, "Ametista de Éter"]]),
            "200.000z",
            "Perde tudo",
            "50%",
            "+1% a cada 5 Bênçãos",
        ],
        ["", "", cst("", [[5, "Ametista de Éter"]]), "1.000.000z", "Seguro", "—", "—"],
        [
            "Grau B → Grau A",
            "+11",
            cst("", [[2, "Âmbar de Éter"]]),
            "500.000z",
            "Perde tudo",
            "40%",
            "+1% a cada 7 Bênçãos",
        ],
        ["", "", cst("", [[10, "Âmbar de Éter"]]), "2.500.000z", "Seguro", "—", "—"],
    ])
)}
${secH("Materiais", "Os materiais podem ser obtidos com os NPCs de Grau. Topázio e Âmbar podem ser comprados com a Joalheira (morocc 166/54).")}
${tbl(
    ths(["Item", "Zeny", "Materiais"]),
    trs([
        [`<span class="item-label">${itemLink("Pedra de Éter")}</span>`, "100.000z", cst("", [[5, "Pó de Éter"]])],
        [
            `<span class="item-label">${itemLink("Bênção do Éter")}</span>`,
            "100.000z",
            cst("", [
                [5, "Pó de Éter"],
                [1, "Bênção do Ferreiro"],
            ]),
        ],
        [
            `<span class="item-label">${itemLink("Aquamarina de Éter")}</span>`,
            "100.000z",
            cst("", [
                [3, "Pedra de Éter"],
                [1, "Aquamarina"],
            ]),
        ],
        [
            `<span class="item-label">${itemLink("Topázio de Éter")}</span>`,
            "200.000z",
            cst("", [
                [6, "Pedra de Éter"],
                [1, "Topázio"],
            ]),
        ],
        [
            `<span class="item-label">${itemLink("Ametista de Éter")}</span>`,
            "300.000z",
            cst("", [
                [10, "Pedra de Éter"],
                [1, "Ametista"],
            ]),
        ],
        [
            `<span class="item-label">${itemLink("Âmbar de Éter")}</span>`,
            "500.000z",
            cst("", [
                [15, "Pedra de Éter"],
                [1, "Âmbar"],
            ]),
        ],
    ])
)}`
    );
}
function upChance() {
    const ev = upMode === "evento",
        suf = ev ? " — durante o evento" : "";
    if (upTable === "grau")
        return (
            `<h3 class="table-group-title">Grau${suf}: armas e armaduras</h3><p class="panel-note lg" style="margin:10px ` +
            `0 12px">O evento de grau aumenta as chances de sucesso ao subir o Grau de um item. É sazonal e fica ` +
            `ativo junto com o Evento de Refino.</p>` +
            `${fold(`Chances de sucesso — Grau${suf}`, grauChanceTable(ev ? "evento" : "normal"), {
                cls: "fold-top",
                open: true,
            })}`
        );
    const esp = upSpecial;
    return (
        `<h3 class="table-group-title">Refinamento — minérios ${esp ? "especiais" : "comuns"}${suf}` +
        `</h3><p class="panel-note lg" style="margin:10px 0 12px">O evento de refino aumenta as chances de sucesso ` +
        `nos NPCs de forja e é sazonal.${esp ? " Os minérios especiais estão listados em Detalhes do Refinamento." : ""}` +
        `</p>${fold(
            `Chances de sucesso — Refino${suf}`,
            refChanceTable((esp ? "especiais" : "comuns") + (ev ? "Ev" : "")),
            { cls: "fold-top", open: true }
        )}`
    );
}
function upgradesView() {
    const sw = (attr, cur, list) =>
        list
            .map(
                ([v, l]) =>
                    `<button class="subtab ${cur === v ? "active" : ""}"${cur === v ? ' aria-current="page"' : ""} data-${attr}="${v}" type="button">` +
                    `${l}</button>`
            )
            .join("");
    return (
        `<div class="page-head"><div><div class="eyebrow">SISTEMAS DE MELHORIA</div><h1 class="page-title">Grau & Refinamento</h1>` +
        `<p class="page-subtitle">Chances de sucesso e, abaixo, os detalhes de Refinamento e Grau.</p>` +
        `</div><span class="count-pill">CHANCES + DETALHES</span></div>
<div class="up-controls">` +
        `<div class="subtabs" role="group" aria-label="Tabela"><span class="muted" style="align-self:center;font-size:12px">Tabela:</span>` +
        `${sw("up-table", upTable, [
            ["refino", "Refino"],
            ["grau", "Grau"],
        ])}` +
        `<label class="switch-entry" data-up-extra="especiais"><input type="checkbox" id="upEspeciais"${upSpecial ? " checked" : ""}> ` +
        `Minérios especiais</label>` +
        `<label class="switch-entry" data-up-extra="modo"><input type="checkbox" id="upEvento"${upMode === "evento" ? " checked" : ""}> ` +
        `Chances durante o evento</label>` +
        `</div></div>
<div id="upChance">${upChance()}</div>
<div id="upDetail">${upDetail()}` +
        `</div>`
    );
}
function upDetail() {
    return upTable === "refino"
        ? fold("Detalhes do Refinamento", refinoPage(), { cls: "fold-top" })
        : fold("Detalhes do Grau", grauPage(), { cls: "fold-top" });
}
function bindUpgrades() {
    const sync = () => {
        $("#upChance").innerHTML = upChance();
        $$("[data-up-table]").forEach((b) => {
            const on = b.dataset.upTable === upTable;
            b.classList.toggle("active", on);
            if (on) b.setAttribute("aria-current", "page");
            else b.removeAttribute("aria-current");
        });
        $$('[data-up-extra="especiais"]').forEach((el) => (el.hidden = upTable !== "refino"));
        const d = $("#upDetail");
        if (d) d.innerHTML = upDetail();
    };
    $$("[data-up-table]").forEach(
        (b) =>
            (b.onclick = () => {
                upTable = b.dataset.upTable;
                sync();
            })
    );
    $("#upEspeciais")?.addEventListener("change", (e) => {
        upSpecial = e.target.checked;
        sync();
    });
    $("#upEvento")?.addEventListener("change", (e) => {
        upMode = e.target.checked ? "evento" : "normal";
        sync();
    });
    sync();
}
/* ===== v1.6: seções recolhíveis e página de Reforma (bROWiki) ===== */
const FOLDS = new Map();
/** Dobra (details): o título é cru (confiável, não re-escapado) e o atributo data-fold fica escapado. */
const fold = (title, body, o = {}) => {
    const key = String(title)
            .replace(/<[^>]*>/g, "")
            .trim(),
        open = FOLDS.has(key) ? FOLDS.get(key) : !!o.open;
    return (
        `<details class="fold ${o.cls || ""}" data-fold="${esc(key)}"${open ? " open" : ""}>` +
        `<summary>${title}${o.count ? `<span class="fold-count">${o.count}</span>` : ""}</summary>` +
        `<div class="fold-body">${body}</div></details>`
    );
};
document.addEventListener(
    "toggle",
    (e) => {
        const d = e.target;
        if (d.tagName === "DETAILS" && d.dataset.fold) FOLDS.set(d.dataset.fold, d.open);
    },
    true
);
const refNota = (s) => esc(s).replace(/\{\{(.+?)\}\}/g, (_, n) => itemLink(n));
const refItem = (n) => `<span class="item-label">${itemLink(n)}</span>`;
const refArrow = '<span class="reform-arrow">→</span>';
const refMats = (l) =>
    `<div class="material-lines">${l.map(([q, n]) => `<div class="material-line"><b class="material-qty">${fmt(q)} ×</b>${itemLink(n)}</div>`).join("")}` +
    `</div>`;
const refMethods = (inf) => inf.metodos.map((m) => [`<b>${esc(m.nome)}</b>`, esc(m.nota || "—"), refMats(m.mats)]);
function refRuns(g) {
    const runs = [];
    g.itens.forEach((x) => {
        if (x.i !== null) runs.push({ inf: g.infos[x.i], items: [x] });
        else runs[runs.length - 1].items.push(x);
    });
    return runs;
}
function refMulti(g) {
    const par = (items) =>
        items.map((x) => `<div class="ref-par">${refItem(x.o)} ${refArrow} ${refItem(x.r)}</div>`).join("");
    const rows = [];
    refRuns(g).forEach(({ inf, items }) => {
        const p = par(items),
            req = inf.notas.length ? inf.notas.map(refNota).join("<br>") : "\u2014",
            ms = refMethods(inf);
        (ms.length ? ms : [["\u2014", "\u2014", "\u2014"]]).forEach((m) => rows.push([p, req, m[0], m[1], m[2]]));
    });
    const cols = [
        [0, "Item original \u2192 reformado", (c) => c[0]],
        [1, "Requisitos", (c) => c[1]],
        [2, "M\u00e9todo", (c) => c[2]],
        [3, "Altera\u00e7\u00e3o no refino", (c) => c[3]],
        [4, "Materiais", (c) => c[4]],
    ];
    return tbl(ths(cols.map((c) => esc(c[1]))), rowspanBody(rows, cols, [0, 1]), "grouped-table align-top");
}
const refGrupo = (g) =>
    fold(g.titulo, refMulti(g), { count: `${g.itens.length} ${g.itens.length === 1 ? "item" : "itens"}` });
const refEquipe = (e) =>
    fold(
        `${esc(e.nome)} <small>(${esc(e.sufixo)})</small>`,
        `<p class="table-search-note">Armas reformadas pela ${esc(e.nome)} serão marcadas como <b>` +
            `${esc(e.sufixo)}</b> no final dos nomes. São feitas pelo Pesquisador ${naviBtn(esc(e.navi))}.</p>` +
            `${e.grupos.map(refGrupo).join("")}`,
        { open: true, cls: "fold-team" }
    );
function refMinerais() {
    const cats = [
            ["Inferior", null, "10.000z"],
            ["Comum", "Inferior", "10.000z"],
            ["Incomum", "Comum", "20.000z"],
            ["Superior", "Incomum", "50.000z"],
        ],
        tipos = ["Arma", "Armadura", "Acessório"];
    return tbl(
        ths(["Categoria", "Item", "Materiais", "Zeny"]),
        cats
            .map(([c, prev, z]) =>
                tipos
                    .map(
                        (tp, i) =>
                            `<tr>${i === 0 ? `<td rowspan="3">${c}</td>` : ""}<td><span class="item-label">${itemLink(`Semijoia ${c} de ${tp}`)}` +
                            `</span></td><td>${prev ? cst("", [[3, `Semijoia ${prev} de ${tp}`]]) : cst("", [[1, "Sombridecon"]])}` +
                            `</td>${i === 0 ? `<td rowspan="3">${z}</td>` : ""}</tr>`
                    )
                    .join("")
            )
            .join("")
    );
}
function fidesBonus() {
    const b = db.fides?.bonus;
    if (!b) return "";
    const fb = (d) =>
        tbl(
            ths(["Bônus", "Adulter", "Vivatus"]),
            ["1º Bônus", "2º Bônus"]
                .map(
                    (t, i) =>
                        `<tr><th colspan="3">${t}</th></tr>${(i ? d.segundo : d.primeiro).map((x) => `<tr><td>${esc(x.efeito)}</td><td>${esc(x.adulter)}</td><td>${esc(x.vivatus)}</td></tr>`).join("")}`
                )
                .join(""),
            "grouped-table"
        );
    const comb = (rot, nom) =>
        `<p class="table-search-note"><b>${esc(rot)}</b> ${nom.map((n) => itemLink(n)).join(", ")}</p>`;
    return (
        `<div class="panel-note lg"><b>Regras</b><ul>${b.regras.map((r) => `<li>${esc(r)}</li>`).join("")}` +
        `</ul>${b.variaveis.map((v) => `<p><b>${esc(v.nome)}</b> pode ser, aleatoriamente: ${esc(v.opcoes)}.</p>`).join("")}` +
        `</div>${comb("Combinadores das Armas Adulter Fides:", b.combinadores.adulter)}${comb("Combinadores das Armas Vivatus Fides:", b.combinadores.vivatus)}` +
        `<p class="table-search-note">${esc(b.combinadores.nota)}</p><div class="section-heading">` +
        `<div><h2>Bônus Físicos</h2></div></div>${fb(b.fisicos)}<div class="section-heading">` +
        `<div><h2>Bônus Mágicos</h2></div></div>${fb(b.magicos)}`
    );
}
function reformView() {
    const eq = db.reformaPagina?.equipes || [];
    return (
        `<div class="page-head"><div><div class="eyebrow">MELHORIAS DE EQUIPAMENTO</div><h1 class="page-title">Reforma</h1>` +
        `<p class="page-subtitle">Equipes de reforma, armas Fides e minerais.</p></div><span class="count-pill">` +
        `${eq.length} EQUIPES + FIDES</span></div>
<div class="panel-note lg">Reforma é um sistema que permite ` +
        `transformar seus equipamentos em versões mais poderosas. Para reformar um item, vá ao Laboratório Regenschirm ` +
        `e fale com a Promotora de Reformas, no Shopping ${naviBtn("/navi itemmall 15/50")} ou em Lighthalzen ${naviBtn("/navi lighthalzen 99/156")}. ` +
        `O processo exige o equipamento com o nível de refino e os materiais corretos.</div>
${avisoSeFalha("fides")}${avisoSeFalha("reformaPagina")}
${secH("Reformas", "Cada equipe marca as armas reformadas com um sufixo no nome. Clique no título de uma seção para recolher ou abrir.")}${eq.map(refEquipe).join("")}
${fold(
    "Armas Fides",
    '<div id="reformNote"></div><div id="reformConversionMount"></div><div class="section-heading"><div><h2>B\u00f4nus ' +
        "aleat\u00f3rios das Armas Fides</h2></div></div>" +
        fidesBonus(),
    { cls: "fold-top", count: `${(db.fides?.classes || []).reduce((n, c) => n + c.armas.length, 0)} armas` }
)}
${fold(
    "Minerais",
    '<div class="panel-note lg">São fabricados pelo Pesquisador de Minérios ${naviBtn("/navi rgsr_in 131/187")}. ' +
        "Você também pode refinar os minerais em semijoias com o mesmo NPC.</div>" +
        refMinerais(),
    { cls: "fold-top" }
)}`
    );
}
/* ===== Guia de Episódio + Cópia rápida de /navi ===== */
let guideTab = "principal";
let activeEpid = null;

/* ===== Cópia rápida de /navi ===== */
/**
 * Botão que copia um comando /navi ao clicar (com feedback de sucesso/erro no title).
 * @param {string} cmd Comando /navi.
 */
function naviBtn(cmd) {
    if (!cmd) return "";
    const full = cmd.startsWith("/navi") ? cmd : `/navi ${cmd}`;
    return (
        `<button type="button" class="navi-chip" data-copy-navi="${esc(full)}" title="Clique para copiar ${esc(full)}">` +
        `<code>${esc(full)}</code></button>`
    );
}

/** Texto rico dos JSONs: escapa, converte \n em <br>, /navi … em botão e {{Item}} em link. */
const richText = (s) =>
    escapeEntities(s)
        .replace(/\n/g, "<br>")
        .replace(/\/navi\s+[a-z0-9_@]+\s+\d{1,3}\/\d{1,3}/gi, (m) => naviBtn(m))
        .replace(
            /(\d+)(\s*×\s*)\{\{([^}]+)\}\}/g,
            (_, q, sep, n) => `<span class="qty-item">${q} ×${itemLink(n)}</span>`
        )
        .replace(/\{\{([^}]+)\}\}/g, (_, n) => itemLink(n));
function guideEps() {
    return [...(db.guia || [])].sort((a, b) => episodeRank(b.titulo) - episodeRank(a.titulo));
}
function pickEp() {
    const eps = guideEps();
    return eps.find((e) => e.id === activeEpid) || eps[0];
}
function epSwitcher() {
    return (
        `<div class="toolbar" style="margin-bottom:14px"><label for="epSelect" style="font-size:14px">Episódio:</label>` +
        `<select id="epSelect">${guideEps()
            .map(
                (e) =>
                    `<option value="${esc(e.id)}"${e.id === pickEp().id ? " selected" : ""}>${esc(e.titulo)}</option>`
            )
            .join("")}` +
        `</select></div>`
    );
}
function stepList(list) {
    return list
        .map(
            (p, i) =>
                `<li class="guide-step"><span class="step-num">${i + 1}.</span> <span class="step-text">` +
                `${esc(p.texto)}</span>${naviBtn(p.navi)}</li>`
        )
        .join("");
}
function itensEtapa(list) {
    /* Defesa: dado malformado (string em vez de lista) não derruba a aba. */
    if (typeof list === "string") list = [list];
    if (!Array.isArray(list)) return "";
    return list?.length ? `<p class="gift-line"><b>Itens desta etapa:</b> ${list.map(richText).join(" · ")}</p>` : "";
}
function itensNecessariosHtml(ep) {
    const it = ep.itensNecessarios;
    if (!it) return "";
    const block = (t) =>
        t
            ? fold(t.titulo, tableFrame(t.colunas.map(esc), trs(t.linhas.map((r) => r.map(richText))), "align-top"), {
                  count: `${t.linhas.length} itens`,
              })
            : "";
    const embarque = it.embarque
        ? fold(
              it.embarque.titulo,
              `${tableFrame(it.embarque.colunas.map(esc), trs(it.embarque.linhas.map((r) => r.map(richText))), "align-top")}${it.observacaoEquip ? `<p class="gift-line"><b>Equipamentos e encantamentos:</b> ${richText(it.observacaoEquip)}</p>` : ""}${it.nota ? `<p class="gift-line">${richText(it.nota)}</p>` : ""}`,
              { open: true, count: `${it.embarque.linhas.length} itens` }
          )
        : "";
    return (
        `<section class="itens-necessarios">
    <div class="section-heading"><div><h2>Itens necessários</h2>` +
        `<p>Materiais da estória e o que levar de Midgard antes do passo a passo. Itens de diárias ficam na página Missões Diárias.</p>` +
        `</div></div>
    ${block(it.diarias)}${embarque}
  </section>`
    );
}

function servicosHtml(ep) {
    const sv = ep.servicos,
        rep = ep.lojaReputacao;
    if (!sv && !rep) return "";
    const tabela = (t) =>
        tableFrame(
            t.colunas.map(esc),
            trs(
                t.linhas.map(([servico, npc, onde, custos, obs]) => [
                    esc(servico),
                    esc(npc),
                    naviBtn(onde),
                    richText(custos || ""),
                    richText(obs || ""),
                ])
            ),
            "align-top"
        );
    const repTabela = (t) => tableFrame(t.colunas.map(esc), trs(t.linhas.map((r) => r.map(richText))), "align-top");
    return (
        `<section class="itens-necessarios">
    <div class="section-heading"><div><h2>Serviços do episódio</h2>` +
        `<p>NPCs de utilidade, lojas e trocas do episódio.</p></div></div>
    ${sv ? fold(sv.titulo, tabela(sv), { count: `${sv.linhas.length} serviços` }) : ""}
    ${rep ? fold(rep.titulo, `${repTabela(rep)}${rep.nota ? `<p class="gift-line">${richText(rep.nota)}</p>` : ""}`, { count: `${rep.linhas.length} itens` }) : ""}
  ` +
        `</section>`
    );
}

/* Rótulo humano da secundária: o código S1/S2 do JSON é interno; exibe “Secundária 1”. */
const secLabel = (sec) => (sec.codigo ? `Secundária ${sec.codigo.replace(/^S/i, "")} — ${sec.titulo}` : sec.titulo);

function guideView() {
    const ep = pickEp();
    if (!ep) return `<div class="panel-note">Nenhum guia de episódio carregado.</div>`;

    const avisosHtml = ep.avisos?.length
        ? `<div class="panel-note"><b>Pontos de atenção:</b><ul style="margin:6px 0 0 18px">` +
          `${ep.avisos.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div>`
        : "";

    /* Página única: capítulos e secundárias em seções soltas (sem folds),
       com âncora por seção e um sumário com links no topo. */
    const principalHtml = ep.principal
        .map((cap, idx) => {
            const body =
                `${itensEtapa(cap.itens)}${cap.nota ? `<p class="gift-line">⚠️ ${esc(cap.nota)}</p>` : ""}${cap.recompensa ? `<p class="gift-line">🎁 ${esc(cap.recompensa)}</p>` : ""}${cap.desbloqueia ? `<p class="gift-line">🔓 <b>Desbloqueia:</b> ${esc(cap.desbloqueia)}</p>` : ""}` +
                `<ol class="guide-steps">${stepList(cap.passos)}</ol>`;
            return (
                `<section class="guide-section" id="${ep.id}-cap${idx}"><div class="guide-section-head">` +
                `<h3>${esc(cap.capitulo)}</h3><span>${cap.passos.length} ${cap.passos.length === 1 ? "passo" : "passos"}` +
                `</span></div>${body}</section>`
            );
        })
        .join("");

    const secundariasHtml = ep.secundarias
        .map((sec, idx) => {
            const meta = [
                sec.prerequisito && `<b>Pré:</b> ${esc(sec.prerequisito)}`,
                sec.recompensa && `🎁 ${esc(sec.recompensa)}`,
                sec.desbloqueia && `🔓 <b>Desbloqueia:</b> ${esc(sec.desbloqueia)}`,
            ]
                .filter(Boolean)
                .join(" · ");
            const body =
                `${meta ? `<p class="gift-line">${meta}</p>` : ""}${itensEtapa(sec.itens)}<ol class="guide-steps">` +
                `${stepList(sec.passos)}</ol>`;
            return (
                `<section class="guide-section" id="${ep.id}-sec${idx}"><div class="guide-section-head">` +
                `<h3>${esc(secLabel(sec))}</h3><span>${sec.passos.length} ${sec.passos.length === 1 ? "passo" : "passos"}` +
                `</span></div>${body}</section>`
            );
        })
        .join("");

    const sumario = (lista) =>
        lista.length
            ? `<nav class="guide-sumario"><b>Nesta aba:</b><ul>${lista
                  .map(([href, label]) => `<li><a href="#${href}">${esc(label)}</a></li>`)
                  .join("")}` + `</ul></nav>`
            : "";

    const sumarioHtml =
        guideTab === "principal"
            ? sumario(ep.principal.map((cap, idx) => [`${ep.id}-cap${idx}`, cap.capitulo]))
            : sumario(ep.secundarias.map((sec, idx) => [`${ep.id}-sec${idx}`, secLabel(sec)]));

    return (
        `
    <div class="page-head">
      <div>
        <div class="eyebrow">PASSO A PASSO · QUESTS</div>
        ` +
        `<h1 class="page-title">` +
        `${esc(ep.titulo)}</h1>
        <p class="page-subtitle">${esc(ep.requisitos)} · ${esc(ep.recompensaTotal)}` +
        `</p>
      </div>
    </div>
    ${epSwitcher()}
    ${avisoSeFalha("guia")}
    ${avisosHtml}
    ${itensNecessariosHtml(ep)}
    ${servicosHtml(ep)}
    ` +
        `<div class="section-heading">` +
        `<div><h2>Passo a passo</h2><p>Capítulos da história e missões secundárias, com /navi copiável em cada etapa.</p>` +
        `</div></div>
    <div class="up-controls" style="margin-bottom:14px">
      <div class="subtabs" role="group" ` +
        `aria-label="Tipo de missão">
        <button class="subtab ${guideTab === "principal" ? "active" : ""}"${guideTab === "principal" ? ' aria-current="page"' : ""} ` +
        `data-guide-tab="principal" type="button">Quest Principal (${ep.principal.length} etapas)</button>
        ` +
        `<button class="subtab ${guideTab === "secundarias" ? "active" : ""}"${guideTab === "secundarias" ? ' aria-current="page"' : ""} ` +
        `data-guide-tab="secundarias" type="button">Missões Secundárias (${ep.secundarias.length})</button>
      ` +
        `</div>
    </div>
    <div id="guideBody">
      ${sumarioHtml}
      ${guideTab === "principal" ? principalHtml : secundariasHtml}
    ` +
        `</div>
  `
    );
}

document.addEventListener("click", (e) => {
    const tabBtn = e.target.closest("[data-guide-tab]");
    if (tabBtn) {
        guideTab = tabBtn.dataset.guideTab;
        render();
        return;
    }
    const copyBtn = e.target.closest("[data-copy-navi]");
    if (copyBtn) {
        const text = copyBtn.dataset.copyNavi;
        navigator.clipboard
            ?.writeText(text)
            .then(() => {
                const old = copyBtn.title;
                copyBtn.classList.add("copied");
                copyBtn.title = "Copiado!";
                setTimeout(() => {
                    copyBtn.classList.remove("copied");
                    copyBtn.title = old;
                }, 1400);
            })
            .catch(() => {
                /* Sem permissão de clipboard (ex.: file://): avisa o usuário no chip. */
                const old = copyBtn.title;
                copyBtn.classList.add("copy-fail");
                copyBtn.title = "Não foi possível copiar — selecione o texto e use Ctrl+C";
                setTimeout(() => {
                    copyBtn.classList.remove("copy-fail");
                    copyBtn.title = old;
                }, 2600);
            });
    }
});

/* ===== Inicialização: carrega os dados e abre a visão geral ===== */
loadData()
    .then(() => {
        setView("inicio");
    })
    .catch((err) => {
        $("#content").innerHTML =
            `<div class="error-box"><b>Não consegui carregar a biblioteca.</b><br>${esc(err.message)}` +
            `<br>Abra o site por um servidor local ou publique a pasta inteira no GitHub Pages; os arquivos de dados ` +
            `precisam ficar ao lado do site em <code>data/</code>.</div>`;
    });
