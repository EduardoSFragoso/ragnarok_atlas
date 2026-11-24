# Regras de desenvolvimento

## Princípios gerais

- Prefira soluções simples, claras e fáceis de manter.
- Evite implementar funcionalidades ou abstrações antes de existir uma necessidade concreta (YAGNI).
- Evite duplicar regras de negócio: extraia lógica compartilhada quando isso tornar o código mais claro (DRY).
- Separe responsabilidades entre módulos, funções e classes.
- Aplique os princípios SOLID quando ajudarem a manter o sistema modular e compreensível; não crie abstrações sem necessidade.
- Preserve o comportamento existente, exceto quando a tarefa pedir explicitamente uma mudança.

## Organização e legibilidade

- Use nomes descritivos e específicos para variáveis, funções, classes e módulos.
- Siga as convenções de nomenclatura da linguagem e do projeto. Mantenha o mesmo padrão em todo o código.
- Mantenha a formatação e a indentação consistentes com os arquivos próximos.
- Use espaços em branco para separar blocos de lógica relacionados.
- Escreva código que explique a própria intenção sempre que possível.
- Use comentários para explicar decisões, regras de negócio não óbvias, limitações ou workarounds — não para repetir literalmente o que o código já mostra.
- Marque tarefas pendentes com `TODO` e descreva o que falta.

## Documentação

- Mantenha um `README.md` na raiz com o propósito do projeto, configuração e instruções de uso.
- Documente entradas, saídas, arquitetura relevante e particularidades necessárias para manter ou operar o projeto.
- Escreva docstrings para funções, classes ou módulos cuja finalidade, parâmetros, retornos ou efeitos não sejam óbvios.
- Mantenha a documentação atualizada quando uma mudança alterar o comportamento ou o modo de usar o projeto.
- Ao concluir um trabalho grande, escreva ou atualize um `handoff.md`: estrutura, comandos, contratos que não podem quebrar, armadilhas conhecidas e pendências. Atualize-o na mesma alteração que mudar algo estrutural.

## Qualidade, erros e testes

- Escreva testes para validar o comportamento esperado, incluindo casos-limite e entradas inválidas relevantes.
- Use dados fictícios pequenos com resultados conhecidos para validar alterações.
- Prefira testes unitários para funções e componentes isolados; adicione outros tipos de teste quando o projeto exigir.
- Considere escrever ou atualizar os testes antes da implementação (TDD), quando isso for adequado à tarefa.
- Trate erros previsíveis de forma explícita e útil.
- Capture exceções específicas; não oculte erros com tratamento genérico ou silencioso.
- Não considere uma mudança concluída até revisar o código e executar os testes pertinentes.
- Antes de refatorar código existente, crie uma rede de segurança (testes de caracterização, snapshot ou equivalente) e, ao final, prove que o comportamento não mudou.
- Um teste novo só prova algo se falhar no código antigo ou com o defeito reintroduzido; confirme isso quando o teste cobrir um bug corrigido.
- Teste falhas e mutações em uma cópia descartável; nunca deixe código alterado só para testar, nem arquivos temporários, no commit.

## Desempenho e uso de recursos

- Priorize a clareza; não otimize prematuramente.
- Meça o desempenho antes de otimizar e concentre-se nos gargalos observados (o site carrega todo o `data/` de uma vez; mudanças de formato de dados precisam ser medidas, não supostas).
- Evite loops ou iterações desnecessários.
- Para dados que crescerem (novos episódios em `data/`), avalie paginação/carregamento sob demanda antes de aceitar lentidão.
- Documente otimizações que tornem o código significativamente menos óbvio.

## Ferramentas e padrões automáticos

- Use os linters, formatadores e verificadores de tipos adotados pelo projeto.
- Prefira executar essas ferramentas automaticamente no editor ou no pipeline de CI/CD.
- Em projetos Python (`tools/`), use as ferramentas já configuradas no repositório (Ruff e `unittest`).
- Em projetos JavaScript/TypeScript, siga a configuração existente, por exemplo ESLint e Prettier.
- Não introduza uma ferramenta nova sem necessidade; respeite primeiro as dependências e convenções existentes.
- Exceção ao item sobre ferramentas novas: elas são aceitáveis quando criam uma rede de segurança ou fecham um risco real; registre o motivo no `handoff.md`.
- Na CI, declare `permissions` mínimas (por exemplo `contents: read`), mantenha o Dependabot (ou equivalente) ativo e atualize as GitHub Actions.

## Git e colaboração

- Use Git para registrar o trabalho, inclusive em projetos individuais.
- Faça commits com mensagens objetivas que descrevam o propósito da mudança.
- Use branches para isolar alterações quando o fluxo do projeto exigir.
- Revise diferenças e resolva conflitos conscientemente antes de integrar mudanças.
- Abra pull requests quando esse for o processo do projeto; descreva a mudança e facilite sua revisão.
- Revise o código — próprio ou de outras pessoas — procurando erros, problemas de segurança, duplicação e sinais de complexidade desnecessária.
- Refatore para melhorar a estrutura sem alterar o comportamento esperado, salvo quando a tarefa pedir o contrário.
- Nunca faça push direto na branch principal: trabalhe em branch e abra PR, respeitando a proteção da branch (checks obrigatórios, aprovação e método de merge descritos no `handoff.md`).
- Escreva o assunto do commit com até 70 caracteres, para que não seja cortado no título do PR; coloque os detalhes no corpo da mensagem.
- Quem não puder dar push entrega patches (`git format-patch`) gerados sobre a branch principal **atual** e verificados num clone limpo (`git am` e todas as verificações do projeto). Se a principal mudar, refaça o patch.
- Inclua no mesmo commit os artefatos derivados que a mudança alterar (lockfiles, hashes de cache, arquivos gerados).

## Configuração do repositório: PRs e commits

- O agente não altera configurações do repositório (rulesets, proteção de branch, segredos, permissões de Actions, Pages) nem contorna as proteções existentes (bypass, push forçado, desativar checks). Se uma configuração atrapalhar, explique o problema e proponha a mudança para a pessoa aplicar.
- Siga o template de PR (`.github/pull_request_template.md`), se existir. Todo PR descreve o que mudou e por quê, como foi testado e quais os riscos; prefira PRs pequenos e focados em um assunto.
- Siga a política de assinatura e de autoria de commits descrita no `handoff.md` e não a desative.
- Antes de cada commit, confira `git status` e `git diff --staged`: nada de segredos, `.env`, dumps, binários ou artefatos de build (`target/`, `build/`, `node_modules/`, `dist/`). Mantenha o `.gitignore` em dia.
- Se um segredo for commitado, trate-o como vazado: rotacione a credencial primeiro. Reescrever o histórico é opcional e vem depois.
- Checklist de configuração para quem administra o repositório: `docs/configuracao-repositorio.md`.

## Segurança e proteção de dados

- Valide e higienize toda entrada antes de usá-la (importante no ponto de injeção de HTML do site: dados de `data/`, texto do usuário em busca e campos de formulário).
- Nunca inclua senhas, tokens, chaves ou outras credenciais diretamente no código ou em configurações versionadas.
- Restrinja o acesso a dados e recursos ao mínimo necessário e revise permissões relevantes.
- Use criptografia e protocolos seguros apropriados para dados armazenados ou transmitidos; prefira bibliotecas e APIs mantidas e consolidadas.
- Mantenha dependências atualizadas e avalie a segurança de bibliotecas e componentes de terceiros.
- Inclua verificações de segurança no fluxo de revisão e teste, usando ferramentas automáticas e avaliação especializada quando apropriado.
- Nunca leia, exiba nem faça commit de `.env` ou de arquivos de credenciais; mascare valores secretos em logs, saídas e mensagens. Peça um `.env.example` com os nomes das variáveis, nunca os valores.
- Em repositório novo, varra o código **e o histórico do Git** em busca de segredos. Se achar algum, pare e avise: o passo é **rotacionar** a credencial. Apagá-la do código não basta, porque o histórico guarda o valor.
- Em repositório público, todo o histórico é público. No frontend só podem existir chaves feitas para serem públicas.
- A única credencial do projeto é a chave da API Divine Pride (`DP_API_KEY`), usada só pelo workflow e pelas
  ferramentas locais de `tools/`, sempre via segredo do repositório ou variável de ambiente e mascarada em logs.

## Deste projeto (site estático no Pages)

- Sem back-end, sem banco, sem deploy de servidor: tudo que existe é dado público de jogo em `data/` e código próprio.
- O Pages publica a raiz do repositório, então **todo arquivo versionado é baixável por URL** — nada sensível na árvore.
- A única integração externa é leitura da API Divine Pride por HTTPS; o conteúdo dela entra em `data/`/`tools/cache/` por PR, nunca por push direto.
- O aviso de fan project (README e página "Fontes & referências") não pode ser removido.

## Uso de assistentes de IA

- Considere código gerado por IA como uma sugestão que precisa de revisão, não como uma implementação automaticamente confiável.
- Antes de aceitar uma sugestão, verifique sua correção, segurança, compatibilidade com a arquitetura e aderência aos padrões do projeto.
- Entenda o código antes de usá-lo ou enviá-lo ao repositório; consiga explicar o que cada trecho faz.
- Para tarefas grandes, comece propondo um plano em etapas antes de modificar o código.
- Ao pedir ajuda à IA, informe linguagem, framework, requisitos, restrições de desempenho e requisitos de segurança relevantes.
- Siga estas regras de contexto e as instruções específicas do repositório.
- Em um repositório novo, a primeira etapa é uma auditoria sem alterações (estrutura, riscos, segredos, testes, CI, dependências); só depois proponha o plano.
- Execute as verificações do projeto (formatação, lint, testes, build) antes de declarar a tarefa concluída e informe com clareza o que não pôde ser verificado (navegador real, resultado da CI, infraestrutura).
- Não presuma o comportamento de ferramentas e serviços: a documentação envelhece. Confirme na fonte atual ou testando, e diga quando algo for hipótese.
- Respeite os limites de acesso: sem acesso à infraestrutura, peça a saída de comandos de leitura; nunca peça nem aceite segredos reais.

## Manutenção e aprendizado

- Ao encontrar sinais de código difícil de entender ou manter, avalie se uma refatoração é apropriada.
- Mantenha-se atento a mudanças nas ferramentas, bibliotecas e práticas relevantes para as tecnologias do projeto.
- Compartilhe conhecimento e use revisões, documentação e recursos da comunidade para melhorar continuamente as práticas do projeto.
