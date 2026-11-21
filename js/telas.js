/* ===== Ragnarök Atlas — js/telas.js =====
   Navegação e telas: início, fontes, render() e eventos do conteúdo. */

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
                "Reciclagem e Globos",
                "O que o Incinerador devolve pelas armas Vil Invernais e as trocas de Globos do Hoyoyo.",
            ],
            ["calculadoras", "∑", "Calculadoras", "Estime chances e resultados de criação."],
            ["fontes", "↗", "Fontes e referências", "Consulte as páginas de apoio e as observações dos dados."],
        ]
            .map(
                ([vista, icone, titulo, texto]) =>
                    `<button class="quick-card card" data-go="${vista}"><span class="quick-icon">${icone}` +
                    `</span><h3>${titulo}</h3><p>${texto}</p></button>`
            )
            .join("")}` +
        `</div>`
    );
}

function sourceView() {
    const categories = [...new Set(BROWIKI.map(([categoria]) => categoria))].sort(
        (a, b) => episodeRank(b) - episodeRank(a) || a.localeCompare(b, "pt-BR")
    );
    return (
        `<div class="page-head"><div><div class="eyebrow">CONSULTA E RASTREABILIDADE</div>` +
        `<h1 class="page-title">Fontes & referências</h1><p class="page-subtitle">Páginas consultadas como apoio ` +
        `e referências indicadas para expandir a base.</p>` +
        `</div><span class="count-pill">${BROWIKI.length + HAZY_EP.length + IROWIKI.length + 4}` +
        ` LINKS</span>` +
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
        `</article><article class="card source-card"><h3>Termos de uso do Divine</h3>` +
        `<a href="https://divine.inc/terms" ` +
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
                                `<article class="card source-card"><h3>${esc(nome)}</h3><a href="${esc(url)}` +
                                `" target="_blank" rel="noopener ` +
                                `noreferrer">Abrir página no bROWiki ↗</a>` +
                                `</article>`
                        )
                        .join("")}` +
                    `</div>`
            )
            .join("")}` +
        `<div class="section-heading"><div><h2>Hazy Forest (fonte complementar)</h2>` +
        `<p>Páginas dos episódios ` +
        `usadas nas missões diárias e nos consumos (wiki do kRO).</p>` +
        `</div></div><div class="source-grid">${HAZY_EP.map(
            ([, nome, url]) =>
                `<article class="card source-card"><h3>${esc(nome)}</h3><a href="${esc(url)}` +
                `" target="_blank" rel="noopener ` +
                `noreferrer">Abrir página no Hazy Forest ↗</a>` +
                `</article>`
        ).join("")}` +
        `</div><div class="section-heading"><div><h2>iRO Wiki (fonte complementar)</h2>` +
        `<p>Conferência dos passos ` +
        `dos episódios 19, 18, 17.2 e 17.1 e das missões diárias.</p>` +
        `</div></div><div class="source-grid">${IROWIKI.map(
            ([, nome, url]) =>
                `<article class="card source-card"><h3>${esc(nome)}</h3><a href="${esc(url)}` +
                `" target="_blank" rel="noopener ` +
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

function render() {
    const host = $("#content");
    try {
        if (currentView === "inicio") defineHTML(host, seguro(landing, "visão geral"));
        else if (currentView === "guia") defineHTML(host, seguro(guideView, "guia de episódio"));
        else if (currentView === "diarias") defineHTML(host, seguro(diariasView, "missões diárias"));
        else if (TABLES[currentView])
            defineHTML(
                host,
                seguro(() => tableView(currentView), currentView)
            );
        else if (currentView === "reformas") defineHTML(host, seguro(reformView, "reforma"));
        else if (currentView === "grau") defineHTML(host, seguro(upgradesView, "grau & refinamento"));
        else if (currentView === "reciclagem") defineHTML(host, seguro(recycleView, "reciclagem"));
        else if (currentView === "calculadoras") defineHTML(host, seguro(calcView, "calculadoras"));
        else defineHTML(host, seguro(sourceView, "fontes"));
        if (TABLES[currentView]) seguro(() => renderDataTable(currentView), `tabela ${currentView}`);
        if (currentView === "reformas") seguro(renderReformTable, "tabela reforma");
    } catch (err) {
        console.error("Erro ao renderizar:", err);
        defineHTML(host, caixaErroHtml("Erro inesperado ao montar a página.", err && err.message));
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
                defineHTML($("#calcMount"), calcPanel(b.dataset.calc));
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
