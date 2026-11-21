// Configuração do ESLint (formato flat, ESLint 9+)
// Regras voltadas ao site estático sem build: os scripts (app.js e js/*.js) rodam direto no
// browser, como scripts comuns carregados em ordem pelo index.html e compartilhando o escopo
// global. Por isso os nomes declarados em cada arquivo são "globais" para os outros arquivos.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as espree from "espree";

const raiz = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.join(raiz, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script\b[^>]*\ssrc="([^"?]+)/g)]
    .map((m) => m[1])
    .filter((s) => !/^(?:[a-z]+:)?\/\//i.test(s));

/** Nomes declarados no topo de cada script (funções, const/let/var). */
function declaradosNoTopo(arquivo) {
    const ast = espree.parse(readFileSync(path.join(raiz, arquivo), "utf8"), {
        ecmaVersion: 2022,
        sourceType: "script",
    });
    const nomes = new Set();
    for (const n of ast.body) {
        if (n.type === "FunctionDeclaration") nomes.add(n.id.name);
        else if (n.type === "VariableDeclaration")
            for (const d of n.declarations) if (d.id.type === "Identifier") nomes.add(d.id.name);
    }
    return nomes;
}
const porArquivo = new Map(scripts.map((s) => [s, declaradosNoTopo(s)]));

const navegador = {
    window: "readonly",
    document: "readonly",
    localStorage: "readonly",
    navigator: "readonly",
    console: "readonly",
    fetch: "readonly",
    Uint8Array: "readonly",
    TextEncoder: "readonly",
    setTimeout: "readonly",
    Promise: "readonly",
    URLSearchParams: "readonly",
    Node: "readonly",
};

export default scripts.map((arquivo) => ({
    files: [arquivo],
    languageOptions: {
        ecmaVersion: 2022,
        sourceType: "script",
        globals: {
            ...navegador,
            // tudo que OUTROS scripts declaram no topo (os do próprio arquivo o ESLint já conhece)
            ...Object.fromEntries(
                [...porArquivo]
                    .filter(([s]) => s !== arquivo)
                    .flatMap(([, nomes]) => [...nomes].map((n) => [n, "writable"]))
            ),
        },
    },
    rules: {
        // "local": função/variável de topo pode ser usada só em outro script; o que é local ao arquivo ainda é checado
        "no-unused-vars": [
            "error",
            { vars: "local", args: "none", caughtErrors: "all", caughtErrorsIgnorePattern: "^_" },
        ],
        "no-undef": "error",
        "no-redeclare": "error",
        "no-var": "error",
        "prefer-const": "warn",
        eqeqeq: ["warn", "smart"],
        "no-throw-literal": "error",
        "no-cond-assign": ["error", "except-parens"],
        "no-async-promise-executor": "error",
        "require-atomic-updates": "warn",
        // Injeção de HTML só via defineHTML (js/base.js): em qualquer outro script,
        // atribuir .innerHTML vira erro de lint, não um vetor de XSS esquecido.
        ...(arquivo !== "js/base.js" && {
            "no-restricted-syntax": [
                "error",
                {
                    selector: "AssignmentExpression[left.computed=false][left.property.name='innerHTML']",
                    message: "Use defineHTML(alvo, html) — a injeção de HTML do site é centralizada em js/base.js.",
                },
            ],
        }),
    },
}));
