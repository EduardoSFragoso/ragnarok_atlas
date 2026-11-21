/* ===== Ragnarök Atlas — js/calculadoras.js =====
   Calculadoras: catálogo, receitas por habilidade, painéis e encantamento total. */

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
