#!/usr/bin/env node
/**
 * Snapshot de renderização: roda o site (index.html + scripts) num DOM simulado
 * (jsdom) e captura o HTML de centenas de estados da interface: todas as telas,
 * cada episódio e aba do guia, filtros, buscas, botões e todas as opções das
 * calculadoras. Serve como rede de segurança para refatorações: se o HTML de
 * algum estado mudar, o comando mostra qual.
 *
 * Uso:
 *   npm run snapshot                  gera .snapshot/atual.json; se existir
 *                                     .snapshot/base.json, compara com ele
 *   npm run snapshot -- --base        grava o resultado também como base
 *   npm run snapshot -- --verificar   só confere erros (caixa de erro na tela,
 *                                     console.error/warn); não grava arquivos (CI)
 *   npm run snapshot -- <pasta>       usa outra pasta de projeto
 *
 * Fluxo para refatorar: `npm run snapshot -- --base` ANTES de mexer no código e
 * `npm run snapshot` DEPOIS. Saída 1 = algum estado mudou ou houve erro.
 * Se você mudou conteúdo (dados novos) de propósito, regrave a base.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { abrirSite } from "./_site_jsdom.mjs";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const pasta = args.find((a) => !a.startsWith("--"));
const raiz = path.resolve(pasta ?? path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const dirSnap = path.join(raiz, ".snapshot");
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/* ===== Captura ===== */
async function capturar() {
    const { w, ev, logs } = await abrirSite({ raiz, clipboard: "ausente", aguardarCarga: false });
    const $ = (s) => w.document.querySelector(s);
    const $$ = (s) => [...w.document.querySelectorAll(s)];
    const disparar = (el, tipo) => el.dispatchEvent(new w.Event(tipo, { bubbles: true }));
    const estados = {};
    const guardar = (nome, sel = "#content") => {
        estados[nome] = ($(sel) ?? $("#content")).innerHTML;
    };

    for (
        let i = 0;
        i < 100 && !ev("typeof db.guia !== 'undefined' && !!document.querySelector('#content').innerHTML");
        i++
    )
        await esperar(20);
    await esperar(100);

    // 1) dados em memória
    for (const k of ev("ROW_JSON_KEYS")) estados["db:" + k] = JSON.stringify(ev(`db[${JSON.stringify(k)}]`));
    estados["db:ICON_IDS"] = JSON.stringify(Object.entries(ev("ICON_IDS")).sort());

    // 2) telas padrão
    const telas = [
        "inicio",
        "guia",
        "diarias",
        "equipamentos",
        "encantamentos",
        "custos",
        "reformas",
        "grau",
        "reciclagem",
        "calculadoras",
        "fontes",
    ];
    for (const v of telas) {
        ev(`setView(${JSON.stringify(v)})`);
        await esperar(30);
        guardar("view:" + v);
    }

    // 3) guia: cada episódio x cada aba
    ev("setView('guia')");
    const eps = ev("guideEps().map(e => e.id)");
    const abas = $$("[data-guide-tab]").map((b) => b.dataset.guideTab);
    for (const id of eps)
        for (const aba of abas) {
            ev(`activeEpid=${JSON.stringify(id)}; guideTab=${JSON.stringify(aba)}; render()`);
            guardar(`guia:${id}:${aba}`);
        }
    ev("activeEpid=null; guideTab='principal'");

    // 4) diárias: cada episódio x bônus
    ev("setView('diarias')");
    for (const v of $$("#diaSelect option").map((o) => o.value))
        for (const b of [false, true]) {
            ev(`activeDiaEp=${JSON.stringify(v)}; diaBonus=${b}; render()`);
            guardar(`diarias:${v}:${b}`);
        }
    ev("activeDiaEp=null; diaBonus=false");

    // 5) tabelas: filtro de episódio e busca
    for (const v of ["equipamentos", "encantamentos", "custos"]) {
        ev(`setView(${JSON.stringify(v)})`);
        for (const o of $$("#episodeFilter option").map((x) => x.value)) {
            $("#episodeFilter").value = o;
            disparar($("#episodeFilter"), "change");
            guardar(`tab:${v}:ep:${o}`, "#tableMount");
        }
        $("#episodeFilter").value = "";
        for (const termo of ["flor", "invernal", "3", "zzzz"]) {
            $("#tableSearch").value = termo;
            disparar($("#tableSearch"), "input");
            await esperar(200);
            guardar(`tab:${v}:busca:${termo}`, "#tableMount");
        }
        ev("globalTerm=''");
    }
    ev("setView('reformas')");
    for (const termo of ["fides", "adaga", "zzzz"]) {
        const g = $("#globalSearch");
        g.value = termo;
        disparar(g, "input");
        await esperar(250);
        guardar(`reformas:busca:${termo}`);
    }
    ev("globalTerm=''");

    // 6) botões com data-* nas telas interativas (modos, estoque, reciclagem...)
    const botoes = () =>
        $$("#content button").filter(
            (b) =>
                [...b.attributes].some((a) => a.name.startsWith("data-")) &&
                !b.hasAttribute("data-copy-navi") &&
                !b.hasAttribute("data-calc") &&
                !b.hasAttribute("data-go")
        );
    for (const v of ["grau", "reciclagem", "reformas", "diarias", "guia", "inicio"]) {
        ev(`setView(${JSON.stringify(v)})`);
        const total = botoes().length;
        estados[`n-botoes:${v}`] = String(total);
        for (let i = 0; i < Math.min(total, 40); i++) {
            ev(`setView(${JSON.stringify(v)})`);
            const b = botoes()[i];
            if (!b) break;
            b.click();
            await esperar(10);
            guardar(`click:${v}:${i}:${b.textContent.trim().slice(0, 25)}`);
        }
    }

    // 7) calculadoras: cada card e cada opção de cada select
    ev("setView('calculadoras')");
    for (const id of $$("[data-calc]").map((b) => b.dataset.calc)) {
        ev("setView('calculadoras')");
        const card = () => $(`[data-calc="${id}"]`);
        card().click();
        guardar(`calc:${id}`, "#calcMount");
        const nSelects = $$("#calcMount select").length;
        for (let si = 0; si < nSelects; si++) {
            const opcoes = [...$$("#calcMount select")[si].options].map((o) => o.value);
            for (const ov of opcoes.slice(0, 80)) {
                const s = $$("#calcMount select")[si];
                if (!s) break;
                s.value = ov;
                disparar(s, "change");
                guardar(`calc:${id}:sel${si}:${ov.slice(0, 30)}`, "#calcMount");
            }
            card().click();
        }
    }

    // 8) busca global em cada tela
    for (const v of telas) {
        ev(`setView(${JSON.stringify(v)})`);
        const g = $("#globalSearch");
        if (g) {
            g.value = "invernal";
            disparar(g, "input");
            await esperar(250);
            guardar(`global:${v}`);
            g.value = "";
            disparar(g, "input");
            await esperar(200);
        }
        ev("globalTerm=''");
    }
    w.close();
    return { estados, logs };
}

/* ===== Comparação ===== */
function comparar(base, atual) {
    const ka = Object.keys(base);
    const kb = Object.keys(atual);
    const soBase = ka.filter((k) => !(k in atual));
    const soAtual = kb.filter((k) => !(k in base));
    const diferentes = ka.filter((k) => k in atual && base[k] !== atual[k]);
    return { soBase, soAtual, diferentes };
}
function mostrarDiferenca(nome, a, b) {
    let i = 0;
    while (i < a.length && a[i] === b[i]) i++;
    console.error(
        `  ≠ ${nome}\n      base : …${a.slice(Math.max(0, i - 50), i + 90)}\n      atual: …${b.slice(Math.max(0, i - 50), i + 90)}`
    );
}

/* ===== Principal ===== */
const { estados, logs } = await capturar();
const comErro = Object.entries(estados)
    .filter(([k, h]) => !k.startsWith("db:") && h.includes('class="error-box"'))
    .map(([k]) => k);
let falhou = false;
console.log(`Estados capturados: ${Object.keys(estados).length}`);
if (logs.length) {
    falhou = true;
    console.error(`✖ ${logs.length} mensagem(ns) de erro/aviso no console:`);
    [...new Set(logs)].slice(0, 8).forEach((l) => console.error("  " + l));
}
if (comErro.length) {
    falhou = true;
    console.error(`✖ ${comErro.length} estado(s) com caixa de erro na tela: ${comErro.slice(0, 8).join(", ")}`);
}

if (!flags.has("--verificar")) {
    mkdirSync(dirSnap, { recursive: true });
    const arqAtual = path.join(dirSnap, "atual.json");
    const arqBase = path.join(dirSnap, "base.json");
    writeFileSync(arqAtual, JSON.stringify({ estados, logs }));
    if (flags.has("--base")) {
        writeFileSync(arqBase, JSON.stringify({ estados, logs }));
        console.log("Base gravada em .snapshot/base.json");
    } else if (existsSync(arqBase)) {
        const base = JSON.parse(readFileSync(arqBase, "utf8")).estados;
        const { soBase, soAtual, diferentes } = comparar(base, estados);
        if (!diferentes.length && !soBase.length && !soAtual.length) {
            console.log("✔ Idêntico à base: nenhum estado mudou.");
        } else {
            falhou = true;
            console.error(
                `✖ Diferente da base: ${diferentes.length} estado(s) mudaram, ${soBase.length} sumiram, ${soAtual.length} novos.`
            );
            diferentes.slice(0, 5).forEach((k) => mostrarDiferenca(k, base[k], estados[k]));
            soBase.slice(0, 5).forEach((k) => console.error(`  só na base: ${k}`));
            soAtual.slice(0, 5).forEach((k) => console.error(`  só no atual: ${k}`));
            console.error(
                "Se a mudança foi proposital (dados ou conteúdo novos), regrave a base: npm run snapshot -- --base"
            );
        }
    } else {
        console.log("Sem base para comparar. Para criar uma: npm run snapshot -- --base");
    }
}
if (!falhou && flags.has("--verificar")) console.log("✔ Nenhum erro de renderização.");
process.exit(falhou ? 1 : 0);
