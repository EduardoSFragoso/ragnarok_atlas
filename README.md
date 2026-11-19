# Ragnarök Atlas · LATAM

Guia comunitário em português para consultar equipamentos por episódio, encantamentos, custos e materiais, fontes de obtenção, reformas e sistemas de grau/refinamento. Inclui calculadoras de habilidades de criação e preparação. O projeto está em evolução.

## Conteúdo

- Equipamentos e materiais de episódios, com filtros e ordenação por episódio.
- Encantamentos, efeitos e requisitos por equipamento e slot.
- Fontes de obtenção, totais e campos para considerar bônus de reputação.
- Página de Estoque: ganho por dia das diárias, recompensas por episódio (quests e moedas) e o estoque salvo no navegador — o mesmo usado pela calculadora de custo total de encantamento.
- Reforma de armas e referências sobre Grau e Refinamento.
- Calculadoras executadas no navegador; os valores digitados não são enviados nem salvos.
- Calculadoras de custo total de encantamento e de upgrade de Grau (Ep. 19), e seção de reciclagem do Ep. 19.
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
- [Hazy Forest — Enchants: Glacier Weapons](https://hazyforest.com/enchants:glacier_weapons): wiki comunitária do kRO, usada **somente para os encantos de habilidades de classe 3** das Armas Invernais (Ep. 19) — custos e itens de drop que a bROWiki/iROWiki marcam como não confirmados. Esses valores aparecem com asterisco no site e podem não corresponder ao valor real do LATAM/bROWiki. Os demais encantos das Armas Invernais usam nomes e efeitos oficiais do cliente LATAM (Divine Pride/bROWiki).

## Ferramentas

Scripts em `tools/` mantêm os dados e os ícones atualizados; o site em si é estático (HTML/CSS/JS puro, sem build) e roda direto no navegador ou em qualquer servidor de arquivos.

## Dados

Os arquivos de `data/` estão em **JSON**, direto na raiz da pasta (sem subpastas): cada linha virou um objeto com as colunas nomeadas (colunas sem título no original recebem o nome `colN`), o que facilita manter e exportar as informações. O site lê esses JSONs diretamente, sem etapa de build. A versão anterior em TSV foi preservada na branch `legado`.

- **`tools/baixar_icones.py`** — baixa em `assets/icons/` os PNGs dos itens e habilidades que ainda não têm ícone local, a partir dos IDs conhecidos pelo projeto. Os ícones ficam versionados no repositório para o site não depender de requisições externas durante o uso.
- **`tools/puxar_efeitos_divine_pride.py`** — consulta a API do Divine Pride (por ID de habilidade, via `tools/skills_ids.json`, com `Accept-Language: pt` + `x-server: LATAM` e fallback iRO em 404) e atualiza os efeitos e os nomes em português dos JSONs de encantamentos e habilidades. Antes de cada requisição há espera para respeitar o limite de requisições da API.
- **`tools/agregar_efeitos.py`** — agrega no JSON de encantamentos os efeitos itemizados por nível de refino na soma total até o +11, no formato publicado pelo workflow do Divine Pride.
- **`tools/montar_reforma_fides.py`** — baixa a página da bROWiki da Aldeia do Lobo Cinzento (sem API nem chave) e regenera `data/reforma_fides.json` com os rituais de reforma, o mapeamento armas Adulter → Vivatus Fides por classe e as faixas de bônus aleatórios.
- **`tools/converter_tsv_json.py`** — converte os TSVs antigos de `data/` para o formato JSON atual (cada linha vira um objeto com as colunas nomeadas); mantido para referência e para reverter a conversão a partir da branch `legado`.
- **`.github/workflows/puxar-efeitos-divine-pride.yml`** — workflow manual (`workflow_dispatch`) que roda o script de efeitos usando o segredo do repositório `DP_API_KEY` (chave da API do Divine Pride) e abre os resultados direto nos arquivos de dados; não há agendamento.
- Saídas auxiliares: `tools/skills_pt.json` (renomeações oficiais aplicadas), `tools/divine_pride_skills.json` (nomes/efeitos das habilidades citadas pelos encantamentos, em pt-BR — cobre as 99 habilidades dos eps 17.2/18/19, então a fase de habilidades do workflow não precisa rodar de novo), `tools/divine_pride_saida.json` (resposta bruta da API) e `tools/divine_pride_faltando.txt` (IDs sem resposta). As habilidades podem também ser resolvidas sem chave de API pelas páginas públicas do Divine Pride (`/database/skill/{id}` com `Accept-Language: pt` + `x-server: LATAM`), que embutem o nome e o efeito oficiais do cliente LATAM.

Os ícones já identificados são armazenados em `assets/icons/` para evitar novas solicitações durante o uso (para regenerá-los, veja **Ferramentas**). Conforme informado pelo mantenedor, há autorização explícita para redistribuir esses ícones e usar os dados e textos de efeitos relacionados à API neste projeto. Essa autorização é independente da licença MIT do código.

## Aviso de licença e conteúdo de terceiros

O arquivo [`LICENSE`](LICENSE) aplica a licença MIT somente ao código original escrito para este projeto. Ela não cobre nem concede direitos sobre dados da API, URLs ou arquivos de ícones, textos de efeitos, conteúdo da bROWiki e do Hazy Forest, informações do jogo, nomes, logotipos ou marcas de terceiros. Os dados, textos e ícones da API têm autorização de uso informada pelo mantenedor, independente da licença do código; isso não se estende automaticamente a conteúdo da bROWiki ou a outros materiais de terceiros.

Os dados atuais foram compilados de informações da bROWiki, do Hazy Forest e da API Divine Pride. Ainda não há atribuição de fonte individual registrada para cada arquivo de dados.
