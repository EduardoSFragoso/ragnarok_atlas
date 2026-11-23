# Regras de desenvolvimento

Regras de contexto para agentes de IA e pessoas que mantêm o **Ragnarök Atlas · LATAM**. O manual técnico
vigente — arquitetura, ordem de carga, checklist até o commit e o fluxo de PR — é o `handoff.md` na raiz,
que deve ser lido inteiro antes da primeira alteração; aqui ficam as regras gerais de como trabalhar.

## Princípios gerais

- Prefira soluções simples, claras e fáceis de manter.
- Evite implementar funcionalidades ou abstrações antes de existir uma necessidade concreta (YAGNI).
- Evite duplicar regras de negócio: extraia lógica compartilhada quando isso tornar o código mais claro (DRY).
- Separe responsabilidades entre módulos, funções e classes.
- Aplique os princípios SOLID quando ajudarem a manter o sistema modular e compreensível; não crie abstrações sem necessidade.
- Preserve o comportamento existente, exceto quando a tarefa pedir explicitamente uma mudança.

## Organização e legibilidade

- Use nomes descritivos e específicos para variáveis, funções, classes e módulos.
- Siga as convenções de nomenclatura da linguagem e do projeto. Mantenha o mesmo padrão em todo o código
  (neste projeto, comentários, identificadores e commits são em português do Brasil).
- Mantenha a formatação e a indentação consistentes com os arquivos próximos (Prettier: 4 espaços, 120 colunas).
- Use espaços em branco para separar blocos de lógica relacionados.
- Escreva código que explique a própria intenção sempre que possível.
- Use comentários para explicar decisões, regras de negócio não óbvias, limitações ou workarounds — não para repetir literalmente o que o código já mostra.
- Marque tarefas pendentes com `TODO` e descreva o que falta.

## Documentação

- Mantenha um `README.md` na raiz com o propósito do projeto, configuração e instruções de uso.
- Documente entradas, saídas, arquitetura relevante e particularidades necessárias para manter ou operar o projeto.
- Escreva docstrings para funções, classes ou módulos cuja finalidade, parâmetros, retornos ou efeitos não sejam óbvios.
- Mantenha a documentação atualizada quando uma mudança alterar o comportamento ou o modo de usar o projeto.
- Ao concluir um trabalho grande, escreva ou atualize um `handoff.md`: estrutura, comandos, contratos que não podem
  quebrar, armadilhas conhecidas e pendências. Atualize-o na mesma alteração que mudar algo estrutural.

## Qualidade, erros e testes

- Escreva testes para validar o comportamento esperado, incluindo casos-limite e entradas inválidas relevantes.
- Use dados fictícios pequenos com resultados conhecidos para validar alterações.
- Prefira testes unitários para funções e componentes isolados; adicione outros tipos de teste quando o projeto exigir.
- Considere escrever ou atualizar os testes antes da implementação (TDD), quando isso for adequado à tarefa.
- Trate erros previsíveis de forma explícita e útil.
- Capture exceções específicas; não oculte erros com tratamento genérico ou silencioso.
- Não considere uma mudança concluída até revisar o código e executar os testes pertinentes.
- Antes de refatorar código existente, crie uma rede de segurança (snapshot de renderização, testes de caracterização
  ou equivalente — neste projeto, `npm run snapshot -- --base` antes e `npm run snapshot` depois) e, ao final, prove
  que o comportamento não mudou.
- Um teste novo só prova algo se falhar no código antigo ou com o defeito reintroduzido; confirme isso quando o teste cobrir um bug corrigido.
- Teste falhas e mutações em uma cópia descartável; nunca deixe código alterado só para testar, nem arquivos temporários, no commit.

## Desempenho e uso de recursos

- Priorize a clareza; não otimize prematuramente.
- Meça o desempenho com profiling antes de otimizar e concentre-se nos gargalos observados.
- Evite loops ou iterações desnecessários. Use operações vetorizadas quando a linguagem ou biblioteca oferecer uma alternativa clara e apropriada.
- Para dados grandes, avalie processamento em chunks, particionamento, compressão e formatos de armazenamento adequados.
- Use profiling de memória quando houver indícios de consumo excessivo ou vazamentos.
- Considere processamento paralelo ou armazenamento distribuído somente quando o volume e o perfil da carga justificarem a complexidade.
- Documente otimizações que tornem o código significativamente menos óbvio.

## Ferramentas e padrões automáticos

- Use os linters, formatadores e verificadores de tipos adotados pelo projeto: **ESLint** + **Prettier** para a web
  (`npm run lint`, `npm run format`) e **Ruff** para os scripts Python de `tools/` (`py -m ruff check tools/`,
  `py -m ruff format tools/`).
- Prefira executar essas ferramentas automaticamente no editor ou no pipeline de CI/CD (a CI roda todas).
- Não introduza uma ferramenta nova sem necessidade; respeite primeiro as dependências e convenções existentes.
- Exceção ao item anterior: ferramentas novas são aceitáveis quando criam uma rede de segurança ou fecham um risco real; registre o motivo no `handoff.md`.
- Na CI, declare `permissions` mínimas (o `ci.yml` usa `contents: read`), mantenha o Dependabot ativo e atualize as
  GitHub Actions. O workflow que abre PR (`puxar-efeitos-divine-pride.yml`) usa `contents: write` +
  `pull-requests: write` — o mínimo para a função dele (ver `handoff.md` §5).

## Git e colaboração

- Use Git para registrar o trabalho, inclusive em projetos individuais.
- Faça commits com mensagens objetivas que descrevam o propósito da mudança.
- Use branches para isolar alterações quando o fluxo do projeto exigir.
- Revise diferenças e resolva conflitos conscientemente antes de integrar mudanças.
- Abra pull requests quando esse for o processo do projeto; descreva a mudança e facilite sua revisão.
- Revise o código — próprio ou de outras pessoas — procurando erros, problemas de segurança, duplicação e sinais de complexidade desnecessária.
- Refatore para melhorar a estrutura sem alterar o comportamento esperado, salvo quando a tarefa pedir o contrário.
- Nunca faça push direto na branch principal: trabalhe em branch e abra PR. O ruleset `protege-main` exige PR com o
  check da CI verde, branch atualizada e histórico linear; o único método de merge é **Rebase and merge**
  (detalhes e a lição de cada regra no `handoff.md` §5.2).
- Escreva o assunto do commit com até 70 caracteres, para que não seja cortado no título do PR; coloque os detalhes no corpo da mensagem.
- Quem não puder dar push entrega patches (`git format-patch`) gerados sobre a branch principal **atual** e verificados num clone limpo (`git am` e todas as verificações do projeto). Se a principal mudar, refaça o patch.
- Inclua no mesmo commit os artefatos derivados que a mudança alterar (ex.: os `?v=` do `index.html` via
  `npm run versao`, que vai sempre **por último**, depois do `format` — `handoff.md` §6).

## Segurança e proteção de dados

- Valide e higienize entradas não confiáveis antes de usá-las. Neste projeto, toda HTML derivada de dados passa por
  `defineHTML()` (`js/base.js`), que constrói e saneia os nós; `innerHTML` direto é proibido fora de `base.js`
  (regra do ESLint).
- Use consultas parametrizadas e mecanismos apropriados para evitar injeção de SQL, XSS e command injection.
- Nunca inclua senhas, tokens, chaves ou outras credenciais diretamente no código ou em configurações versionadas.
- Colete e mantenha apenas os dados sensíveis necessários; remova-os quando deixarem de ser necessários, conforme as regras do projeto.
- Restrinja o acesso a dados e recursos ao mínimo necessário e revise permissões relevantes.
- Use criptografia e protocolos seguros apropriados para dados armazenados ou transmitidos; prefira bibliotecas e APIs mantidas e consolidadas.
- Mantenha dependências atualizadas (Dependabot semanal ativo) e avalie a segurança de bibliotecas e componentes de terceiros.
- Implemente autenticação e autorização conforme os requisitos do sistema; use MFA quando aplicável.
- Inclua verificações de segurança no fluxo de revisão e teste, usando ferramentas automáticas e avaliação especializada quando apropriado.
- Nunca leia, exiba nem faça commit de `.env` ou de arquivos de credenciais; mascare valores secretos em logs, saídas e mensagens. Peça um `.env.example` com os nomes das variáveis, nunca os valores. A única credencial do projeto
  (`DP_API_KEY`) existe apenas como segredo do workflow — ver `handoff.md` §5.
- Em repositório novo, varra o código **e o histórico do Git** em busca de segredos (a varredura feita no
  `docs/auditoria-infra.md` não achou nada; refaça sempre que suspeitar). Se achar algum, pare e avise: o passo é
  **rotacionar** a credencial. Apagá-la do código não basta, porque o histórico guarda o valor.
- Em repositório público, todo o histórico é público. No frontend só podem existir chaves feitas para serem públicas.
- Configure CORS apenas com as origens necessárias (nunca `*` com credenciais) e faça o frontend chamar a API somente por HTTPS.

## Se o projeto ganhar frontend no Pages + backend + banco

Este projeto hoje é **só um frontend estático publicado na raiz pelo GitHub Pages** — sem backend, sem banco, sem API
própria. Se algum dia ganhar uma dessas camadas, siga a checklist de `docs/auditoria-infra.md` (backend em VM, banco
Postgres/Neon, CORS pela origem do Pages, migrações versionadas etc.) e atualize esta seção e o `handoff.md`.

## Uso de assistentes de IA

- Considere código gerado por IA como uma sugestão que precisa de revisão, não como uma implementação automaticamente confiável.
- Antes de aceitar uma sugestão, verifique sua correção, segurança, compatibilidade com a arquitetura e aderência aos padrões do projeto.
- Entenda o código antes de usá-lo ou enviá-lo ao repositório; consiga explicar o que cada trecho faz.
- Para tarefas grandes, comece propondo um plano em etapas antes de modificar o código.
- Ao pedir ajuda à IA, informe linguagem, framework, requisitos, restrições de desempenho e requisitos de segurança relevantes.
- Siga estas regras de contexto e as instruções do `handoff.md`.
- Em um repositório novo, a primeira etapa é uma auditoria sem alterações (estrutura, riscos, segredos, testes, CI, dependências); só depois proponha o plano.
- Execute as verificações do projeto (formatação, lint, testes, snapshot) antes de declarar a tarefa concluída e informe com clareza o que não pôde ser verificado (navegador real, resultado da CI, infraestrutura).
- Não presuma o comportamento de ferramentas e serviços: a documentação envelhece. Confirme na fonte atual ou testando, e diga quando algo for hipótese.
- Respeite os limites de acesso: sem acesso à infraestrutura, peça a saída de comandos de leitura; nunca peça nem aceite segredos reais.

## Manutenção e aprendizado

- Ao encontrar sinais de código difícil de entender ou manter, avalie se uma refatoração é apropriada.
- Mantenha-se atento a mudanças nas ferramentas, bibliotecas e práticas relevantes para as tecnologias do projeto.
- Compartilhe conhecimento e use revisões, documentação e recursos da comunidade para melhorar continuamente as práticas do projeto.
