/* ===== Ragnarök Atlas — js/reforma.js =====
   Página de Reforma (bROWiki) e seções recolhíveis. */

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
