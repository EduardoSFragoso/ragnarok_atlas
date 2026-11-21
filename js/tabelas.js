/* ===== Ragnarök Atlas — js/tabelas.js =====
   Tabelas de dados: equipamentos, encantamentos, custos e reformas (montagem por view). */

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

function tableFrame(headers, body, extra = "") {
    return (
        `<div class="table-wrap"><table class="data-table ${extra}"><thead><tr>` +
        `${headers.map((h) => `<th>${h}</th>`).join("")}` +
        `</tr></thead><tbody>${body || `<tr><td class="empty" colspan="${headers.length}">Nenhum resultado para esse filtro.</td></tr>`}` +
        `</tbody></table></div>`
    );
}

function rowspanBody(rows, cols, mergeCols = []) {
    if (!rows.length) return "";
    const campos = cols.map(([campo]) => campo);
    let out = "";
    for (let i = 0; i < rows.length; i++) {
        out += "<tr>";
        cols.forEach(([campo, , formatar], j) => {
            const celula = () => (formatar ? formatar(rows[i]) : esc(rows[i][campo] || "—"));
            if (mergeCols.includes(j)) {
                const parents = mergeCols.filter((n) => n <= j),
                    same = (a, b) =>
                        parents.every((k) => String(rows[a][campos[k]] || "") === String(rows[b][campos[k]] || ""));
                if (i > 0 && same(i - 1, i)) return;
                let span = 1;
                while (i + span < rows.length && same(i, i + span)) span++;
                out += `<td rowspan="${span}">${celula()}</td>`;
            } else out += `<td>${celula()}</td>`;
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
                            c[K.navi] && naviBtn(c[K.navi]),
                            c[K.qtd2] && `${esc(c[K.qtd2])} ${itemLink(c[K.mat2])}`,
                        ].filter(Boolean);
                    return unique
                        .map(
                            (r, i) =>
                                `<tr><td><span class="item-label">${itemLink(r[K.equip])}</span></td>${
                                    i === 0
                                        ? `<td rowspan="${unique.length}" class="material-cell"><div class="material-lines">` +
                                          `${price
                                              .map((x, j) => {
                                                  const classe = j === 0 ? "material-line" : "table-meta";
                                                  const texto = j === 0 ? `<b class="material-qty">${x}</b>` : x;
                                                  return `<span class="${classe}">${texto}</span>`;
                                              })
                                              .join("")}` +
                                          `</div></td>`
                                        : ""
                                }` + `</tr>`
                        )
                        .join("");
                })
                .join("");
            return (
                `<section class="table-section"><div class="table-section-head"><h2>${esc(section[0][K.ep])}` +
                ` · ${esc(section[0][K.cat])}` +
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
                      `<tr><td>${itemLink("Refinador de Automatron")}</td><td>+4 a +6</td><td>+7</td>` +
                          `<td>30.000.000 Zeny</td>` +
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
                    `<section class="table-section"><div class="table-section-head"><h2>${esc(section[0][K.ep])}` +
                    ` · ${esc(section[0][K.alvo])}` +
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
                                return (
                                    `<tr><td>${esc(target)}</td><td>${slots}</td><td>${fx}</td><td class="material-cell">` +
                                    `${matHtml}</td></tr>`
                                );
                            })
                            .join("");
                    const navis = [...new Set(all.map((r) => r[K.navi]).filter(Boolean))];
                    const tabelaCusto = tableFrame(
                        ["Equipamento", "Slot(s)", "Tipo de efeito", "Materiais por tentativa"],
                        body,
                        "grouped-table align-top"
                    );
                    return (
                        `<section class="table-section"><div class="table-section-head"><h2>${esc(episode[0][K.ep])}` +
                        ` · custo de encantamento</h2>` +
                        `<span>${targets.length} equipamentos</span></div><div class="panel-note cost-summary">` +
                        `<b>Armaduras e acessórios:</b> 35 × ${itemLink("Pétala de Flor Invernal")}` +
                        ` em Vellgunde (${esc(navis[0] || "")}). ` +
                        `A troca entrega <b>1 Peça de Flor Invernal aleatória</b>. Os custos dos encantamentos de armas variam ` +
                        `por slot e estão na tabela.</div>` +
                        `${
                            all.some((r) => /\*/.test(r[K.efeito] || ""))
                                ? '<p class="table-search-note" style="margin:6px 0 10px">* Encantamentos de habilidade de classe 3: valores ' +
                                  "confirmados somente no Hazy Forest (kRO); não constam na bROWiki ou iROWiki.</p>"
                                : ""
                        }${tabelaCusto}` +
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
                                .map((x) => {
                                    const npc = x[K.npc]
                                        ? `<span class="table-meta">${esc(x[K.npc])}${x[K.navi] ? ` · ${esc(x[K.navi])}` : ""}</span>`
                                        : "";
                                    const obs = x[K.obs] ? `<span class="table-meta">${richText(x[K.obs])}</span>` : "";
                                    return (
                                        `<div class="material-line"><b class="material-qty">${esc(x[K.qtd] || "—")} ×</b>` +
                                        `${itemLink(x[K.material])}</div>${npc}${obs}`
                                    );
                                })
                                .join(""),
                            body = costGroup
                                .map(
                                    (x, i) =>
                                        `<tr><td>${esc(x.target)}</td><td>${esc(x.slot)}</td><td>${esc(x.effect)}` +
                                        `</td>${
                                            i === 0
                                                ? `<td rowspan="${costGroup.length}" class="material-cell"><div class="material-lines">` +
                                                  `${materials}</div></td>`
                                                : ""
                                        }` +
                                        `</tr>`
                                )
                                .join("");
                        const tabelaCusto = tableFrame(
                            ["Equipamento", "Slot(s)", "Tipo de efeito", "Materiais por tentativa"],
                            body,
                            "grouped-table align-top"
                        );
                        return (
                            `<section class="table-section"><div class="table-section-head"><h2>${esc(episode[0][K.ep])}` +
                            ` · custo por encantamento</h2>` +
                            `<span>${targets.length} peças com o mesmo custo</span></div>${tabelaCusto}` +
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
        cols.map(([, rotulo]) => esc(rotulo)),
        body
    );
}

function renderReformTable() {
    const f = db.fides || {},
        term = globalTerm.toLocaleLowerCase("pt-BR");
    $("#reformNote").innerHTML =
        `<p class="table-search-note">Armas Adulter Fides (+9 ou mais) viram Vivatus Fides com o ` +
        `${esc(f.npc?.nome || "Bamdatt")} ${naviBtn("/navi " + (f.npc?.navi || "wolfvill 170/131"))}` +
        `. ` +
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
                        `<tr><td class="classe-cell">${esc(cl.classe)}</td><td><div class="ver-grid">` +
                        `${cl.armas
                            .map((a) => `<div class="adu">${refItem(a.o)}</div><div class="viv">${refItem(a.r)}</div>`)
                            .join("")}` +
                        `</div></td></tr>`
                )
                .join(""),
            "conv-table align-top"
        );
}
