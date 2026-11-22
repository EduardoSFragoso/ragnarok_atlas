/* Testes do site no jsdom: botão de copiar /navi, sanitizador de HTML e guarda de carga.
   Rodam com `npm test` (node:test). Para o jsdom: tools/_site_jsdom.mjs. */
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { abrirSite, esperar } from "./_site_jsdom.mjs";

const abertos = [];
const abrir = async (opcoes) => {
    const s = await abrirSite(opcoes);
    abertos.push(s);
    return s;
};
after(() => abertos.forEach((s) => s.fechar()));

describe("botão de copiar /navi", () => {
    const preparar = async (opcoes) => {
        const s = await abrir({ acelerarTempo: 20, ...opcoes }); // 2 s viram 100 ms
        s.ev("setView('guia')");
        await esperar(50);
        const btn = () => s.w.document.querySelector("[data-copy-navi]");
        return { s, btn, original: btn().textContent };
    };

    test("1 clique: mostra 'Copiado ✓' e depois restaura o comando", async () => {
        const { btn, original } = await preparar();
        btn().click();
        await esperar(20);
        assert.equal(btn().textContent, "Copiado ✓");
        assert.ok(btn().classList.contains("copied"));
        await esperar(250);
        assert.equal(btn().textContent, original);
        assert.ok(!btn().classList.contains("copied"));
    });

    test("duplo clique rápido não deixa o chip preso em 'Copiado ✓' (bug corrigido)", async () => {
        const { btn, original } = await preparar();
        btn().click();
        await esperar(20);
        btn().click(); // 2º clique ainda dentro da janela de feedback
        await esperar(300);
        assert.equal(btn().textContent, original);
        assert.ok(!btn().classList.contains("copied"));
        assert.equal(btn().dataset.copiando, undefined);
    });

    test("depois de restaurar, copiar de novo funciona", async () => {
        const { btn, original } = await preparar();
        btn().click();
        await esperar(300);
        btn().click();
        await esperar(20);
        assert.equal(btn().textContent, "Copiado ✓");
        await esperar(300);
        assert.equal(btn().textContent, original);
    });

    for (const modo of ["falha", "ausente"]) {
        test(`clipboard ${modo}: avisa no chip e restaura o título`, async () => {
            const { btn, original } = await preparar({ clipboard: modo });
            const titulo = btn().title;
            btn().click();
            await esperar(30);
            assert.ok(btn().classList.contains("copy-fail"));
            assert.match(btn().title, /Não foi possível copiar/);
            assert.equal(btn().textContent, original); // o comando continua visível
            await esperar(300);
            assert.ok(!btn().classList.contains("copy-fail"));
            assert.equal(btn().title, titulo);
        });
    }
});

describe("sanitizador de HTML (defineHTML)", async () => {
    const s = await abrir({ aguardarCarga: false });
    const defineHTML = s.ev("defineHTML");
    const sanear = (html) => {
        const alvo = s.w.document.createElement("div");
        s.w.document.body.append(alvo);
        defineHTML(alvo, html);
        return alvo;
    };
    const atributos = (alvo) =>
        [...alvo.querySelectorAll("*")].flatMap((el) => [...el.attributes].map((a) => [a.name, a.value]));
    const perigoso = (alvo) =>
        atributos(alvo).some(
            ([n, v]) =>
                n.startsWith("on") ||
                (/(^|:)(href|src|action|formaction|data)$/.test(n) &&
                    /^[\s\u0000-\u001f]*j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/i.test(v.replace(/[\t\n\r]/g, "")))
        );

    const BLOQUEADOS = {
        "<script>": `<b>a</b><script>alert(1)</script>`,
        "<iframe>": `<iframe src="https://evil.example"></iframe>`,
        "<object>": `<object data="x.swf"></object>`,
        "<embed>": `<embed src="x.swf">`,
        "<form>": `<form action="/x"><input name="a"></form>`,
        "<meta>": `<meta http-equiv="refresh" content="0;url=//evil.example">`,
        "<link>": `<link rel="stylesheet" href="//evil.example/x.css">`,
        "<base>": `<base href="//evil.example/">`,
        "<style>": `<style>@import url(//evil.example/x.css);</style>`,
        "<template>": `<template><img src=x></template>`,
        "<math>": `<math><mi>x</mi></math>`,
        "svg <use>": `<svg><use href="//evil.example/x.svg#a"/></svg>`,
        "svg <set>": `<svg><a><set attributeName="href" to="javascript:alert(1)"/><text y="9">x</text></a></svg>`,
        "svg <animate>": `<svg><a><animate attributeName="href" values="javascript:alert(1)"/></a></svg>`,
        "svg <foreignObject>": `<svg><foreignObject><div>x</div></foreignObject></svg>`,
    };
    for (const [nome, html] of Object.entries(BLOQUEADOS)) {
        test(`remove ${nome}`, () => {
            const alvo = sanear(html);
            const tag = nome.replace(/^svg /, "").replace(/[<>]/g, "").toLowerCase();
            assert.equal(
                [...alvo.querySelectorAll("*")].some((e) => e.tagName.toLowerCase() === tag),
                false,
                alvo.innerHTML
            );
        });
    }

    const URLS_PERIGOSAS = {
        "javascript: simples": `<a href="javascript:alert(1)">x</a>`,
        "JaVaScRiPt: com maiúsculas": `<a href="JaVaScRiPt:alert(1)">x</a>`,
        "espaço no início": `<a href="   javascript:alert(1)">x</a>`,
        "TAB dentro do esquema": `<a href="java&#9;script:alert(1)">x</a>`,
        "quebra de linha dentro do esquema": `<a href="java&#10;script:alert(1)">x</a>`,
        "CR dentro do esquema": `<a href="java&#13;script:alert(1)">x</a>`,
        "caractere de controle no início": `<a href="&#1;javascript:alert(1)">x</a>`,
        "vbscript:": `<a href="vbscript:msgbox(1)">x</a>`,
        "data: em href": `<a href="data:text/html,<script>alert(1)</script>">x</a>`,
        "data: em src de img": `<img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=">`,
        "svg xlink:href": `<svg><a xlink:href="javascript:alert(1)"><text y="9">x</text></a></svg>`,
        formaction: `<button formaction="javascript:alert(1)">x</button>`,
        "srcset com javascript:": `<img srcset="ok.png 1x, javascript:alert(1) 2x">`,
        poster: `<video poster="javascript:alert(1)"></video>`,
    };
    for (const [nome, html] of Object.entries(URLS_PERIGOSAS)) {
        test(`neutraliza URL perigosa: ${nome}`, () => {
            const alvo = sanear(html);
            assert.equal(perigoso(alvo), false, alvo.innerHTML);
            const el = alvo.querySelector("a, img, button, video");
            for (const atr of ["href", "src", "srcset", "poster", "formaction", "xlink:href"])
                assert.equal(el?.getAttribute(atr), null, `${atr} deveria ter sido removido: ${alvo.innerHTML}`);
        });
    }

    test("remove TODOS os atributos on*, inclusive onerror em <img>", () => {
        const alvo = sanear(
            `<img src="a.png" onerror="alert(1)" onload="alert(2)"><b onclick="x()" onmouseover="y()">t</b><details open ontoggle="z()">d</details><svg onload="w()"></svg>`
        );
        assert.deepEqual(
            atributos(alvo).filter(([n]) => n.startsWith("on")),
            []
        );
    });

    test("preserva o conteúdo legítimo do site", () => {
        const alvo = sanear(
            `<a href="https://exemplo.com/x?a=1" target="_blank" rel="noopener noreferrer">ext</a>` +
                `<a href="#ancora">ancora</a><a href="mailto:a@b.c">mail</a><a href="pagina.html">rel</a>` +
                `<img class="item-icon" src="assets/icons/123.png" alt="" loading="lazy">` +
                `<img srcset="a.png 1x, b.png 2x" alt="">` +
                `<span class="aviso-critico">!</span><button type="button" data-copy-navi="/navi a 1/2" title="t"><code>/navi a 1/2</code></button>` +
                `<table><tr><td colspan="2" style="color:red">c</td></tr></table>`
        );
        assert.equal(alvo.querySelectorAll("a[href]").length, 4);
        assert.equal(alvo.querySelector("a[target=_blank]").getAttribute("rel"), "noopener noreferrer");
        assert.equal(alvo.querySelector("img.item-icon").getAttribute("src"), "assets/icons/123.png");
        assert.equal(alvo.querySelectorAll("img[srcset]").length, 1);
        assert.equal(alvo.querySelector("button").dataset.copyNavi, "/navi a 1/2");
        assert.equal(alvo.querySelector("td").getAttribute("style"), "color:red");
        assert.equal(alvo.querySelector(".aviso-critico").textContent, "!");
    });

    test("devolve o alvo, aceita null/undefined e substitui o conteúdo anterior", () => {
        const alvo = s.w.document.createElement("div");
        alvo.innerHTML = "<p>velho</p>";
        assert.equal(defineHTML(alvo, "<b>novo</b>"), alvo);
        assert.equal(alvo.innerHTML, "<b>novo</b>");
        defineHTML(alvo, null);
        assert.equal(alvo.innerHTML, "");
        defineHTML(alvo, undefined);
        assert.equal(alvo.innerHTML, "");
    });

    test("ícone de item ausente é removido por ouvinte de 'error' (sem onerror inline)", () => {
        const alvo = sanear(
            `<img class="item-icon" src="assets/icons/0.png" alt=""><img class="outra" src="x.png" alt="">`
        );
        for (const img of alvo.querySelectorAll("img")) img.dispatchEvent(new s.w.Event("error"));
        assert.equal(alvo.querySelectorAll("img.item-icon").length, 0);
        assert.equal(alvo.querySelectorAll("img.outra").length, 1);
    });

    test("itemIcon() gera <img> sem onerror", () => {
        s.ev('ICON_IDS["Item de Teste"] = "4242"');
        const html = s.ev('itemIcon("Item de Teste")');
        assert.match(html, /class="item-icon"/);
        assert.doesNotMatch(html, /onerror/i);
    });
});

describe("guarda de carga (app.js)", () => {
    test("site completo: sem caixa de erro e com conteúdo", async () => {
        const s = await abrir();
        assert.equal(s.w.document.querySelector("#content .error-box"), null);
        assert.ok(s.w.document.querySelector("#content").innerHTML.length > 500);
        assert.deepEqual(s.excecoes, []);
    });

    for (const arquivo of ["base", "dados", "guia", "tabelas", "telas", "ui", "calculadoras"]) {
        test(`sem js/${arquivo}.js: mostra caixa de erro apontando "${arquivo}"`, async () => {
            const s = await abrir({ semScripts: [`js/${arquivo}.js`] });
            const caixa = s.w.document.querySelector("#content .error-box");
            assert.ok(caixa, `nenhuma caixa de erro com js/${arquivo}.js ausente`);
            assert.match(caixa.textContent, new RegExp(`${arquivo}`));
            assert.match(caixa.textContent, /handoff\.md §3\.4/);
        });
    }

    test("o texto do erro entra como texto (não interpreta HTML)", async () => {
        const s = await abrir({ semScripts: ["js/guia.js"] });
        const caixa = s.w.document.querySelector("#content .error-box");
        assert.equal(caixa.querySelectorAll("script, img, a").length, 0);
        assert.equal(caixa.querySelector("code").textContent, "data/");
    });
});
