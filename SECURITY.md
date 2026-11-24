# Segurança

## Reportando uma vulnerabilidade

Este é um projeto de fãs, sem dados de usuários e sem back-end, mas se você
encontrou uma falha de segurança (por exemplo, injeção de HTML/JS no site ou
exposição de segredo), **não abra uma issue pública**.

1. Use o **relato privado de vulnerabilidades** do GitHub — só funciona para repositórios públicos, e é o canal deste repositório.
2. Descreva o que fazer para reproduzir (página, passos, entrada que dispara o problema).
3. Respondo e, se confirmado, corrijo antes de qualquer divulgação.

## Escopo

- **Válido**: XSS/injeção no conteúdo do site, link ou script malicioso, segredo commitado.
- **Fora de escopo**: o conteúdo do site (dados de jogo) é recolhido de fontes públicas
  e a Divine Pride (`divine-pride.net`) é consultada na sua máquina ou na GitHub Action,
  sempre por HTTPS com a chave em segredo do repositório (`DP_API_KEY`) — nunca no código.

Consulte o [handoff](handoff.md) e a
[auditoria de infraestrutura](docs/auditoria-infra.md) para os detalhes técnicos.
