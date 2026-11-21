/* ===== Ragnarök Atlas — js/dados.js =====
   Dados carregados: referências e conteúdo de data/, normalização das tabelas (COL) e loadData(). */

let BROWIKI = [],
    HAZY_EP = [],
    IROWIKI = [];
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
/* EP19_IDS, GRAU19 e RECYCLE19 são conteúdo do site, carregados de
   data/referencias.json em loadData (edite lá, não aqui). */
let GRAU19 = { steps: [], mats: [] },
    RECYCLE19 = [];
/* Links das atividades (nome -> página da bROWiki), de data/referencias.json. */
let ACTIVITY_LINKS = {};

/* Tabelas de chance de refino/grau: compactas em data/referencias.json,
   expandidos com rb() em loadData (cada linha: ["+n", "x%", ...]). */
let REF_CH = { comuns: [], comunsEv: [], especiais: [], especiaisEv: [] },
    GRAU_CH = { normal: [], evento: [] };
