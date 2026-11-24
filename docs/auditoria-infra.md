# Auditoria de infraestrutura

Checklist de auditoria **deste projeto**: um site estático publicado no GitHub Pages,
sem back-end e sem banco de dados. É referenciado pelo `AGENTS.md`.

A configuração de repositório (ruleset, Pages, Actions) tem checklist próprio:
`docs/configuracao-repositorio.md`.

**Regra de ouro:** nunca cole segredos reais (senhas, tokens, chaves, `DATABASE_URL`)
em conversas ou issues. Mascare valores e hosts em qualquer saída enviada a uma IA.

> O projeto não tem back-end nem banco. Se um dia ganhar (VM, API, Postgres), a
> checklist completa para esses casos está no histórico deste documento
> (commit `2d671c3`) e pode ser reconstituída.

## Ordem das etapas

1. Auditoria **sem alterações** (este documento).
2. Segredos: rotacionar o que estiver exposto, antes de qualquer refatoração.
3. Rede de segurança: testes de caracterização, snapshot ou equivalente.
4. CI e proteção da branch principal.
5. Refatorações, uma etapa por vez, com a rede de segurança verde.
6. `handoff.md` para quem continuar.

## 1. GitHub Pages e repositório

- Em **Settings → Pages**, veja a origem do deploy. Como **a raiz do repositório é
  publicada, todo arquivo versionado é baixável por URL** — nada sensível pode
  existir na árvore, nem em subpastas "escondidas".
- Procure arquivos sensíveis versionados:

```bash
git ls-files | grep -Ei '\.env|\.pem|\.key|dump|\.sql$|backup'
```

- Procure o mesmo no **histórico** (arquivos que já foram apagados continuam lá):

```bash
git log --all --diff-filter=A --name-only --format= | grep -Ei '\.env|\.pem|\.key|dump|\.sql$' | sort -u
```

- Use um detector de segredos no código e no histórico (por exemplo `gitleaks`
  ou `trufflehog`), rodando localmente. A única credencial do projeto é a
  `DP_API_KEY` (workflow + `tools/`), que deve aparecer só via segredo do
  repositório ou variável de ambiente, com valor mascarado em logs.
- **Enforce HTTPS** ligado em Settings → Pages.
- No frontend, só podem existir chaves feitas para serem públicas.

### Se achar um segredo

1. **Rotacione primeiro**: gere nova chave da API ou revogue o token comprometido.
2. Só depois decida se vale reescrever o histórico. A rotação é o que realmente
   protege; apagar do código não basta.

## 2. Rede de segurança

| Camada       | Proteção                                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend     | Snapshot de renderização (`tools/snapshot.mjs` via jsdom), testes dos pontos de injeção de HTML e verificação de carga (`npm run check`) |
| Dados        | Validador de esquema das tabelas (`npm run validar:dados`)                                                                               |
| Dependências | Dependabot (npm + GitHub Actions) e `npm audit`                                                                                          |

Confirme que cada teste novo **falha** no código antigo antes de confiar nele.

## 3. CI e deploy do Pages

- A CI valida exatamente o que é publicado no Pages (sintaxe, lint, formato,
  esquema de dados, snapshot de renderização, JSON válido).
- `permissions` mínimas (`contents: read`); o workflow que abre PR automático
  justifica os extras (`contents: write`, `pull-requests: write`) e roda manualmente.
- As GitHub Actions ficam atualizadas (Dependabot, `github-actions` semanal).
- Proteção da branch principal: PR obrigatório, check `checks`, branch atualizada
  e merge só por Rebase (detalhes no `handoff.md`, seção 5).
- PRs abertos pelo workflow automático ficam em _Action required_ e só rodam a CI
  depois de **Approve workflows to run** — é o comportamento esperado.

## O que o agente não deve fazer sem confirmação

Apagar branches, reescrever o histórico do Git, fazer push forçado ou alterar
configurações do repositório (ruleset, Pages, segredos, permissões de Actions).
