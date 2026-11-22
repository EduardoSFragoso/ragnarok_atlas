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
