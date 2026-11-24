# Handoff — como o Ragnarok Atlas funciona agora

Documento para a IA (ou pessoa) que vai continuar mexendo no repositório. Leia inteiro antes da primeira alteração:
a estrutura do código mudou bastante em relação às versões antigas (que tinham um `app.js` único de ~2.900 linhas).
As **regras gerais de desenvolvimento** ficam no `AGENTS.md` (raiz), a **checklist de auditoria de infraestrutura**
em `docs/auditoria-infra.md` e o **checklist de configuração do repositório (ruleset, Pages, Actions)** em
`docs/configuracao-repositorio.md`; este arquivo é o manual técnico que os três referenciam.

Tudo aqui foi conferido no repositório. Quando algo daqui contradisser o código, o código vence — e corrija este arquivo.

## 1. O que é

Guia comunitário em português do **Ragnarök Online LATAM** (equipamentos por episódio, encantamentos, custos e materiais,
reforma de armas, Grau e Refinamento, missões diárias, calculadoras de criação, guia de episódio).

- Site **estático**: HTML + CSS + JS puro, **sem build**. Roda direto no navegador, mas os dados são carregados por
  `fetch`, então abra por um servidor local (`py -m http.server 8000` e `http://localhost:8000`), nunca por `file://`.
- Idioma do site, dos comentários, das docstrings e das mensagens de commit: **português do Brasil**.
- É um projeto de fãs, sem afiliação com a Gravity. **O aviso de fan project (README e página "Fontes & referências")
  não pode ser removido.**
- Quem mantém o repositório trabalha no **Windows** (comandos Python como `py ...`); a CI roda em Linux.

## 2. Como o site é montado

O `index.html` carrega estes scripts, com `defer`, **nesta ordem** (eles são scripts comuns e compartilham o escopo global):

| #   | Arquivo              | Conteúdo                                                                                                                                                                        |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `js/base.js`         | arquivos de dados (`DATA_FILES`), estado global, utilitários (`$`, `esc`, `fmt`, ícones, busca), injeção de HTML (`defineHTML`), construtor de DOM (`el`) e armazenamento local |
| 2   | `js/dados.js`        | dados carregados, normalização das tabelas (`COL`, `rowsFromJson`) e `loadData()`                                                                                               |
| 3   | `js/tabelas.js`      | tabelas de equipamentos, encantamentos, custos e reformas                                                                                                                       |
| 4   | `js/diarias.js`      | missões diárias e controle de farm                                                                                                                                              |
| 5   | `js/calculadoras.js` | calculadoras, receitas por habilidade, encantamento total                                                                                                                       |
| 6   | `js/reciclagem.js`   | reciclagem do Ep. 19                                                                                                                                                            |
| 7   | `js/refino-grau.js`  | páginas de Refinamento e Grau                                                                                                                                                   |
| 8   | `js/reforma.js`      | página de Reforma e seções recolhíveis                                                                                                                                          |
| 9   | `js/guia.js`         | Guia de Episódio, `richText`, botão de copiar `/navi`                                                                                                                           |
| 10  | `js/telas.js`        | navegação (`setView`), `render()`, eventos do conteúdo                                                                                                                          |
| 11  | `js/ui.js`           | busca global, menu móvel, tema claro/escuro                                                                                                                                     |
| 12  | `app.js`             | ponto de entrada: guarda de carga, `loadData()` e abertura da visão geral                                                                                                       |

Fluxo de dados: `loadData()` faz `fetch` dos JSONs de `data/` → `rowsFromJson()` monta cada tabela como matriz
(1ª linha = cabeçalho) na ordem de `data/colunas.json` → `resolverColunas()` cria `COL.<tabela>.<campo>` (índices) →
as views leem as células por `r[K.campo]`, onde `K = COL.<tabela>`.

Outras pastas: `data/` (conteúdo, JSON), `assets/icons/` (PNGs de itens, nomeados pelo ID do Divine Pride),
`styles.css`, `tools/` (validação, testes e scripts de manutenção), `.github/workflows/` (CI e um fluxo manual).
A branch `legado` guarda a versão antiga (planilhas TSV) e o conversor TSV → JSON (`tools/converter_tsv_json.py`); não é usada no dia a dia.

## 3. Contratos que não podem quebrar

### 3.1 Colunas das tabelas — `data/colunas.json`

Por tabela: `arquivo`, `colunas` (layout) e `campos` (nome lógico → nome da coluna no JSON). É a **fonte única**; é usado
pelo site (`COL.custo.material`), pelas ferramentas Python (`registros("custo")[i]["material"]`) e pelo validador.

- **Nunca** leia coluna por número (`r[4]`). Use `r[K.nome]` no JS e `r["nome"]` no Python.
- A ordem das colunas dentro dos JSONs e colunas extras **não importam** (só o que está em `colunas.json` é lido).
- Para **renomear** uma coluna num JSON: atualize `colunas` e `campos` em `colunas.json` na mesma alteração.
- Para **usar uma coluna nova** no código: acrescente-a em `colunas` (no fim, para não deslocar nada) e dê um nome
  lógico em `campos`.
- Os JSONs das tabelas **não têm linha de cabeçalho** (as chaves são os nomes das colunas). No navegador a matriz
  ganha o cabeçalho na posição 0, por isso o código faz `.slice(1)`. Em `fabricar_flechas.json` o 1º registro é uma
  linha de título ("Fabricar Flechas"); o site ignora essa linha (`slice(2)`).

### 3.2 Guia de episódio — `data/guia_episodio.json`

Lista de episódios (`id` no formato `ep` + dígitos, único). Cada um tem `titulo`, `requisitos`, `recompensaTotal`,
`principal[]` (capítulos), `secundarias[]`, `diarias{aviso, grupos[]}` e, opcionais: `avisos[]`, `itensNecessarios`
(`embarque` + `nota`), `servicos`, `lojaReputacao`. Capítulos e secundárias aceitam `recompensa`, `desbloqueia`,
`itens[]`, `nota` e `aviso`. Linhas de tabela precisam ter o mesmo número de células que `colunas`.

Marcas de texto (função `richText`, em `js/guia.js`):

| No JSON                | No site                               |
| ---------------------- | ------------------------------------- |
| `{{Nome do Item}}`     | link do item (com ícone, se houver)   |
| `3 × {{Nome do Item}}` | quantidade + link                     |
| `/navi mapa 123/45`    | botão que copia o comando             |
| `!!texto!!`            | aviso crítico (vermelho e sublinhado) |
| `\n`                   | quebra de linha                       |
| `\n- texto`            | bullet (`<ul class="obs-list">`)      |

Convenções de conteúdo: observações com mais de um ponto usam bullets (`- ` no início de cada linha,
separadas por `\n`); o chip `/navi` fica preferencialmente no fim da linha e **sem parênteses** —
use travessão (`— /navi mapa 123/45`) quando o restante continuar a frase. No botão de `/navi`, ao
clicar, o rótulo vira "Copiado ✓" por 2 s (classe `.copied`, cor `--ok`).

**Campo novo no guia** exige três mudanças juntas: o validador (`tools/validar_dados.mjs`, esquema `guiaEpisodio` /
`opcionaisQuest`), o renderizador (`js/guia.js`) e, se for visual, o `styles.css`.

Na tabela de `servicos` (e nas demais linhas de tabela do guia), o renderizador usa `linhasNomeadas(t)`
(`js/guia.js`): cada linha vira um objeto lido pelos **nomes** de `colunas` (`r["Serviço"]`, `r["NPC"]`,
`r["Onde (/navi)"]`, `r["Custos"]`, `r["Observação"]`) — nunca por índice. Novas tabelas de linhas do guia
devem seguir o mesmo padrão; reordenar colunas no JSON não pode quebrar o render.

### 3.3 Ícones

Todo ID em `data/itens_divine_pride.json` e em `referencias.json` (`itens_conhecidos`, `ep19_ids`) **precisa** ter
`assets/icons/<id>.png` — o validador reprova se faltar. Para item novo: acrescente `"Nome": ID` em
`itens_divine_pride.json` e rode `py tools/baixar_icones.py` (sem chave de API; baixa só o que falta).

### 3.4 Ordem de carga dos scripts

Um script só pode, **no momento em que carrega**, usar o que foi definido em scripts anteriores. O resto (corpo de
funções, callbacks) roda depois que tudo carregou e pode usar qualquer coisa. Na prática: constantes e código que
executa no topo de um arquivo não podem depender de arquivos posteriores.

- **Novo script**: crie em `js/`, acrescente a tag `<script src="js/x.js?v=0" defer></script>` no `index.html` na posição
  certa e rode `npm run versao`. O ESLint descobre os arquivos pelo `index.html` — não precisa configurar nada.
- Variável `let` de topo reatribuída em **outro** arquivo precisa de um bloco
  `/* eslint-disable prefer-const -- motivo */ ... /* eslint-enable prefer-const */` (o ESLint só vê um arquivo por vez).
- **Guarda de carga**: na inicialização, **antes** de `loadData()`, o `app.js` confere (`ARQUIVOS_DA_CARGA`) se os
  globais esperados de cada script existem. Se algum faltar, uma caixa de erro visível aponta o arquivo culpado em vez
  de um erro distante. A caixa é montada com DOM puro, então funciona mesmo se o `base.js` ou o `dados.js` forem os
  ausentes. Ao **renomear ou mover** uma função de topo, atualize essa lista; ao **criar um script**, acrescente a
  entrada dele. O `npm run check` falha se a lista e os `js/*.js` do `index.html` divergirem.

### 3.6 Injeção de HTML e API de DOM

- **Todo HTML gerado entra no site por `defineHTML(alvo, html)` (`js/base.js`)**: parseia via `<template>`, **saneia**
  e injeta com `alvo.replaceChildren()`. É o único `innerHTML` do projeto. O sanitizador (`saneiaSubarvore`):
    - remove as tags `script`, `iframe`/`frame`/`frameset`, `object`/`embed`/`applet`, `base`, `form`, `meta`, `link`,
      `style`, `template`, `noscript`, `math` e, em SVG, `use`, `set`, `animate*` e `foreignObject`;
    - remove **todo** atributo `on*`, sem exceção (não existe mais `onerror` inline);
    - em atributos de URL (`href`, `src`, `srcset`, `action`, `formaction`, `xlink:href`, `poster`, `data`...) só aceita
      `http:`, `https:`, `mailto:`, `tel:` e URLs relativas, decidido pelo parser `URL` do navegador — assim
      `java<TAB>script:` e `<controle>javascript:` também são recusados. `data:` é sempre recusado;
    - **não** filtra o atributo `style`, nem texto: o texto vindo de dados continua precisando de `esc()`/`richText`.
      O sanitizador é defesa em profundidade, não licença para interpolar dado sem escapar.
- **Ícone de item ausente** (PNG que não existe): `js/base.js` registra um ouvinte de `error` na fase de captura que
  remove `img.item-icon`. Não escreva handlers inline (`onclick="…"`, `onerror="…"`): o sanitizador os apaga.
- **Escrever HTML fora de `js/base.js` é erro de lint** (`no-restricted-syntax` no `eslint.config.js`, exceção só para
  `base.js`): `.innerHTML =`, `.outerHTML =`, `insertAdjacentHTML`, `createContextualFragment` e `document.write`.
- **Os testes ficam em `tools/site.test.mjs`** (payloads de XSS, botão `/navi`, guarda de carga). Ao mexer no
  sanitizador, acrescente o payload novo lá primeiro e veja falhar.
- **Código NOVO prefere o construtor de DOM `el(tag, atributos, ...filhos)`** a montar strings quando o conteúdo é
  estrutural: strings viram nós de texto, `Element`s entram como estão, `{ html: "…" }` injeta HTML (use só com a
  saída de `richText`/`esc`).
- As views grandes continuam no padrão existente: strings-HTML em template literal entregues por `defineHTML`.
  O snapshot (`npm run snapshot`) garante que nenhum desses refactors muda o DOM renderizado.

### 3.5 Versão de cache

O `index.html` referencia cada `.js` e o `styles.css` com `?v=<hash do conteúdo>`. **Depois de editar qualquer `js/*.js`,
`app.js` ou `styles.css`, rode `npm run versao` e inclua o `index.html` no commit.** Sem isso a CI falha, de propósito,
para ninguém ficar com arquivo velho em cache.

## 4. Comandos

| Comando                                                | O que faz                                                 | Quando rodar                                     |
| ------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------ |
| `npm ci`                                               | instala dependências (ESLint, Prettier, jsdom)            | uma vez (e quando `package-lock.json` mudar)     |
| `npm run versao`                                       | atualiza os `?v=` do `index.html`                         | depois de editar `js/`, `app.js` ou `styles.css` |
| `npm run versao:verificar`                             | só confere (a CI usa)                                     |                                                  |
| `npm run check`                                        | sintaxe de todos os scripts; ⚠ nomes de topo nunca usados | sempre                                           |
| `npm run lint`                                         | ESLint em `app.js` e `js/`                                | sempre                                           |
| `npm run format` / `format:check`                      | Prettier (4 espaços, 120 colunas, aspas duplas, LF)       | `format` antes de commitar                       |
| `npm run validar:dados`                                | valida o esquema de todos os JSONs de `data/` e os ícones | sempre que mexer em `data/`                      |
| `npm test`                                             | testes do validador (16) e do site no jsdom (48)          | sempre                                           |
| `py -m unittest discover -s tools -p "test_*.py"`      | testes das ferramentas Python (9)                         | ao mexer em `tools/*.py` ou `colunas.json`       |
| `npm run snapshot -- --base`                           | grava a base do snapshot de renderização                  | **antes** de refatorar código                    |
| `npm run snapshot`                                     | gera o snapshot e compara com a base                      | **depois** de refatorar                          |
| `npm run snapshot -- --verificar`                      | só confere erros de renderização (a CI usa)               | sempre                                           |
| `py -m ruff check tools/` e `py -m ruff format tools/` | lint/formatação dos scripts Python                        | ao mexer em `tools/*.py`                         |

O **snapshot** roda o site num DOM simulado (jsdom; o carregamento está em `tools/_site_jsdom.mjs`, compartilhado
com os testes do site) e captura o HTML de ~330 estados (todas as telas, episódios e abas
do guia, filtros, buscas, botões e todas as opções das calculadoras). Para uma refatoração que não deve mudar nada,
ele precisa dizer "Idêntico à base". Se você mudou **conteúdo** de propósito (dados novos, texto novo), os estados
afetados mudam — isso é esperado; confira que só mudou o que devia e regrave a base. A pasta `.snapshot/` é local
(ignorada pelo Git).

## 5. CI (`.github/workflows/ci.yml`)

Em ordem: `npm ci` → `npm run check` → `versao:verificar` → `lint` → `format:check` → `validar:dados` → `npm test` →
`snapshot --verificar` → testes Python → validação de JSON. Qualquer falha deixa o push vermelho. A CI roda com `permissions: contents: read` (menor privilégio: ela só lê o
repositório; o fluxo manual abaixo declara as próprias permissões).
Há também um fluxo **manual** (`puxar-efeitos-divine-pride.yml`) que consulta a API do Divine Pride com o segredo
`DP_API_KEY` e abre um PR; a chave só existe como variável de ambiente/segredo — **nunca** a coloque em arquivo, log
ou linha de comando. Por abrir PR, esse workflow precisa de `contents: write` + `pull-requests: write` — o mínimo
disponível para a função dele (o `ci.yml`, que só lê o código, fica com `contents: read`). PRs abertos pelo bot
(`github-actions[bot]`) ficam em "Action required" e só rodam CI após **Approve workflows to run** — aprovar vai.

**PRs abertos por esse fluxo** (autor `github-actions[bot]`) **não rodam a CI sozinhos**: o GitHub os deixa em _Action
required_ e o check `checks` fica em "Expected — Waiting for status to be reported" até alguém com permissão de escrita
clicar em **Approve workflows to run** (na página do PR ou da execução). Depois do clique a CI roda normalmente e o
ruleset (§5.2) libera o merge. Testado em 22/11/2026 com um workflow descartável (CI verde em 32 s; o workflow de teste
já foi removido). Não é preciso trocar o `GITHUB_TOKEN` por um PAT, e a aprovação é uma proteção do GitHub — não a
contorne.

### 5.1 Dependabot e proteção da `main`

A CI e o projeto rodam em **Node 24** (`node-version: 24` no `ci.yml`, `"engines"` no `package.json`). Atenção ao
escrever JS: _Iterator Helpers_ (`iterator.map()`, `.filter()` etc. direto num iterador de `Map`/`Set`) só existem no
Node 22+ e em navegadores recentes — materialize com `[...iter]` ou `Array.from(iter)` antes.

`.github/dependabot.yml` abre PRs semanais de atualização (npm e GitHub Actions); cada PR já sai validado pelo CI
(além de alertas e _security updates_ do Dependabot, ligados no painel). Confirmações do dono (24/11/2026):
Dependabot completo, **Enforce HTTPS** do Pages ligado, Pages servido por GitHub Actions com deploy verde,
**secret scanning com push protection ativos** (bloco "Secret Protection" em Settings → Code security). Confirmação
adicional do dono: **"Automatically delete head branches" ligado** (Settings → General → Pull Requests) — o GitHub
apaga sozinho a branch remota depois do merge; sobra apagar só a cópia local.

### 5.2 Ruleset que protege a `main` — JÁ CRIADA E ATIVA

O ruleset `protege-main` **existe e está em Enforcement: Active** nesta data. Estado atual verificado:

- **Require a pull request before merging**: ligado (push direto na `main` é recusado com GH013 — testado).
- **Require status checks to pass**: ligado, com o job **`checks`** (do `ci.yml`) como check obrigatório — PR com
  CI vermelha fica com o botão de merge travado.
- **Block force pushes** e **Require conversation resolution before merging**: ligados.
- **Require linear history**: ligado — proíbe _merge commits_ na `main`, que fica sempre uma linha reta.
- **Allowed merge methods** (fora do ruleset, em Settings → General → Pull Requests): **_merge commits_ e
  _squash_ desligados; só _Rebase and merge_ ligado** — a `main` fica uma linha reta e cada commit do PR entra
  com a mensagem própria e o hash original (Squash achataria o PR e sumiria com os commits intermediários).
- **Require branches to be up to date before merging**: ligado — um PR só mergea depois de _Update branch_ com a
  `main` atual; o check obrigatório roda sempre sobre o topo mais recente, não sobre um código velho já aprovado.

**Lição registrada** (o motivo de o status check existir hoje): um PR foi mergido com a CI **vermelha** porque o
ruleset ainda não exigia o check `checks` — o merge entrou e deixou a `main` quebrada até o PR de correção.
O fix foi exatamente marcar _Require status checks to pass → `checks`_. Se você for mexer no ruleset, não desmarque
esse item: é a rede de segurança que impede merge de código quebrado.

Reprodução do passo a passo (caso o ruleset precise ser recriado do zero; uma vez só, na interface do GitHub):

1. No repositório, **Settings → Rules → Rulesets → New ruleset → New branch ruleset**.
2. **Ruleset Name**: `protege-main`. **Enforcement status**: Active.
3. Seção **Target branches**: Add target → _Add classic branch targeting_ → Ref name: `Default` (ou `main`).
4. Em **Bypass list**: deixe vazio (assim ninguém, nem você, escapa dos checks).
5. Em **Branch rules**, marque (é o estado atual descrito acima):
    - **Require a pull request before merging** — com "1 required approval" se quiser revisão (sozinho, pode deixar 0
      e apenas mudar o fluxo: tudo passa por PR mesmo que você aprove o próprio PR);
    - **Require status checks to pass** → Search: adicione o job **`checks`** (é o nome do job do `ci.yml`);
      avalie marcar também **Require branches to be up to date before merging**;
    - **Block force pushes** e **Require conversation resolution before merging**;
    - **Require linear history** — proíbe _merge commits_ na `main`, que fica sempre uma linha reta.
6. Fora do ruleset (/settings do repositório): **Settings → General → Pull Requests → Allowed merge methods** —
   desligue **Allow merge commits** e **Allow squash merging**, deixando **apenas Allow rebase merging** ligado
   (regra de casa atual: todo merge na `main` é Rebase and merge).
7. **Create changeset**. Feito isso: push direto na `main` passa a ser recusado; o CI roda **antes** do merge, no PR.
8. Exceção emergencial: Settings → Rules → o ruleset → desative temporariamente (_edit → toggle Enforcement_), resolva
   e reative. O bypass de emergência não deve ser routineiro.
9. Observação de plano: em repositório **público** é grátis; em **privado**, rulesets exigem GitHub Pro.

## 6. Checklist antes de cada commit

1. `npm run format` (não formata `data/`: lá mantenha o estilo de indentação que o arquivo já tem).
2. Se mexeu em `js/`, `app.js` ou `styles.css`: `npm run versao` — **sempre por último, depois do `format`**: o
   Prettier reformata o `js/` e invalida o hash se a versão foi calculada antes (a CI pega, mas evite o descaminho).
3. `npm run check && npm run lint && npm run format:check`.
4. Se mexeu em `data/`: `npm run validar:dados`.
5. `npm test` (e os testes Python se mexeu em `tools/`).
6. `npm run snapshot -- --verificar` (e a comparação com a base, se foi refatoração).
7. Commit com mensagem curta em português, descrevendo o que mudou e por quê. **Assunto com até 70
   caracteres** (o título do PR corta além disso); detalhes, passo a passo e justificativas vão no corpo
   da mensagem, não no assunto.

## 7. Receitas para tarefas comuns

**Editar texto ou conteúdo do guia** — só `data/guia_episodio.json` (+ `npm run validar:dados`). Campos desconhecidos
geram ⚠ (provável erro de digitação), não erro.

**Adicionar linhas a uma tabela existente** (equipamentos, encantamentos, custos...) — acrescente objetos com as mesmas
chaves das demais linhas do JSON; valores sempre **texto**. O validador exige as colunas de `colunas.json` em todas as
linhas. Itens novos com ícone: veja 3.3.

**Adicionar uma tela nova** — (1) função da view no arquivo de `js/` mais adequado (ou um script novo, ver 3.4);
(2) botão `data-view="x"` no menu do `index.html`; (3) nome no objeto `names` de `setView()` e um ramo em `render()`,
ambos em `js/telas.js`; (4) `npm run versao`. Use `seguro(...)` (já usado em `render()`) para que um erro vire uma caixa
de erro e não derrube o site.

**Escrever HTML em template strings** — não quebre linha nem adicione espaços _dentro_ do HTML do template: isso muda o
DOM. Para strings longas, concatene pedaços (`` `...` + `...` ``), como o código existente faz. Sempre `esc()` em dado
que vem de JSON; `richText()` já escapa.

**Mudar o formato de um JSON** — atualize juntos: o JSON, o `colunas.json` (se for tabela), o esquema em
`tools/validar_dados.mjs`, o código que lê e os testes. O validador é a rede de proteção: se ele passar e o snapshot
estiver limpo, a chance de quebrar o site é pequena.

## 8. Ferramentas Python (`tools/`)

| Script                          | Uso                                                                                            | Rede/chave                |
| ------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------- |
| `baixar_icones.py`              | baixa os PNGs que faltam em `assets/icons/` (`--dry-run` só lista)                             | rede, sem chave           |
| `puxar_efeitos_divine_pride.py` | busca na API do Divine Pride os efeitos pendentes                                              | rede + `DP_API_KEY` (env) |
| `agregar_efeitos.py`            | agrega efeitos "com refino +X ou mais" em `encantamentos_disponiveis.json`                     | local                     |
| `montar_reforma_fides.py`       | gera `data/reforma_fides.json` a partir da bROWiki (HTML)                                      | rede, sem chave           |
| `_comum.py`                     | utilitários: `registros(tabela)`, `carregar_contrato()`, escrita atômica em LF, HTTP com retry | —                         |

As que leem tabelas de `data/` usam o contrato por **nome de campo** (`registros("custo")`; `agregar_efeitos.py` pega o
nome da coluna em `colunas.json`), nunca por posição. Escritas de JSON usam
`salvar_json_atomico` (arquivo temporário + rename, LF). Estilo: Ruff, `line-length = 120`, Python 3.12.

## 9. Armadilhas que já apareceram (não repita)

- Ler coluna por índice: foi a principal fonte de fragilidade. Hoje é proibido (3.1).
- Tratar `[1:]` como "pular o cabeçalho" em dados vindos de `registros()`: não há cabeçalho, o primeiro registro é dado
  (isso já fez ferramentas ignorarem o 1º registro de cada tabela).
- Esquecer `npm run versao`: a CI reprova e, pior, o navegador pode servir arquivo velho.
- Rodar Prettier em `data/`: ele fica fora do Prettier (`.prettierignore`) de propósito. Reformataria os 20 JSONs
  (~33 mil linhas de diff) e brigaria com os scripts Python, que gravam com `indent=1`. Cada arquivo tem o seu estilo
  de indentação (1, 2 ou 4 espaços); ao editar à mão, **preserve o estilo do arquivo** e não reformate o resto.
- Mudar fim de linha: o repositório é **LF** (`.gitattributes`); no Windows, não converta para CRLF.
- Dependência de carregamento para frente (3.4): funciona em um arquivo só e quebra quando o código está dividido.
- Deixar uma alteração de teste (mutação "só para ver se quebra") no código: sempre desfaça antes de commitar e rode a
  bateria do checklist; prefira testar em cópia descartável.

## 10. Estado atual e pontos em aberto

- Concluído: validador de esquema com testes; colunas lidas por nome (site e Python); índices numéricos substituídos por
  nomes lógicos; `app.js` dividido em `js/`; versão de cache automática; snapshot de renderização; ESLint multi-arquivo;
  injeção de HTML centralizada e saneada (`defineHTML`, §3.6) com guarda de carga no `app.js`, sanitizador endurecido e 48 testes do site
  (`tools/site.test.mjs`); Dependabot e proteção da `main` (§5.1); CI cobrindo tudo isso.
- Sem pendências conhecidas de legibilidade: as expressões longas de HTML foram extraídas para constantes nomeadas e
  os índices numéricos de colunas/tuplas viraram nomes ou desestruturação. Os `[0]` que restam são "primeiro elemento"
  de listas, o que é legítimo.
- Se mudar algo estrutural (ordem dos scripts, contrato de colunas, fluxo de CI), **atualize este arquivo** e o README
  na mesma alteração.
