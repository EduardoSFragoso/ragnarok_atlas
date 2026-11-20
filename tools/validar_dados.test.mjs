/* Testes do validador de esquema: rodam com `npm test` (node:test, sem dependências). */
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { validar } from "./validar_dados.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporarios = [];
after(() => temporarios.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** Copia data/ para uma pasta temporária e aplica `mutar(ler, gravar)` nos JSONs. */
function copiaComMutacao(mutar) {
    const dir = mkdtempSync(path.join(tmpdir(), "atlas-"));
    temporarios.push(dir);
    cpSync(path.join(RAIZ, "data"), path.join(dir, "data"), { recursive: true });
    const ler = (f) => JSON.parse(readFileSync(path.join(dir, "data", f), "utf8"));
    const gravar = (f, d) => writeFileSync(path.join(dir, "data", f), JSON.stringify(d));
    mutar({ ler, gravar, dir });
    return dir;
}
const mensagens = (r) => r.erros.join("\n");

test("os dados atuais do repositório são válidos", () => {
    const { erros, avisos } = validar(RAIZ);
    assert.deepEqual(erros, []);
    assert.deepEqual(avisos, []);
});

test("pega campo com tipo errado no guia (caso do 'list.map is not a function')", () => {
    const dir = copiaComMutacao(({ ler, gravar }) => {
        const g = ler("guia_episodio.json");
        g[4].principal = { capitulo: "x" };
        gravar("guia_episodio.json", g);
    });
    assert.match(mensagens(validar(dir)), /guia_episodio\.json\[4\]\.principal: esperava lista, veio objeto/);
});

test("pega linha de tabela do guia com largura diferente das colunas", () => {
    const dir = copiaComMutacao(({ ler, gravar }) => {
        const g = ler("guia_episodio.json");
        const ep = g.find((e) => e.servicos);
        ep.servicos.linhas[0].push("célula extra");
        gravar("guia_episodio.json", g);
    });
    assert.match(mensagens(validar(dir)), /servicos\.linhas\[0\]: \d+ células, mas há \d+ colunas/);
});

test("aceita colunas em outra ordem em todas as linhas (o app.js lê por nome)", () => {
    const dir = copiaComMutacao(({ ler, gravar }) => {
        const t = ler("fabricar_flechas.json");
        gravar(
            "fabricar_flechas.json",
            t.map((r) => {
                const [a, b, ...resto] = Object.entries(r);
                return Object.fromEntries([b, a, ...resto]);
            })
        );
    });
    assert.deepEqual(validar(dir).erros, []);
});

test("pega coluna obrigatória que sumiu de uma tabela", () => {
    const dir = copiaComMutacao(({ ler, gravar }) => {
        const t = ler("custo_de_encantamento.json");
        t.forEach((r) => delete r.Material);
        gravar("custo_de_encantamento.json", t);
    });
    assert.match(
        mensagens(validar(dir)),
        /custo_de_encantamento\.json: coluna\(s\) obrigatória\(s\) ausente\(s\): Material/
    );
});

test("coluna nova fora do contrato vira aviso, não erro", () => {
    const dir = copiaComMutacao(({ ler, gravar }) => {
        const t = ler("fabricar_flechas.json");
        t.forEach((r) => (r["Coluna nova"] = "x"));
        gravar("fabricar_flechas.json", t);
    });
    const r = validar(dir);
    assert.deepEqual(r.erros, []);
    assert.match(r.avisos.join("\n"), /fabricar_flechas\.json: coluna\(s\) fora do contrato.*Coluna nova/);
});

test("pega linha com coluna a mais em relação à primeira", () => {
    const dir = copiaComMutacao(({ ler, gravar }) => {
        const t = ler("culinaria_avancada.json");
        t[3]["Intrusa"] = "x";
        gravar("culinaria_avancada.json", t);
    });
    assert.match(
        mensagens(validar(dir)),
        /culinaria_avancada\.json\[3\]: colunas diferentes da 1ª linha \(a mais: Intrusa\)/
    );
});

test("pega tabela ausente no contrato colunas.json", () => {
    const dir = copiaComMutacao(({ ler, gravar }) => {
        const c = ler("colunas.json");
        delete c.runas;
        gravar("colunas.json", c);
    });
    assert.match(mensagens(validar(dir)), /colunas\.json: falta a tabela "runas"/);
});

test("aceita linhas com as mesmas colunas em ordem diferente (caso real do custo de encantamento)", () => {
    const dir = copiaComMutacao(({ ler, gravar }) => {
        const t = ler("custo_de_encantamento.json");
        t[5] = Object.fromEntries(Object.entries(t[5]).reverse());
        gravar("custo_de_encantamento.json", t);
    });
    assert.deepEqual(validar(dir).erros, []);
});

test("pega linha que perdeu uma coluna", () => {
    const dir = copiaComMutacao(({ ler, gravar }) => {
        const t = ler("custo_de_encantamento.json");
        delete t[10].Qtd;
        gravar("custo_de_encantamento.json", t);
    });
    assert.match(
        mensagens(validar(dir)),
        /custo_de_encantamento\.json\[10\]: colunas diferentes da 1ª linha \(faltam: Qtd\)/
    );
});

test("pega id de episódio duplicado e JSON inválido", () => {
    const dir = copiaComMutacao(({ ler, gravar, dir }) => {
        const g = ler("guia_episodio.json");
        g[1].id = g[0].id;
        gravar("guia_episodio.json", g);
        writeFileSync(path.join(dir, "data", "criar_toxina.json"), "{ quebrado");
    });
    const m = mensagens(validar(dir));
    assert.match(m, /id duplicado/);
    assert.match(m, /criar_toxina\.json: JSON inválido/);
});

test("campo desconhecido vira aviso, não erro", () => {
    const dir = copiaComMutacao(({ ler, gravar }) => {
        const g = ler("guia_episodio.json");
        g[0].recompensas = "typo";
        gravar("guia_episodio.json", g);
    });
    const r = validar(dir);
    assert.deepEqual(r.erros, []);
    assert.match(r.avisos.join("\n"), /campo desconhecido: "recompensas"/);
});

test("pega ícone ausente para um ID conhecido", () => {
    const dir = copiaComMutacao(({ ler, dir }) => {
        const ids = Object.values(ler("itens_divine_pride.json"));
        const pasta = path.join(dir, "assets", "icons");
        mkdirSync(pasta, { recursive: true });
        const extras = Object.values(ler("referencias.json").itens_conhecidos).concat(
            Object.values(ler("referencias.json").ep19_ids)
        );
        [...ids, ...extras].slice(1).forEach((id) => writeFileSync(path.join(pasta, `${id}.png`), ""));
    });
    assert.match(mensagens(validar(dir)), /ícone ausente para/);
});
