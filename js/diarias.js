/* ===== Ragnarök Atlas — js/diarias.js =====
   Missões diárias e controle de farm (estoque por episódio). */

/* eslint-disable prefer-const -- diaBonus é reatribuída em telas.js */
let activeDiaEp = null,
    diaBonus = false;
/* eslint-enable prefer-const */

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
    cols.push([K.obs, "Observação", (c) => (c[K.obs] ? richText(c[K.obs]) : "—")]);
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
                    cols.map(([, rotulo]) => esc(rotulo)),
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
                          d.obs ? richText(d.obs) : "",
                      ])
                  );
                  const extra = gr.diarias
                      .filter((d) => (d.detalhes && d.detalhes.length) || d.tabela)
                      .map((d) => {
                          const itensPassos = (d.detalhes || [])
                              .map((x) => `<li class="guide-step"><span class="step-text">${richText(x)}</span></li>`)
                              .join("");
                          const passos =
                              d.detalhes && d.detalhes.length ? `<ol class="guide-steps">${itensPassos}</ol>` : "";
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
                                  .replace(/[^a-z0-9]+/g, "-")}` +
                              `">` +
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
      ${diariasEstoqueWidget(activeDiaEp, rows)}` +
        `
    </div>
    <div class="toolbar" ` +
        `style="margin-bottom:14px">` +
        `<label for="diaSelect" style="font-size:14px">Episódio:</label><select id="diaSelect">` +
        `${eps.map((e) => `<option${e === activeDiaEp ? " selected" : ""}>${esc(e)}</option>`).join("")}` +
        `</select></div>
    ${avisoSeFalha("fontes")}
    ${ges?.diarias?.aviso ? `<div class="panel-note">${richText(ges.diarias.aviso)}</div>` : ""}` +
        `
    ` +
        `<div class="panel-note">` +
        `<b>Ganho por dia:</b> <span id="diaTotalsList">${diaTotalsHtml(rows, diaBonus && temBonus)}` +
        `</span></div>
    ${gruposHtml}
  `
    );
}
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
                ? `<label class="bonus-entry"><input type="checkbox" id="diaBonus"${diaBonus ? " checked" : ""}` +
                  `> incluir ` +
                  `bônus por reputação</label>`
                : ""
        }` +
        `</div>${moedas
            .map((m) => {
                const farm = totals.get(m) || 0;
                return (
                    `<div class="est-item"><span class="item-label">${itemIcon(m)}${esc(m)}` +
                    `</span><span class="est-controls">` +
                    `<label>Tem <input type="number" min="0" step="1" data-est-item="${esc(m)}` +
                    `" value="${esc(est[m] ?? rec?.total_moedas?.[m] ?? 0)}" ` +
                    `title="Valor salvo; vazio ou 0 volta ao total das quests">` +
                    `</label><button type="button" class="button" data-est-add="${esc(m)}" data-farm="` +
                    `${farm}" title="Somar ` +
                    `o ganho das diárias de hoje ao estoque">+ ${fmt(farm)}` +
                    `</button><button type="button" class="button stock-reset" data-est-rst="` +
                    `${esc(m)}" title="Voltar ao ` +
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
