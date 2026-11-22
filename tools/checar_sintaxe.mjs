#!/usr/bin/env node
/**
 * Confere os scripts carregados pelo index.html:
 *  - sintaxe de cada um (node --check) — erro derruba a CI;
 *  - nomes declarados no topo de algum script e nunca usados em nenhum outro lugar
 *    (o ESLint só vê um arquivo por vez) — apenas AVISO.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import * as espree from "espree";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(path.join(raiz, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script\b[^>]*\ssrc="([^"?]+)/g)]
    .map((m) => m[1])
    .filter((s) => !/^(?:[a-z]+:)?\/\//i.test(s));
let falhou = false;
for (const s of scripts) {
    const r = spawnSync(process.execPath, ["--check", path.join(raiz, s)], { encoding: "utf8" });
    if (r.status !== 0) {
        falhou = true;
        console.error(`✖ ${s}\n${r.stderr}`);
    }
}
if (falhou) process.exit(1);
console.log(`✔ Sintaxe OK em ${scripts.length} script(s).`);

// --- o guarda de carga do app.js (ARQUIVOS_DA_CARGA) precisa listar todo js/*.js do index.html
const appJs = readFileSync(path.join(raiz, "app.js"), "utf8");
const noGuarda = new Set([...appJs.matchAll(/\[\s*"([a-z0-9-]+)",\s*\(\)\s*=>/g)].map((m) => m[1]));
const noIndex = new Set(scripts.filter((s) => s.startsWith("js/")).map((s) => path.basename(s, ".js")));
const faltamNoGuarda = [...noIndex].filter((n) => !noGuarda.has(n));
const sobramNoGuarda = [...noGuarda].filter((n) => !noIndex.has(n));
if (faltamNoGuarda.length || sobramNoGuarda.length) {
    if (faltamNoGuarda.length)
        console.error(
            `✖ index.html carrega js/${faltamNoGuarda.join(", js/")}.js, mas ARQUIVOS_DA_CARGA (app.js) não lista: ${faltamNoGuarda.join(", ")}`
        );
    if (sobramNoGuarda.length)
        console.error(`✖ ARQUIVOS_DA_CARGA (app.js) lista ${sobramNoGuarda.join(", ")}, que não está no index.html`);
    process.exit(1);
}
console.log(`✔ Guarda de carga cobre os ${noIndex.size} scripts de js/.`);

// --- nomes de topo sem uso
const analisar = (s) =>
    espree.parse(readFileSync(path.join(raiz, s), "utf8"), { ecmaVersion: 2022, sourceType: "script" });
const declarados = new Map();
const arvores = scripts.map((s) => [s, analisar(s)]);
for (const [arq, ast] of arvores)
    for (const n of ast.body) {
        if (n.type === "FunctionDeclaration") declarados.set(n.id.name, { arq, id: n.id });
        else if (n.type === "VariableDeclaration")
            for (const d of n.declarations)
                if (d.id.type === "Identifier") declarados.set(d.id.name, { arq, id: d.id });
    }
const usados = new Set();
const visitar = (x, pai) => {
    if (!x || typeof x.type !== "string") return;
    const ehPropriedade =
        (pai?.type === "MemberExpression" && pai.property === x && !pai.computed) ||
        (pai?.type === "Property" && pai.key === x && !pai.computed && !pai.shorthand);
    if (x.type === "Identifier" && declarados.has(x.name) && declarados.get(x.name).id !== x && !ehPropriedade)
        usados.add(x.name);
    for (const k of Object.keys(x)) {
        const c = x[k];
        if (k === "type") continue;
        if (Array.isArray(c)) c.forEach((y) => visitar(y, x));
        else if (c && typeof c.type === "string") visitar(c, x);
    }
};
arvores.forEach(([, ast]) => visitar(ast, null));
const mortos = [...declarados].filter(([n]) => !usados.has(n));
if (mortos.length) {
    console.warn(`⚠ ${mortos.length} nome(s) declarado(s) no topo e nunca usado(s) (código morto?):`);
    mortos.forEach(([n, d]) => console.warn(`  ${n}  (${d.arq})`));
}
