/* ===== Ragnarök Atlas — js/guia.js =====
   Guia de Episódio e cópia rápida de /navi. */

let guideTab = "principal";

// eslint-disable-next-line prefer-const -- reatribuída em telas.js
let activeEpid = null;
/**
 * Botão que copia um comando /navi ao clicar (com feedback de sucesso/erro no title).
 * @param {string} cmd Comando /navi.
 */
function naviBtn(cmd) {
    if (!cmd) return "";
    const full = cmd.startsWith("/navi") ? cmd : `/navi ${cmd}`;
    return (
        `<button type="button" class="navi-chip" data-copy-navi="${esc(full)}" title="Clique para copiar ` +
        `${esc(full)}">` +
        `<code>${esc(full)}</code></button>`
    );
}

/** Texto rico de UMA linha (sem “- ” no começo): escapa, converte \n em <br>,
    /navi … em botão, !!aviso!! em destaque vermelho sublinhado e {{Item}} em link. */
const richUmaLinha = (s) =>
    escapeEntities(s)
        .replace(/\n/g, "<br>")
        .replace(/\/navi\s+[a-z0-9_@]+\s+\d{1,3}\/\d{1,3}/gi, (m) => naviBtn(m))
        .replace(/!!([^!]+)!!/g, (_, t) => `<span class="aviso-critico">${t}</span>`)
        .replace(
            /(\d+)(\s*×\s*)\{\{([^}]+)\}\}/g,
            (_, q, sep, n) => `<span class="qty-item">${q} ×${itemLink(n)}</span>`
        )
        .replace(/\{\{([^}]+)\}\}/g, (_, n) => itemLink(n));

/** Texto rico dos JSONs: linhas iniciadas por “- ” (separadas por \n) viram bullet
    points em <ul class="obs-list">; sem essas linhas, renderiza como texto corrido. */
const richText = (s) => {
    const partes = String(s ?? "").split("\n");
    if (!partes.some((p) => p.startsWith("- "))) return richUmaLinha(s);
    let html = "";
    let emLista = false;
    for (const parte of partes) {
        if (parte.startsWith("- ")) {
            if (!emLista) {
                html += '<ul class="obs-list">';
                emLista = true;
            }
            html += `<li>${richUmaLinha(parte.slice(2))}</li>`;
        } else {
            if (emLista) {
                html += "</ul>";
                emLista = false;
            }
            html += richUmaLinha(parte);
        }
    }
    if (emLista) html += "</ul>";
    return html;
};

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
    const corpoEmbarque = () => {
        const tabelaEmbarque = tableFrame(
            it.embarque.colunas.map(esc),
            trs(it.embarque.linhas.map((r) => r.map(richText))),
            "align-top"
        );
        const obsEquip = it.observacaoEquip
            ? `<p class="gift-line"><b>Equipamentos e encantamentos:</b> ${richText(it.observacaoEquip)}</p>`
            : "";
        const nota = it.nota ? `<p class="gift-line">${richText(it.nota)}</p>` : "";
        return `${tabelaEmbarque}${obsEquip}${nota}`;
    };
    const embarque = it.embarque
        ? fold(it.embarque.titulo, corpoEmbarque(), { open: true, count: `${it.embarque.linhas.length} itens` })
        : "";
    return (
        `<section class="itens-necessarios">
    <div class="section-heading"><div>` +
        `<h2>Itens necessários</h2>` +
        `<p>Materiais da estória e o que levar de Midgard antes do passo a passo. Itens de diárias ficam na página Missões Diárias.</p>` +
        `</div></div>
    ${block(it.diarias)}${embarque}
  </section>`
    );
}

/** Linhas de uma tabela do guia indexadas PELO NOME da coluna t.colunas[i]:
    devolve objetos {servico, npc, …} — reordenar ou acrescentar colunas no
    JSON não desalinha o render (mesmo contrato de data/colunas.json). */
const linhasNomeadas = (t) =>
    (t.linhas || []).map((r) => Object.fromEntries(t.colunas.map((nome, i) => [nome, r[i] ?? ""])));

function servicosHtml(ep) {
    const sv = ep.servicos,
        rep = ep.lojaReputacao;
    if (!sv && !rep) return "";
    const tabela = (t) =>
        tableFrame(
            t.colunas.map(esc),
            trs(
                linhasNomeadas(t).map((r) => [
                    esc(r["Serviço"]),
                    esc(r["NPC"]),
                    naviBtn(r["Onde (/navi)"]),
                    richText(r["Custos"] || ""),
                    richText(r["Observação"] || ""),
                ])
            ),
            "align-top"
        );
    const repTabela = (t) => tableFrame(t.colunas.map(esc), trs(t.linhas.map((r) => r.map(richText))), "align-top");
    const notaRep = rep?.nota ? `<p class="gift-line">${richText(rep.nota)}</p>` : "";
    const reputacao = rep
        ? fold(rep.titulo, `${repTabela(rep)}${notaRep}`, { count: `${rep.linhas.length} itens` })
        : "";
    return (
        `<section class="itens-necessarios">
    <div class="section-heading"><div>` +
        `<h2>Serviços do episódio</h2>` +
        `<p>NPCs de utilidade, lojas e trocas do episódio.</p></div></div>
    ` +
        `${sv ? fold(sv.titulo, tabela(sv), { count: `${sv.linhas.length} serviços` }) : ""}` +
        `
    ${reputacao}` +
        `
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
            const notaCap = cap.nota ? `<p class="gift-line">⚠️ ${esc(cap.nota)}</p>` : "";
            const avisoCap = cap.aviso
                ? `<p class="gift-line"><span class="aviso-critico">${esc(cap.aviso)}</span></p>`
                : "";
            const premioCap = cap.recompensa ? `<p class="gift-line">🎁 ${esc(cap.recompensa)}</p>` : "";
            const desbloqueioCap = cap.desbloqueia
                ? `<p class="gift-line">🔓 <b>Desbloqueia:</b> ${esc(cap.desbloqueia)}</p>`
                : "";
            const body =
                `${itensEtapa(cap.itens)}${notaCap}${avisoCap}${premioCap}${desbloqueioCap}` +
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
        <p class="page-subtitle">${esc(ep.requisitos)}` +
        ` · ${esc(ep.recompensaTotal)}` +
        `</p>
      </div>
    </div>
    ${epSwitcher()}
    ${avisoSeFalha("guia")}` +
        `
    ${avisosHtml}
    ${itensNecessariosHtml(ep)}
    ${servicosHtml(ep)}` +
        `
    ` +
        `<div class="section-heading">` +
        `<div><h2>Passo a passo</h2><p>Capítulos da história e missões secundárias, com /navi copiável em cada etapa.</p>` +
        `</div></div>
    <div class="up-controls" style="margin-bottom:14px">
      <div class="subtabs" role="group" ` +
        `aria-label="Tipo de missão">
        <button class="subtab ${guideTab === "principal" ? "active" : ""}` +
        `"${guideTab === "principal" ? ' aria-current="page"' : ""} ` +
        `data-guide-tab="principal" type="button">Quest Principal (${ep.principal.length}` +
        ` etapas)</button>
        ` +
        `<button class="subtab ${guideTab === "secundarias" ? "active" : ""}"${guideTab === "secundarias" ? ' aria-current="page"' : ""}` +
        ` ` +
        `data-guide-tab="secundarias" type="button">Missões Secundárias (${ep.secundarias.length}` +
        `)</button>
      ` +
        `</div>
    </div>
    <div id="guideBody">
      ${sumarioHtml}
      ` +
        `${guideTab === "principal" ? principalHtml : secundariasHtml}
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
                /* Estado "copiado" visível por 2 s: troca o rótulo do chip e volta. */
                const original = copyBtn.cloneNode(true);
                copyBtn.classList.add("copied");
                copyBtn.replaceChildren("Copiado ✓");
                setTimeout(() => {
                    copyBtn.classList.remove("copied");
                    copyBtn.replaceChildren(...original.childNodes);
                }, 2000);
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
