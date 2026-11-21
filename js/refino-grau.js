/* ===== Ragnarök Atlas — js/refino-grau.js =====
   Páginas de Refinamento e Grau (com links das atividades). */

function activityLink(name) {
    const key = String(name || "")
            .split(" – ")[0]
            .replace(/\s*\(.*\)\s*$/, "")
            .trim(),
        u = ACTIVITY_LINKS[key];
    return u
        ? `<a class="table-link" href="${u}" target="_blank" rel="noopener noreferrer" title="Abrir a página na bROWiki">` +
              `${esc(name)}</a>`
        : esc(name);
}

let upMode = "normal",
    upTable = "refino",
    upSpecial = false;

const tbl = (thead, body, cls = "") =>
    `<div class="table-wrap"><table class="data-table ${cls}"><thead>${thead}</thead>` +
    `<tbody>${body}</tbody></table></div>`;

const ths = (a) => `<tr>${a.map((x) => `<th>${x}</th>`).join("")}</tr>`;

const trs = (rows) => rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");

const ul = (a) => `<ul>${a.map((x) => `<li>${x}</li>`).join("")}</ul>`;

const secH = (h, p = "") => `<div class="section-heading"><div><h2>${h}</h2>${p ? `<p>${p}</p>` : ""}</div></div>`;

const cst = (z, list = []) => [z, ...list.map(([q, n]) => `${q} ${itemLink(n)}`)].filter(Boolean).join(" + ");

const rb = (a, b, v) => {
    const r = [];
    for (let n = a; n <= b; n++) r.push([`+${n}`, ...v.split(",").map((x) => (x === "-" ? "-" : x + "%"))]);
    return r;
};

const refChanceTable = (k) =>
    tbl(
        `<tr><th rowspan="2">Refino</th><th colspan="5">Arma</th><th colspan="3">Armadura</th>` +
            `</tr><tr><th>Nível 1</th><th>Nível 2</th><th>Nível 3</th><th>Nível 4</th><th>Nível 5</th>` +
            `<th>Nível 1</th><th>Nível 2</th><th>Sombrio</th></tr>`,
        trs(REF_CH[k])
    );

const grauChanceTable = (m) => tbl(ths(["Refino", "x → D", "D → C", "C → B", "B → A"]), trs(GRAU_CH[m]));

const mine = (rows) =>
    tbl(
        ths(["Minério", "Nv.", "Refina entre", "Penalidade da falha", "Obtenção via NPC"]),
        trs(rows.map(([n, nv, f, p, c]) => [`<span class="item-label">${itemLink(n)}</span>`, nv, f, p, c]))
    );

function refinoPage() {
    return (
        `<div class="panel-note">Refinar significa adicionar mais poder em armas e equipamentos. Itens refinados ` +
        `mostram quantas vezes foram refinados: <code>Espada</code> (sem refino) e <code>+2 Espada</code> (refinado ` +
        `2 vezes).</div>
${secH("Como refinar")}` +
        `<div class="card" style="padding:16px 20px"><ol><li>Vá para uma Refinaria e fale com o NPC.</li>` +
        `<li>A interface de refino será aberta: arraste o item até a janela e selecione os materiais.</li>` +
        `</ol><b>Preste atenção!</b>${ul([
            "Existem chances de falha e de perda total do item.",
            "Existe um limite de segurança em que o item pode ser refinado com 100% de sucesso: armas nível 1: +7; " +
                "armas nível 2: +6; armas nível 3: +5; armas nível 4 e armaduras nível 1: +4; armas nível 5 e armaduras " +
                "nível 2: +3.",
            "Itens indicados como “Indestrutíveis em Batalha” ainda serão destruídos em refinamentos.",
            "<b>Equipamentos Sombrios:</b> o limite máximo de refino é +10 (não vão até o +20 como os equipamentos " +
                "comuns); as Manoplas Sombrias têm os mesmos requisitos das armas nível 4; o restante tem nível 1; os " +
                "acessórios sombrios (Brinco e Colar) podem ser refinados; a Bênção do Ferreiro e os Pergaminhos de Refino " +
                "não funcionam.",
        ])}` +
        `</div>
${secH(
    "Bônus por refino",
    "Cada refino dá um bônus acumulativo; ao passar do limite de segurança (Over), o bônus aumenta bastante. " +
        "Refinado a partir do +15, o item ganha o bônus adicional, que aumenta ATQ e ATQM a cada refino acima " +
        "do +16. Armas de ataque à distância não recebem bônus de ATQM nem o bônus de Over das outras armas. " +
        "Equipamentos Sombrios não recebem estes bônus."
)}` +
        `
${tbl(
    ths([
        "Arma",
        "ATQ/ATQM por refino",
        "Bônus de Over",
        "Bônus adicional",
        "Bônus adic. por refino",
        "P.ATQ/S.ATQM por refino",
    ]),
    trs([
        ["Nv.1", "2", "1 ~ 3", "16", "1", "-"],
        ["Nv.2", "3", "1 ~ 5", "32", "2", "-"],
        ["Nv.3", "5", "1 ~ 8", "32", "2", "-"],
        ["Nv.4", "7", "1 ~ 14", "48", "3", "-"],
        ["Nv.5 sem Grau", "8", "-", "-", "-", "2"],
        ["Nv.5 e Grau D", "8,8", "-", "-", "-", "2"],
        ["Nv.5 e Grau C", "10,4", "-", "-", "-", "2"],
        ["Nv.5 e Grau B", "12", "-", "-", "-", "2"],
        ["Nv.5 e Grau A", "16", "-", "-", "-", "2"],
    ])
)}` +
        `
<div ` +
        `style="height:12px">` +
        `</div>${tbl(
            `<tr><th rowspan="2">Armadura</th><th colspan="4">DEF/DEFM por refino</th>` +
                `<th rowspan="2">TEN/TENM por refino</th>` +
                `</tr><tr><th>+1 ~ +4</th><th>+5 ~ +8</th><th>+9 ~ +12</th><th>+13 ~ +20</th></tr>`,
            `<tr><td>Nv.1</td><td>1</td><td>2</td><td>3</td><td>4 ~ 5</td><td>-</td></tr><tr>` +
                `<td>Nv.2</td><td colspan="4">20% da DEF dada pelo refino da armadura</td><td>2</td>` +
                `</tr>`
        )}` +
        `
${secH(
    "Minérios",
    "Refinar custa dinheiro e exige o minério correto para o nível do item. Os minérios são obtidos nos NPCs " +
        "das refinarias, por zeny ou trocando por itens."
)}` +
        `
<h3 ` +
        `class="table-group-title">Minérios comuns para armas</h3>` +
        `${mine([
            ["Fracon", "1", "0 ao +9", "Perde a arma", "200z"],
            ["Emveretarcon", "2", "0 ao +9", "Perde a arma", "1.000z"],
            ["Oridecon", "3 ~ 4", "0 ao +9", "Perde a arma", cst("", [[5, "Minério de Oridecon"]])],
            [
                "Bradium",
                "1 ~ 4",
                "+10 ao +19",
                "Perde 3 refinos ou 20% de perda do item",
                cst("50.000z", [[3, "Oridecon"]]),
            ],
            [
                "Eteridecon",
                "5",
                "0 ao +9",
                "Perde 3 refinos",
                cst("10.000z", [
                    [1, "Oridecon"],
                    [1, "Pó de Éter"],
                ]),
            ],
            [
                "Bradium de Éter",
                "5",
                "+10 ao +19",
                "Perde a arma",
                cst("30.000z", [
                    [1, "Bradium"],
                    [3, "Pó de Éter"],
                ]),
            ],
        ])}` +
        `
<h3 ` +
        `class="table-group-title" style="margin-top:16px">Minérios especiais para armas</h3>` +
        `${mine([
            ["Oridecon Enriquecido", "3 ~ 4", "0 ao +9", "Perde a arma", "JoyCoins"],
            ["Oridecon Perfeito", "3 ~ 4", "+7 ao +9", "Perde 1 refino", "JoyCoins"],
            ["Bradium Perfeito", "1 ~ 4", "+10 ao +19", "Perde 1 refino", "JoyCoins"],
            [
                "Eteridecon Enriquecido",
                "5",
                "0 ao +9",
                "Perde 1 refino",
                cst("20.000z", [
                    [1, "Oridecon Enriquecido"],
                    [2, "Pó de Éter"],
                ]),
            ],
            [
                "Eteridecon Perfeito",
                "5",
                "+10 ao +14",
                "Perde a arma",
                cst("50.000z", [
                    [1, "Oridecon Perfeito"],
                    [3, "Pó de Éter"],
                ]),
            ],
            [
                "Bradium de Éter Perfeito",
                "5",
                "+15 ao +19",
                "Perde a arma",
                cst("50.000z", [
                    [1, "Bradium Perfeito"],
                    [3, "Pó de Éter"],
                ]),
            ],
        ])}` +
        `
<h3 ` +
        `class="table-group-title" style="margin-top:16px">Minérios comuns para armaduras</h3>` +
        `${mine([
            ["Elunium", "Nv.1", "0 ao +9", "Perde a armadura", cst("", [[5, "Minério de Elunium"]])],
            [
                "Carnium",
                "Nv.1",
                "+10 ao +19",
                "Perde 3 refinos ou 20% de perda do item",
                cst("50.000z", [[3, "Elunium"]]),
            ],
            [
                "Eterium",
                "Nv.2",
                "0 ao +9",
                "Perde 3 refinos",
                cst("10.000z", [
                    [1, "Elunium"],
                    [1, "Pó de Éter"],
                ]),
            ],
            [
                "Carnium de Éter",
                "Nv.2",
                "+10 ao +19",
                "Perde a armadura",
                cst("50.000z", [
                    [1, "Carnium"],
                    [3, "Pó de Éter"],
                ]),
            ],
        ])}` +
        `
<h3 ` +
        `class="table-group-title" style="margin-top:16px">Minérios especiais para armaduras</h3>` +
        `${mine([
            ["Elunium Enriquecido", "Nv.1", "0 ao +9", "Perde a armadura", "JoyCoins"],
            ["Elunium Perfeito", "Nv.1", "+7 ao +9", "Perde 1 refino", "JoyCoins"],
            ["Carnium Perfeito", "Nv.1", "+10 ao +19", "Perde 1 refino", "JoyCoins"],
            [
                "Eterium Enriquecido",
                "Nv.2",
                "0 ao +9",
                "Perde 1 refino",
                cst("20.000z", [
                    [1, "Elunium Enriquecido"],
                    [2, "Pó de Éter"],
                ]),
            ],
            [
                "Eterium Perfeito",
                "Nv.2",
                "+10 ao +14",
                "Perde a armadura",
                cst("50.000z", [
                    [1, "Elunium Perfeito"],
                    [3, "Pó de Éter"],
                ]),
            ],
            [
                "Carnium de Éter Perfeito",
                "Nv.2",
                "+15 ao +19",
                "Perde a armadura",
                cst("50.000z", [
                    [1, "Carnium Perfeito"],
                    [3, "Pó de Éter"],
                ]),
            ],
        ])}` +
        `
${secH("Outros métodos", "Na maioria dos casos, são itens especiais.")}` +
        `
${tbl(
    ths(["Item", "Efeito"]),
    trs([
        [
            `<span class="item-label">${itemLink("Bênção do Ferreiro")}</span>`,
            "Armas e equipamentos não são perdidos nem têm o refino rebaixado em caso de falha.<br>Só pode ser usada " +
                "junto com outro minério e não funciona com Equipamentos Sombrios.<br>Funciona somente nos refinos +7 " +
                "ao +13: +7 → +8: 1 un.; +8 → +9: 2 un.; +9 → +10: 4 un.; +10 → +11: 7 un.; +11 → +12: 11 un.; +12 → " +
                "+13: 16 un.; +13 → +14: 22 un.; +6 e anteriores, e +14 em diante: não funciona.",
        ],
        [
            `<span class="item-label">${itemLink("Pergaminho de Refino")}</span>`,
            "Leva a arma ou o equipamento direto para o refino indicado no pergaminho, sem acumular com refinos já " +
                "existentes.<br>Não pode ser negociado (vai em envelope no shopping) e não funciona em armas nível 5 " +
                "nem em equipamentos nível 2.<br>Deve ser levado ao Mestre do Refino (prontera 184/177).",
        ],
        [
            `<span class="item-label">${itemLink("Cubos de Refino")}</span>`,
            "Levam a arma ou o equipamento direto para o refino indicado pelo cubo, sem acumular com refinos já existentes. " +
                "Funcionam pelo sistema de Combinação.",
        ],
        [
            `<span class="item-label">${itemLink("Martelos de Refino")}</span>`,
            "Funcionam em Equipamentos Sombrios e levam direto ao refino indicado ou a um aleatório, sem acumular " +
                "com refinos já existentes. Funcionam pelo sistema de Combinação.",
        ],
        [
            "Manufatura",
            `Os minérios de manufatura são refinados em qualquer NPC das refinarias: ` +
                `${cst("", [[20, "Minério de Zelunium"]])} ` +
                `→ ${itemLink("Zelunium")}; ${cst("", [[20, "Minério de Sombridecon"]])}` +
                ` → ${itemLink("Sombridecon")}. ` +
                `Refinador de Prontera (prt_in 62/57).`,
        ],
    ])
)}`
    );
}

function grauPage() {
    if (!GRAU_CH.normal.length)
        return caixaErroHtml("Tabela de grau indisponível", "Falha ao carregar data/referencias.json");

    return (
        `<div class="panel-note">Grau é um sistema de aprimoramento que concede bônus especiais e altera a estética ` +
        `dos equipamentos. Só armaduras nível 2 e armas nível 5 são afetadas.</div>
` +
        `${secH(
            "Bônus por grau",
            "Cada Grau adiciona um bônus percentual a cada refino de uma arma nível 5. (O texto da bROWiki diz “nível " +
                "2”, mas os valores são os das armas nível 5 da página Refinamento.) A letra do Grau aparece na frente " +
                "do nome do item, como em [B] Adaga."
        )}` +
        `
${tbl(
    ths(["Arma", "ATQ & ATQM por refino", "Bônus", "Prefixo"]),
    trs([
        ["Sem Grau", "+8,00", "0% de aumento", "—"],
        ["Grau D", "+8,80", "10% de aumento", "[D]"],
        ["Grau C", "+10,4", "30% de aumento", "[C]"],
        ["Grau B", "+12,0", "50% de aumento", "[B]"],
        ["Grau A", "+16,0", "100% de aumento", "[A]"],
    ])
)}` +
        `
${secH("Como funciona")}` +
        `<div class="card" style="padding:16px 20px"><ol><li>Vá para uma refinaria e fale com o NPC com indicação de Grau.</li>` +
        `<li>A interface de Grau será aberta: arraste o item até a janela e selecione os materiais.</li>` +
        `</ol><b>Preste atenção!</b>${ul([
            "Para subir de grau, o item precisa de um refino mínimo. Quando o Grau sobe, <b>o refino volta para +0</b>.",
            "<b>Processos:</b> em caso de sucesso, encantamentos, cartas e bônus aleatórios são preservados; em caso " +
                "de falha em processo seguro, também são preservados; em caso de falha fora do processo seguro, o equipamento " +
                "é perdido.",
            "<b>Materiais:</b> no processo seguro, use 5 minérios em vez de 1; ele garante que o item não seja perdido em caso de falha.",
            "<b>Bênção de Éter:</b> é opcional; cada adição aumenta as chances de sucesso, até 10% no máximo; o número " +
                "de Bênçãos necessárias para subir 1% varia com o grau.",
        ])}` +
        `</div>
${secH("Informações", "Atualmente, para subir de grau, o item deve estar no +11 no mínimo.")}` +
        `
${tbl(
    ths([
        "Etapa",
        "Refino mínimo",
        "Materiais",
        "Zeny",
        "Penalidade da falha",
        "Chance de sucesso (fora do evento)",
        "Bênção de Éter",
    ]),
    trs([
        [
            "Sem Grau → Grau D",
            "+11",
            cst("", [[1, "Aquamarina de Éter"]]),
            "100.000z",
            "Perde tudo",
            "70%",
            "+1% a cada 1 Bênção",
        ],
        ["", "", cst("", [[5, "Aquamarina de Éter"]]), "500.000z", "Seguro", "—", "—"],
        [
            "Grau D → Grau C",
            "+11",
            cst("", [[1, "Topázio de Éter"]]),
            "125.000z",
            "Perde tudo",
            "60%",
            "+1% a cada 3 Bênçãos",
        ],
        ["", "", cst("", [[5, "Topázio de Éter"]]), "625.000z", "Seguro", "—", "—"],
        [
            "Grau C → Grau B",
            "+11",
            cst("", [[1, "Ametista de Éter"]]),
            "200.000z",
            "Perde tudo",
            "50%",
            "+1% a cada 5 Bênçãos",
        ],
        ["", "", cst("", [[5, "Ametista de Éter"]]), "1.000.000z", "Seguro", "—", "—"],
        [
            "Grau B → Grau A",
            "+11",
            cst("", [[2, "Âmbar de Éter"]]),
            "500.000z",
            "Perde tudo",
            "40%",
            "+1% a cada 7 Bênçãos",
        ],
        ["", "", cst("", [[10, "Âmbar de Éter"]]), "2.500.000z", "Seguro", "—", "—"],
    ])
)}` +
        `
${secH("Materiais", "Os materiais podem ser obtidos com os NPCs de Grau. Topázio e Âmbar podem ser comprados com a Joalheira (morocc 166/54).")}` +
        `
${tbl(
    ths(["Item", "Zeny", "Materiais"]),
    trs([
        [`<span class="item-label">${itemLink("Pedra de Éter")}</span>`, "100.000z", cst("", [[5, "Pó de Éter"]])],
        [
            `<span class="item-label">${itemLink("Bênção do Éter")}</span>`,
            "100.000z",
            cst("", [
                [5, "Pó de Éter"],
                [1, "Bênção do Ferreiro"],
            ]),
        ],
        [
            `<span class="item-label">${itemLink("Aquamarina de Éter")}</span>`,
            "100.000z",
            cst("", [
                [3, "Pedra de Éter"],
                [1, "Aquamarina"],
            ]),
        ],
        [
            `<span class="item-label">${itemLink("Topázio de Éter")}</span>`,
            "200.000z",
            cst("", [
                [6, "Pedra de Éter"],
                [1, "Topázio"],
            ]),
        ],
        [
            `<span class="item-label">${itemLink("Ametista de Éter")}</span>`,
            "300.000z",
            cst("", [
                [10, "Pedra de Éter"],
                [1, "Ametista"],
            ]),
        ],
        [
            `<span class="item-label">${itemLink("Âmbar de Éter")}</span>`,
            "500.000z",
            cst("", [
                [15, "Pedra de Éter"],
                [1, "Âmbar"],
            ]),
        ],
    ])
)}`
    );
}

function upChance() {
    const ev = upMode === "evento",
        suf = ev ? " — durante o evento" : "";
    if (upTable === "grau")
        return (
            `<h3 class="table-group-title">Grau${suf}: armas e armaduras</h3><p class="panel-note lg" style="margin:10px ` +
            `0 12px">O evento de grau aumenta as chances de sucesso ao subir o Grau de um item. É sazonal e fica ` +
            `ativo junto com o Evento de Refino.</p>` +
            `${fold(`Chances de sucesso — Grau${suf}`, grauChanceTable(ev ? "evento" : "normal"), {
                cls: "fold-top",
                open: true,
            })}`
        );
    const esp = upSpecial;
    return (
        `<h3 class="table-group-title">Refinamento — minérios ${esp ? "especiais" : "comuns"}${suf}` +
        `</h3><p class="panel-note lg" style="margin:10px 0 12px">O evento de refino aumenta as chances de sucesso ` +
        `nos NPCs de forja e é sazonal.${esp ? " Os minérios especiais estão listados em Detalhes do Refinamento." : ""}` +
        `</p>${fold(
            `Chances de sucesso — Refino${suf}`,
            refChanceTable((esp ? "especiais" : "comuns") + (ev ? "Ev" : "")),
            { cls: "fold-top", open: true }
        )}`
    );
}

function upgradesView() {
    const sw = (attr, cur, list) =>
        list
            .map(
                ([v, l]) =>
                    `<button class="subtab ${cur === v ? "active" : ""}"${cur === v ? ' aria-current="page"' : ""}` +
                    ` data-${attr}="${v}" type="button">` +
                    `${l}</button>`
            )
            .join("");
    return (
        `<div class="page-head"><div><div class="eyebrow">SISTEMAS DE MELHORIA</div>` +
        `<h1 class="page-title">Grau & Refinamento</h1>` +
        `<p class="page-subtitle">Chances de sucesso e, abaixo, os detalhes de Refinamento e Grau.</p>` +
        `</div><span class="count-pill">CHANCES + DETALHES</span></div>
<div class="up-controls">` +
        `<div class="subtabs" role="group" aria-label="Tabela"><span class="muted" style="align-self:center;font-size:12px">Tabela:</span>` +
        `${sw("up-table", upTable, [
            ["refino", "Refino"],
            ["grau", "Grau"],
        ])}` +
        `<label class="switch-entry" data-up-extra="especiais"><input type="checkbox" id="upEspeciais"` +
        `${upSpecial ? " checked" : ""}> ` +
        `Minérios especiais</label>` +
        `<label class="switch-entry" data-up-extra="modo"><input type="checkbox" id="upEvento"` +
        `${upMode === "evento" ? " checked" : ""}> ` +
        `Chances durante o evento</label>` +
        `</div></div>
<div id="upChance">${upChance()}</div>
<div id="upDetail">${upDetail()}` +
        `</div>`
    );
}

function upDetail() {
    return upTable === "refino"
        ? fold("Detalhes do Refinamento", refinoPage(), { cls: "fold-top" })
        : fold("Detalhes do Grau", grauPage(), { cls: "fold-top" });
}

function bindUpgrades() {
    const sync = () => {
        $("#upChance").innerHTML = upChance();
        $$("[data-up-table]").forEach((b) => {
            const on = b.dataset.upTable === upTable;
            b.classList.toggle("active", on);
            if (on) b.setAttribute("aria-current", "page");
            else b.removeAttribute("aria-current");
        });
        $$('[data-up-extra="especiais"]').forEach((el) => (el.hidden = upTable !== "refino"));
        const d = $("#upDetail");
        if (d) d.innerHTML = upDetail();
    };
    $$("[data-up-table]").forEach(
        (b) =>
            (b.onclick = () => {
                upTable = b.dataset.upTable;
                sync();
            })
    );
    $("#upEspeciais")?.addEventListener("change", (e) => {
        upSpecial = e.target.checked;
        sync();
    });
    $("#upEvento")?.addEventListener("change", (e) => {
        upMode = e.target.checked ? "evento" : "normal";
        sync();
    });
    sync();
}
