/* ===== Ragnarök Atlas — app.js (ponto de entrada) =====
   Aplicação de página única em JavaScript puro (sem build): carrega os JSONs da
   pasta data/ via fetch, renderiza as views como strings (padrão *View) e injeta
   o HTML via defineHTML() — a ÚNICA porta de entrada de HTML no site, que
   constrói e saneia os nós com a API de DOM (js/base.js) — além de ligar os
   eventos por delegação/onclick após cada render. O tema claro/escuro é salvo
   no localStorage ("ro-atlas-theme") e aplicado como atributo data-theme em
   <html>/<body> (tokens do tema vivem no styles.css).    Os demais scripts
   ficam em js/ e são carregados antes, na ordem de index.html (handoff §3.4). */

/* Guarda de carga: os scripts compartilham o escopo global e dependem da ordem
   de carga de index.html. Se um arquivo faltar (ou mudar de lugar), o sintoma
   clássico seria um erro distante e silencioso na hora do uso. Aqui ele fica
   VISÍVEL já na inicialização, com o arquivo culpado no aviso. Cada função é
   referenciada diretamente; se o arquivo correspondente não carregou, o
   acessor lança ReferenceError e cai no catch mostrando o nome do script. */
const ARQUIVOS_DA_CARGA = [
    ["base", () => [$, $$, esc, itemLink, caixaErroHtml, seguro, defineHTML, el, fmt, debounce]],
    ["ui", () => [setTheme, setMenu, aplicarBuscaGlobal]],
    ["dados", () => [loadData, resolverColunas]],
    ["tabelas", () => [renderDataTable, renderReformTable, tableView]],
    ["diarias", () => [diariasView, bindDiariasEstoque]],
    ["calculadoras", () => [calcView, calcPanel, bindCalc]],
    ["reciclagem", () => [recycleView]],
    ["refino-grau", () => [upgradesView, bindUpgrades]],
    ["reforma", () => [reformView]],
    ["guia", () => [guideView, richText, naviBtn]],
    ["telas", () => [setView, render, bindContent]],
];

function cargaFaltando() {
    return ARQUIVOS_DA_CARGA.map(([arquivo, pegar]) => {
        try {
            return pegar().every((f) => typeof f === "function") ? null : arquivo;
        } catch {
            return arquivo; // ReferenceError — o arquivo (ou um dos globais) não existe
        }
    }).filter(Boolean);
}

/* Mostra o erro de carga com DOM puro: não depende de nenhum outro script — nem do base.js,
   que pode ser justamente o arquivo que faltou. */
function mostrarErroDeCarga(mensagem) {
    const alvo = document.querySelector("#content");
    if (!alvo) return;
    const caixa = document.createElement("div");
    caixa.className = "error-box";
    const titulo = document.createElement("b");
    titulo.textContent = "Não consegui carregar a biblioteca.";
    const pastaDados = document.createElement("code");
    pastaDados.textContent = "data/";
    caixa.append(
        titulo,
        document.createElement("br"),
        mensagem,
        document.createElement("br"),
        "Abra o site por um servidor local ou publique a pasta inteira no GitHub Pages; os arquivos de dados ",
        "precisam ficar ao lado do site em ",
        pastaDados,
        "."
    );
    alvo.replaceChildren(caixa);
}

// A conferência vem ANTES de loadData(): se base.js ou dados.js faltarem, é aqui que aparece o aviso.
const faltando = cargaFaltando();
if (faltando.length) {
    mostrarErroDeCarga(
        `Script(s) ausente(s) ou fora da ordem de index.html (handoff.md §3.4): ${faltando.join(", ")}.`
    );
} else {
    loadData()
        .then(() => setView("inicio"))
        .catch((err) => mostrarErroDeCarga(err.message));
}
