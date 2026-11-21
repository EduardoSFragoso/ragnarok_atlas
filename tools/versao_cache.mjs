#!/usr/bin/env node
/**
 * Versão de cache automática: grava em index.html um `?v=<hash>` calculado pelo
 * conteúdo de cada script/CSS local, para o navegador nunca usar um arquivo
 * antigo depois de uma alteração (e sem precisar lembrar de incrementar).
 *
 * Uso:
 *   npm run versao              atualiza os `?v=` do index.html
 *   npm run versao:verificar    só confere (a CI usa); sai com 1 se algum estiver velho
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arquivoHtml = path.join(raiz, "index.html");
const verificar = process.argv.includes("--verificar");

// hash do conteúdo com fim de linha normalizado (igual em Windows e Linux)
const hashDe = (arquivo) =>
    createHash("sha1")
        .update(readFileSync(path.join(raiz, arquivo), "utf8").replace(/\r\n/g, "\n"))
        .digest("hex")
        .slice(0, 8);

const html = readFileSync(arquivoHtml, "utf8");
const desatualizados = [];
const novo = html.replace(
    /(<(?:script|link)\b[^>]*?\b(?:src|href)=")([^"?]+)(?:\?v=[^"]*)?(")/g,
    (tudo, antes, arquivo, depois) => {
        if (/^(?:[a-z]+:)?\/\//i.test(arquivo) || !/\.(?:js|css)$/.test(arquivo)) return tudo;
        if (!existsSync(path.join(raiz, arquivo))) {
            console.error(`✖ index.html referencia ${arquivo}, que não existe.`);
            process.exitCode = 1;
            return tudo;
        }
        const atualizado = `${antes}${arquivo}?v=${hashDe(arquivo)}${depois}`;
        if (atualizado !== tudo) desatualizados.push(arquivo);
        return atualizado;
    }
);

if (verificar) {
    if (desatualizados.length) {
        console.error(
            `✖ Versão de cache desatualizada em index.html para: ${desatualizados.join(", ")}\n  Rode: npm run versao`
        );
        process.exitCode = 1;
    } else if (!process.exitCode) console.log("✔ Versões de cache em dia.");
} else if (desatualizados.length) {
    writeFileSync(arquivoHtml, novo);
    console.log(`index.html atualizado (${desatualizados.length} arquivo(s)): ${desatualizados.join(", ")}`);
} else console.log("✔ Versões de cache já estavam em dia.");
