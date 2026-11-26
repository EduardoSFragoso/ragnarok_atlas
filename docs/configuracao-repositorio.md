# Configuração do repositório: PRs, commits e segurança

Checklist para **quem administra o repositório**. Estas configurações ficam no GitHub e **o agente não as altera**: ele propõe e a pessoa aplica. É referenciado pelo `AGENTS.md`.

Parte do conteúdo vem da documentação oficial do GitHub (regras de rulesets). Os nomes de menus mudam com o tempo; se algum caminho não existir, procure o nome da opção em **Settings**.

## 0. Estado atual (conferido em 25/11/2026)

| Item                                                           | Estado                                                                                                                                    |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Ruleset `protege-branches` em `main` e `legado`                | Ativa (seção 1)                                                                                                                           |
| Dependabot: security updates; updates semanais (npm + actions) | Segurança ativa; versões configuradas no arquivo                                                                                          |
| Dependency graph                                               | Ativo                                                                                                                                     |
| Pages: Enforce HTTPS e deploy funcionando                      | Conforme                                                                                                                                  |
| Excluir-automaticamente as branches de PR mergeadas            | Ativo (**Settings → General → Pull Requests → Automatically delete head branches**)                                                       |
| Secret scanning com push protection                            | Ativo (seção 2)                                                                                                                           |
| Code scanning (CodeQL)                                         | Não usado — site estático simples; se quiser uma camada a mais, o CodeQL cobre JavaScript, mas aqui a rede de segurança é a CI + snapshot |
| Workflow permissions globais em Actions                        | Verificar em **Settings → Actions → General**                                                                                             |

## 1. Ruleset da branch principal

Em **Settings → Rules → Rulesets → New branch ruleset**, com alvo na branch padrão. Rulesets estão disponíveis em repositórios públicos no plano gratuito. **Neste repositório já existe a ruleset ativa `protege-branches`**, que cobre `main` e `legado`.

| Regra                                 | Recomendação                                  | Por quê                                                                                                    |
| ------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Restrict deletions                    | Ligada (já vem ligada)                        | Impede apagar a `main`                                                                                     |
| Block force pushes                    | Ligada (já vem ligada)                        | Impede reescrever o histórico publicado                                                                    |
| Require linear history                | Ligada                                        | Exige squash ou rebase no merge; histórico fácil de reverter. O repositório precisa permitir esses métodos |
| Require a pull request before merging | Ligada                                        | Nada entra sem PR                                                                                          |
| ↳ aprovações exigidas                 | 0 se há uma só pessoa; 1 ou mais se há equipe | Quem abre o PR não aprova o próprio; com 1 aprovação e um só mantenedor, o PR fica bloqueado               |
| ↳ métodos de merge permitidos         | Só o adotado (neste repo: Rebase)             | Evita o método errado por engano                                                                           |
| ↳ conversas resolvidas                | Ligada                                        | Comentários de revisão não ficam esquecidos                                                                |
| Require status checks to pass         | Ligada, com o job da CI (`checks`)            | A CI é o portão do merge                                                                                   |
| ↳ branch atualizada antes do merge    | Ligada ("strict")                             | Evita merge de código testado contra uma base velha                                                        |
| Bypass list                           | Vazia, ou só o dono para emergências          | Ninguém contorna a regra por conveniência                                                                  |

**Limite do plano:** as regras "Restrict file paths", "Restrict file extensions" e "Restrict file size" são _push rulesets_, disponíveis para repositórios **privados ou internos** no plano Team. Em repositório público gratuito, o bloqueio de `.env`, `.pem` e dumps é feito por `.gitignore`, secret scanning com push protection e um hook local (seção 2).

Assistência da IA nesta seção: a ruleset pode ser **lida** via API pública (seção 5), e o `handoff.md` (seção 5.2) registra o estado dela.

## 2. Segurança dos commits

### Segredos

- **Secret scanning e push protection:** ativos neste repositório (24/11/2026). **Atenção ao nome do menu:** a atividade única está no bloco **Secret Protection** em **Settings → Code security**, com um botão **Enable**; os toggles de secret scanning e push protection aparecem dentro dele depois de ativado. A push protection recusa o push que contém um segredo conhecido.
- **Hook local de pre-commit** com um detector de segredos (por exemplo `gitleaks`, na sintaxe atual da ferramenta). Ele barra o segredo antes de o commit existir.
- Se um segredo for commitado: **rotacione primeiro**. Apagar do código não basta, porque o histórico guarda o valor. Reescrever o histórico é opcional e vem depois.

### Assinatura de commits

Recomendada, mas **a exigência tem armadilhas**: a documentação oficial cita bloqueio de merge com commits não assinados na branch do PR e não detalha o caso do **Rebase and merge**, que é o método deste repositório. Se um dia quiser exigir (`Require signed commits` na ruleset), **teste antes num PR descartável**.

## 3. Segurança do repositório e das Actions

- **Dependabot:** alertas e atualizações de segurança ativos; atualizações semanais de npm e GitHub Actions estão no `.github/dependabot.yml` (seção 4). As Actions são fixadas por SHA completo e atualizadas pelo Dependabot.
- **Private vulnerability reporting** e um `SECURITY.md` dizendo como reportar falhas. **Já existem.**
- **Settings → Actions → General:**
    - _Workflow permissions_ em somente leitura; cada workflow declara o que precisa.
    - _Allow GitHub Actions to create and approve pull requests_ só se um workflow realmente abrir PRs.
    - Aprovação obrigatória para workflows de colaboradores externos.
- **Pages:** em **Settings → Pages**, publicar a pasta do site com _Enforce HTTPS_ ligado. **Já está conforme.**
- Sem segredos de deploy (não há deploy de servidor); a única chave do repositório é a `DP_API_KEY`, guardada nos segredos das Actions.

## 4. Arquivos de apoio no repositório

### `.github/pull_request_template.md` (o deste repositório)

```markdown
## O que mudou e por quê

## Como foi testado

- [ ] Testes e lint passam localmente
- [ ] Sem segredos, `.env`, dumps ou artefatos de build no diff

## Riscos e como reverter
```

### `.github/dependabot.yml` (o deste repositório)

```yaml
version: 2
updates:
    - package-ecosystem: npm
      directory: "/"
      schedule:
          interval: weekly

    - package-ecosystem: github-actions
      directory: "/"
      schedule:
          interval: weekly
```

### `.gitignore` (trechos essenciais)

```gitignore
.env
.env.*
!.env.example
*.pem
*.key
```

### Outros

- `SECURITY.md` com o canal de reporte de vulnerabilidades. **Já existe.**
- `CODEOWNERS`, se houver mais de uma pessoa revisando.

## 5. Como mostrar a configuração a uma IA, sem prints

Estes comandos só **leem** a configuração (precisam do GitHub CLI, `gh`) e não expõem segredos:

```bash
gh api repos/OWNER/REPO/rulesets --jq '.[] | {id, name, enforcement, target}'
gh api repos/OWNER/REPO/rulesets/ID_DA_RULESET
gh api repos/OWNER/REPO --jq '{private, default_branch, delete_branch_on_merge}'
```

A IA compara o resultado com este checklist e aponta o que falta.
