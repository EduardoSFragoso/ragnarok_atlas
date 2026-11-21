/* ===== Ragnarök Atlas — js/reciclagem.js =====
   Reciclagem e Globos do Ep. 19 (Issgard). */

function recycleView() {
    if (!RECYCLE19.length)
        return caixaErroHtml("Reciclagem e Globos indisponível", "Falha ao carregar data/referencias.json");
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
        `<div class="page-head"><div><div class="eyebrow">ISSGARD · EPISÓDIO 19</div>` +
        `<h1 class="page-title">Reciclagem e Globos</h1>` +
        `<p class="page-subtitle">O que o Incinerador devolve ao reciclar armas Vil Invernais — e as trocas de Globo do Hoyoyo.</p>` +
        `</div><span class="count-pill">${RECYCLE19.length} GRUPOS</span></div><div class="panel-note">` +
        `<b>Como funciona:</b> fale com o Incinerador, junto ao quartel ${naviBtn("/navi icecastle 186/221")}` +
        `. ` +
        `Cada reciclagem consome 3 Armas Vil Invernais e entrega materiais de encantamento em quantidades variáveis.</div>` +
        `<div class="section-heading"><div><h2>Resultados possíveis</h2><p>Faixas “mín ~ máx” indicam quantidade ` +
        `sorteada. A página de origem lista quatro grupos de resultado; confirme lá se são opções do menu ou ` +
        `resultados simultâneos.</p>` +
        `</div></div>${tableFrame(["Entrada", "Resultado", "Quantidade por reciclagem"], body, "grouped-table align-top")}` +
        `<div class="section-heading"><div><h2>Estimativa por quantidade</h2><p>Quantas reciclagens você consegue ` +
        `fazer e quanto pode receber de um grupo.</p>` +
        `</div></div><div class="card calc-form"><div class="fields">` +
        `<div class="field"><label>Armas Vil Invernais</label><div class="rc-stepper">` +
        `<button type="button" class="button" ` +
        `data-rc="sub" aria-label="Remover 3">− 3</button>` +
        `<b id="rcQty">3</b><button type="button" class="button" data-rc="add" aria-label="Adicionar 3">+ 3</button>` +
        `</div></div><div class="field"><label for="rcGroup">Grupo de resultado</label>` +
        `<select id="rcGroup">` +
        `${RECYCLE19.map(([grupo], i) => `<option value="${i}">${esc(grupo)}</option>`).join("")}` +
        `</select></div><div class="field"><label for="rcDay">Armas por dia</label>` +
        `<input id="rcDay" type="number" ` +
        `min="0" step="3" value="${stNum(stLoad("ro-atlas-armas-dia", 0))}">` +
        `</div></div><p class="table-search-note" id="rcDayNote"></p></div><div class="card calc-result">` +
        `<div class="eyebrow">ESTIMATIVA</div><h3 id="rcTitle">—</h3><div class="ingredient-list" id="rcTotals">` +
        `</div></div></div>` +
        globosHtml()
    );
}

/** Seção Globos de Flor Invernal: cadeia de trocas do Hoyoyo (op. 1) e a
    reciclagem de Globos da Vellgunde (op. 3) + a loja de Reputação (op. 2). */
function globosHtml() {
    const HOYOYO = naviBtn("/navi icas_in 175/63"),
        VELLGUNDE = naviBtn("/navi icas_in 185/63"),
        ondeHoyoyo = `Hoyoyo (op. 1) ${HOYOYO}`;
    const linhas = [
        [`5 × ${itemLink("Minério Mágico de Flor Invernal")}`, `1 × ${itemLink("Globo de Flor Invernal")}`, ondeHoyoyo],
        [
            `5 × ${itemLink("Globo de Flor Invernal")}`,
            `1 × ${itemLink("Globo de Flor Invernal Brilhante")}`,
            ondeHoyoyo,
        ],
        [
            `5 × ${itemLink("Globo de Flor Invernal Brilhante")}`,
            `1 × ${itemLink("Globo de Flor Invernal Reluzente")}`,
            ondeHoyoyo,
        ],
        [
            `3 × Globo (qualquer tipo, escolhido numa janela própria)`,
            `1 × ${itemLink("Globo de Flor Invernal")} <b>aleatório</b>`,
            `Vellgunde (op. 3) ${VELLGUNDE}`,
        ],
    ]
        .map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`)
        .join("");
    return (
        `<div class="section-heading"><div><h2>Globos de Flor Invernal</h2>` +
        `<p>Trocas com o Hoyoyo e reciclagem com a Vellgunde, materiais de encantamento do Ep. 19.</p>` +
        `</div></div>` +
        tableFrame(["Você entrega", "Você recebe", "Onde"], linhas, "align-top") +
        `<div class="panel-note"><b>Loja de Reputação:</b> o Hoyoyo também abre a loja de Reputação (op. 2, ` +
        `paga com ${itemLink("Pétala de Flor Invernal")}); a lista completa fica na aba Guia, no Ep. 19.</div>`
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
            defineHTML(
                $("#rcTotals"),
                g()[1]
                    .map(
                        ([nome, min, max]) =>
                            `<div class="ingredient"><span class="item-label">${itemLink(nome)}</span>` +
                            `<b>${fmt(min * cycles)}${min === max ? "" : ` ~ ${fmt(max * cycles)}`}` +
                            `</b></div>`
                    )
                    .join("")
            );
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
