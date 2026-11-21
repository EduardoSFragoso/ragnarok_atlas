/* ===== Ragnarök Atlas — js/ui.js =====
   Interface: busca global, menu móvel e tema claro/escuro. */

function aplicarBuscaGlobal() {
    if (["equipamentos", "encantamentos", "custos"].includes(currentView)) {
        const i = $("#tableSearch");
        if (i) {
            i.value = globalTerm;
            renderDataTable(currentView);
        }
    } else if (currentView === "reformas") {
        const i = $("#tableSearch");
        if (i) {
            i.value = globalTerm;
            renderReformTable();
        }
    } else if (globalTerm.trim()) {
        if (currentView !== "equipamentos") setView("equipamentos");
        const i = $("#tableSearch");
        if (i) {
            i.value = globalTerm;
            renderDataTable("equipamentos");
        }
    }
}

const buscarComDebounce = debounce(aplicarBuscaGlobal, 150);

$("#globalSearch").addEventListener("input", (e) => {
    globalTerm = e.target.value;
    buscarComDebounce();
});

/* Gaveta do menu no celular: abre com o botão e fecha por scrim, clique externo ou Esc. */
function setMenu(abrir) {
    const gaveta = $(".sidebar"),
        scrim = $("#mobileScrim");
    const aberto = typeof abrir === "boolean" ? abrir : !gaveta.classList.contains("open");
    gaveta.classList.toggle("open", aberto);
    document.body.classList.toggle("menu-aberto", aberto);
    if (scrim) scrim.hidden = !aberto;
    $("#menuToggle")?.setAttribute("aria-expanded", aberto ? "true" : "false");
    $("#menuToggle")?.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
}

$("#menuToggle").addEventListener("click", () => setMenu());

$("#mobileScrim")?.addEventListener("click", () => setMenu(false));

document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
        e.preventDefault();
        $("#globalSearch").focus();
    }
    if (e.key === "Escape") setMenu(false);
});

/* Tema: aplica o atributo em <html> e <body> e atualiza a cor de título do navegador. */
function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
    const dark = theme === "dark";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#101923" : "#f4f6f7");
    $("#themeToggle").replaceChildren(dark ? "☼ " : "☾ ", el("span", {}, dark ? "Modo claro" : "Modo escuro"));
    $("#themeToggle").setAttribute("aria-label", dark ? "Ativar modo claro" : "Ativar modo escuro");
    $("#themeToggle").title = dark ? "Ativar modo claro" : "Ativar modo escuro";
    try {
        localStorage.setItem("ro-atlas-theme", theme);
    } catch {}
}

$("#themeToggle").addEventListener("click", () => setTheme(document.body.dataset.theme === "dark" ? "light" : "dark"));

try {
    const savedTheme = localStorage.getItem("ro-atlas-theme");
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    else setTheme("light");
} catch {
    setTheme("light");
}
