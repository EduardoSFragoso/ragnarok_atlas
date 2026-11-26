# Ragnarök Atlas · LATAM

[![Abrir o Atlas](https://img.shields.io/website?url=https%3A%2F%2Feduardosfragoso.github.io%2Fragnarok_atlas%2F&label=Abrir%20o%20Atlas)](https://eduardosfragoso.github.io/ragnarok_atlas/)

Guia comunitário em português para consultar equipamentos por episódio, encantamentos, custos e materiais, fontes de obtenção, reformas e sistemas de grau/refinamento. Inclui calculadoras de habilidades de criação e preparação. O projeto está em evolução.

## Conteúdo

- Equipamentos e materiais de episódios, com filtros e ordenação por episódio.
- Encantamentos, efeitos e requisitos por equipamento e slot, com a aba **Reciclagem e Globos** do Ep. 19 (resultados da reciclagem de armas e a cadeia de trocas de Globo).
- Fontes de obtenção, totais e campos para considerar bônus de reputação.
- Missões diárias com um cartão de **estoque por episódio** (valor inicial guardado no navegador, botão para somar o farm de hoje ou digitação manual) e as recompensas de quest do episódio em seção dobrável.
- Reforma de armas e referências sobre Grau e Refinamento.
- Calculadoras executadas no navegador; os valores digitados não são enviados nem salvos.
- Grau e Refinamento (páginas da bROWiki), com chances normais e durante o evento.
- Temas claro e escuro.

## Fontes

Prioridade aplicada no projeto:

1. **bROWiki** — fonte primária para o LATAM (passos de quest, sistemas, recompensas).
2. **Hazy Forest** e **iRO Wiki** — fontes complementares para o que está faltando ou divergente na bROWiki.
3. **Nomes oficiais em português** de itens e habilidades vêm do cliente LATAM (tabelas do OpenKore) e da [API do Divine Pride](https://www.divine-pride.net/tools/api-doc) com os cabeçalhos `Accept-Language: pt` e `x-server: LATAM`; nesses casos, o nome do cliente prevalece.
4. **IDs de item/habilidade em divergência** prevalecem nos números do Divine Pride (erros manuais de wiki).

Referências principais:

- [bROWiki — Reforma](https://browiki.org/wiki/Reforma)
- [bROWiki — Grau](https://browiki.org/wiki/Grau)
- [bROWiki — Refinamento](https://browiki.org/wiki/Refinamento)
- [bROWiki — demais referências de episódios, itens e habilidades](https://browiki.org/), também listadas na seção **Fontes & referências** do site.
- [Divine Pride](https://www.divine-pride.net/): [documentação da API](https://www.divine-pride.net/tools/api-doc) usada para dados, ícones e nomes oficiais; [termos de uso da Divine](https://divine.inc/terms).
- [Hazy Forest — Enchants: Glacier Weapons](https://hazyforest.com/enchants:glacier_weapons): wiki comunitária do kRO, usada **somente para os encantos de habilidades de classe 3** das Armas Invernais (Ep. 19) — custos e itens de drop que a bROWiki/iROWiki marcam como não confirmados. Esses valores aparecem com asterisco no site e podem não corresponder ao valor real do LATAM/bROWiki. Os drops de cada habilidade foram cruzados com os nomes oficiais das pedras de encantamento no LATAM (ex.: `Cristal Invernal (Kagerou)`) e com as habilidades listadas nas descrições delas no Divine Pride. Os demais encantos das Armas Invernais usam nomes e efeitos oficiais do cliente LATAM (Divine Pride/bROWiki).

## Ferramentas

Scripts em `tools/` mantêm os dados e os ícones atualizados; o site em si é estático (HTML/CSS/JS puro, sem build) e roda direto no navegador ou em qualquer servidor de arquivos. **Quem for mexer no código (pessoa ou IA) deve ler primeiro o [`handoff.md`](handoff.md)**: estrutura, contratos, comandos e checklist de commit.

## Dados

Os arquivos de `data/` estão em **JSON**, direto na raiz da pasta (sem subpastas): cada linha virou um objeto com as colunas nomeadas (colunas sem título no original recebem o nome `colN`), o que facilita manter e exportar as informações. O site lê esses JSONs diretamente, sem etapa de build. A versão anterior em TSV foi preservada na branch `legado`.

- **`data/referencias.json`** — conteúdo estático do site que não vem de planilha: links de referência da bROWiki, Hazy Forest e iRO Wiki, mapas de IDs de itens conhecidos (incluindo os do Ep. 19), materiais do Grau do Ep. 19, grupos de reciclagem das Armas Vil Invernais, links das atividades e as tabelas de chance de refino e grau (faixas compactas do tipo `[do, até, "percentuais"]`, expandidas pelo site). Para atualizar esse conteúdo, edite o JSON — não é preciso mexer no `app.js`.

- **`tools/baixar_icones.py`** — baixa em `assets/icons/` os PNGs dos itens e habilidades que ainda não têm ícone local, a partir dos IDs conhecidos pelo projeto. Os ícones ficam versionados no repositório para o site não depender de requisições externas durante o uso.
- **`tools/puxar_efeitos_divine_pride.py`** — consulta a API do Divine Pride (por ID de habilidade, via `tools/skills_ids.json`, com `Accept-Language: pt` + `x-server: LATAM` e fallback iRO em 404) e atualiza os efeitos e os nomes em português dos JSONs de encantamentos e habilidades. Antes de cada requisição há espera para respeitar o limite de requisições da API.
- **`tools/agregar_efeitos.py`** — agrega no JSON de encantamentos os efeitos itemizados por nível de refino na soma total até o +11, no formato publicado pelo workflow do Divine Pride.
- **`tools/montar_reforma_fides.py`** — baixa a página da bROWiki da Aldeia do Lobo Cinzento (sem API nem chave) e regenera `data/reforma_fides.json` com os rituais de reforma, o mapeamento armas Adulter → Vivatus Fides por classe e as faixas de bônus aleatórios.
- **Conversor TSV → JSON** (`tools/converter_tsv_json.py`) — não está mais na `main`: vive na branch `legado`, junto com as planilhas TSV que ele converte (`data/facilidades/*.tsv` e `data/referencia/*.tsv`).
- **`.github/workflows/puxar-efeitos-divine-pride.yml`** — workflow manual (`workflow_dispatch`) que roda o script de efeitos usando o segredo do repositório `DP_API_KEY` (chave da API do Divine Pride) e abre um **pull request** (branch `data/divine-pride`) com os resultados resumidos no corpo do PR, para revisão antes de entrar no site; não há agendamento. Há `concurrency` para duas execuções não disputarem o push.
- Saídas auxiliares: `tools/skills_pt.json` (renomeações oficiais aplicadas), `tools/divine_pride_skills.json` (nomes/efeitos das habilidades citadas pelos encantamentos, em pt-BR — cobre as 99 habilidades dos eps 17.2/18/19, então a fase de habilidades do workflow não precisa rodar de novo), `tools/divine_pride_saida.json` (resposta bruta da API) e `tools/divine_pride_faltando.txt` (IDs sem resposta). As habilidades podem também ser resolvidas sem chave de API pelas páginas públicas do Divine Pride (`/database/skill/{id}` com `Accept-Language: pt` + `x-server: LATAM`), que embutem o nome e o efeito oficiais do cliente LATAM.
- Mapas de referência de IDs (evitam buscas repetidas na API): `tools/itens_hazy_kr.json` (os 107 itens de drop do Hazy Forest: nome kRO → ids e nome PT), `tools/skills_hazy_ids.json` (habilidades da tabela de encantos do Hazy Forest: nome kRO → id/handle/nome PT, mais as pedras de encantamento LATAM equivalentes e seus ids de item) e `tools/skills_pt_ids.json` (nome PT → id). Consultas na API do Divine Pride devem ser feitas **somente por ID**; a busca por nome fica permanentemente bloqueada (429).

Os ícones já identificados são armazenados em `assets/icons/` para evitar novas solicitações durante o uso (para regenerá-los, veja **Ferramentas**). O ícone da aba do navegador é `assets/favicon.svg` (veja **Aviso de licença e conteúdo de terceiros**). Conforme informado pelo mantenedor, há autorização explícita para redistribuir esses ícones e usar os dados e textos de efeitos relacionados à API neste projeto. Essa autorização é independente da licença MIT do código.

## Estrutura do código

O site não tem build: o `index.html` carrega scripts comuns (com `defer`), na ordem abaixo, e eles compartilham o escopo global. A ordem importa — cada arquivo só usa, no momento do carregamento, o que já foi definido antes (o resto é chamado depois, quando tudo está carregado).

| Arquivo              | Conteúdo                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `js/base.js`         | arquivos de dados, estado global, utilitários (texto, ícones, busca) e armazenamento local            |
| `js/dados.js`        | dados carregados de `data/`, normalização das tabelas (`COL`) e `loadData()`                          |
| `js/tabelas.js`      | tabelas de equipamentos, encantamentos, custos e reformas; custos separam Ep. 19 dos demais episódios |
| `js/diarias.js`      | missões diárias e controle de farm                                                                    |
| `js/calculadoras.js` | calculadoras, receitas por habilidade e encantamento total                                            |
| `js/reciclagem.js`   | reciclagem de armas e trocas de Globo do Ep. 19 (aba "Reciclagem e Globos")                           |
| `js/refino-grau.js`  | páginas de Refinamento e Grau                                                                         |
| `js/reforma.js`      | página de Reforma e seções recolhíveis                                                                |
| `js/guia.js`         | Guia de Episódio e cópia de `/navi`                                                                   |
| `js/telas.js`        | navegação, `render()` e eventos do conteúdo                                                           |
| `js/ui.js`           | busca global, menu móvel e tema                                                                       |
| `app.js`             | ponto de entrada: carrega os dados e abre a visão geral                                               |

## Qualidade de código

O projeto usa linters e formatadores com configuração versionada (aplicados nos scripts de `tools/` e nos arquivos web):

- **Ruff** (`ruff.toml`) — lint e formatação dos scripts Python (`py -m ruff check tools/` e `py -m ruff format tools/`); instale com `py -m pip install --user ruff`.
- **Prettier** (`.prettierrc.json`) — formatação de todos os arquivos (`npm run format`; a CI roda `npm run format:check`).
- **ESLint** (`eslint.config.js`) — lint de `app.js` e `js/*.js` para o navegador (`npm run lint`). Como os scripts compartilham o escopo global, o ESLint trata o que um arquivo declara como global nos demais.
- **Testes das ferramentas Python e workflows** (`tools/test_comum.py`, `tools/test_workflow.py`, só biblioteca padrão) — `py -m unittest discover -s tools -p "test_*.py"`: conferem a leitura das tabelas, atrasos finitos, passagem segura do `delay` e Actions fixadas por SHA.
- **Checagem de scripts** (`tools/checar_sintaxe.mjs`) — `npm run check`: confere a sintaxe de todos os scripts do `index.html` e avisa (⚠) sobre nomes declarados no topo e nunca usados.
- **Versão de cache** (`tools/versao_cache.mjs`) — grava no `index.html` um `?v=<hash>` por script/CSS, calculado pelo conteúdo. Depois de editar qualquer arquivo em `js/`, `app.js` ou `styles.css`, rode `npm run versao`; a CI falha (`npm run versao:verificar`) se algum estiver desatualizado.
- **Snapshot de renderização** (`tools/snapshot.mjs`, usa `jsdom`) — roda o site num DOM simulado e captura o HTML de centenas de estados (telas, abas, filtros, buscas e todas as opções das calculadoras). Para refatorar com segurança: `npm run snapshot -- --base` antes de mexer no código e `npm run snapshot` depois; ele aponta qual estado mudou. Na CI roda `npm run snapshot -- --verificar`, que só falha se alguma tela quebrar ou der erro no console. A pasta `.snapshot/` é local e não vai para o Git.
- **Validador de esquema dos dados** (`tools/validar_dados.mjs`) — confere os JSONs de `data/` (colunas e ordem das tabelas lidas por posição, formato do guia de episódios, referências e ícones). Rode `npm run validar:dados`; os testes dele rodam com `npm test`. Erros derrubam a CI; campos desconhecidos geram só um aviso (⚠). O contrato das tabelas fica em `data/colunas.json`: por tabela, o arquivo, a lista de colunas e os nomes lógicos dos campos — `COL.custo.material` no site (`js/`) e `registros("custo")[…]["material"]` nas ferramentas Python (`tools/_comum.py`), sempre por nome, nunca por posição. Ao renomear uma coluna de um JSON, atualize também esse arquivo.

Comentários e docstrings são escritos em português do Brasil. Os scripts gravam JSON/texto de forma atômica (arquivo temporário + renomear) e com final de linha LF, para o resultado local e o do CI serem idênticos. A chave de API é lida somente de `DP_API_KEY`; nunca passe a chave na linha de comando.

## Aviso de licença e conteúdo de terceiros

O arquivo [`LICENSE`](LICENSE) aplica a licença MIT somente ao código original escrito para este projeto. Ela não cobre nem concede direitos sobre dados da API, URLs ou arquivos de ícones, textos de efeitos, conteúdo da bROWiki e do Hazy Forest, informações do jogo, nomes, logotipos ou marcas de terceiros. Os dados, textos e ícones da API têm autorização de uso informada pelo mantenedor, independente da licença do código; isso não se estende automaticamente a conteúdo da bROWiki ou a outros materiais de terceiros.

**Favicon:** o arquivo `assets/favicon.svg` é uma criação original, feita para este projeto, com as iniciais “Ro” em azul sobre fundo branco. Ele não é o logo oficial e não reproduz a marca registrada de Gravity Co.; _Ragnarök Online_ e seus logotipos são propriedade da Gravity Co. Ltd. **Este é um projeto de fãs, sem afiliação com a Gravity Co. Ltd. ou com seus publicadores; todas as marcas citadas pertencem aos respectivos detentores.** O mesmo aviso aparece na página **Fontes & referências** do site.

Os dados atuais foram compilados de informações da bROWiki, do Hazy Forest e da API Divine Pride. Ainda não há atribuição de fonte individual registrada para cada arquivo de dados.
