/**
 * Abre o site (index.html + scripts) num DOM simulado (jsdom) para testes e para o snapshot.
 * Os scripts rodam na ordem do index.html, no mesmo escopo global, como no navegador.
 *
 * Opções:
 *   raiz            pasta do projeto (padrão: a raiz deste repositório)
 *   semScripts      lista de scripts do index.html a NÃO carregar (simula arquivo faltando)
 *   clipboard       "ok" (padrão), "falha" (writeText rejeita) ou "ausente" (sem navigator.clipboard)
 *   acelerarTempo   divisor para setTimeout (ex.: 20 faz 2 s virarem 100 ms)
 *   aguardarCarga   se true (padrão), espera a tela inicial ou uma caixa de erro aparecer
 */
import { JSDOM, VirtualConsole } from "jsdom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
export const RAIZ_PADRAO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function abrirSite({
    raiz = RAIZ_PADRAO,
    semScripts = [],
    clipboard = "ok",
    acelerarTempo = 1,
    aguardarCarga = true,
} = {}) {
    const logs = [];
    const vc = new VirtualConsole();
    vc.on("jsdomError", (e) => logs.push("jsdomError: " + (e.detail?.message || e.message)));
    vc.on("error", (...a) => logs.push("console.error: " + a.map(String).join(" ").slice(0, 300)));
    vc.on("warn", (...a) => logs.push("console.warn: " + a.map(String).join(" ").slice(0, 300)));

    const html = readFileSync(path.join(raiz, "index.html"), "utf8");
    const scripts = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"[^>]*>/g)]
        .map((m) => m[1].split("?")[0])
        .filter((s) => !semScripts.includes(s));
    const dom = new JSDOM(html.replace(/<script[^>]*\ssrc=[^>]*><\/script>/g, ""), {
        url: "http://localhost/",
        runScripts: "outside-only",
        pretendToBeVisual: true,
        virtualConsole: vc,
        beforeParse(w) {
            w.fetch = async (p) => {
                try {
                    const txt = readFileSync(path.join(raiz, String(p).split("?")[0]), "utf8");
                    return { ok: true, status: 200, text: async () => txt, json: async () => JSON.parse(txt) };
                } catch {
                    return { ok: false, status: 404, text: async () => "", json: async () => ({}) };
                }
            };
            w.matchMedia ??= () => ({
                matches: false,
                addListener() {},
                removeListener() {},
                addEventListener() {},
                removeEventListener() {},
            });
            w.HTMLElement.prototype.scrollIntoView = () => {};
            w.scrollTo = () => {};
            if (clipboard === "ok")
                Object.defineProperty(w.navigator, "clipboard", {
                    value: { writeText: async () => {} },
                    configurable: true,
                });
            if (clipboard === "falha")
                Object.defineProperty(w.navigator, "clipboard", {
                    value: { writeText: () => Promise.reject(new Error("negado")) },
                    configurable: true,
                });
            if (acelerarTempo > 1) {
                const original = w.setTimeout.bind(w);
                w.setTimeout = (fn, ms, ...resto) => original(fn, (ms || 0) / acelerarTempo, ...resto);
            }
        },
    });
    const w = dom.window;
    const contexto = dom.getInternalVMContext();
    // vm.Script (e não eval) para que const/let de topo continuem visíveis entre scripts
    const ev = (codigo) => new vm.Script(codigo).runInContext(contexto);
    const excecoes = [];
    for (const s of scripts) {
        try {
            ev(readFileSync(path.join(raiz, s), "utf8"));
        } catch (e) {
            excecoes.push(`${s}: ${e.message}`);
        }
    }
    if (aguardarCarga) {
        const pronto = () => {
            const c = w.document.querySelector("#content");
            return !!c && (c.querySelector(".error-box") || c.innerHTML.length > 500);
        };
        for (let i = 0; i < 150 && !pronto(); i++) await esperar(20);
        await esperar(100);
    }
    return { w, ev, logs, excecoes, scripts, fechar: () => w.close() };
}
