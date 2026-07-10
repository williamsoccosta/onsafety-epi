# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/). Versionamento em [SemVer](https://semver.org/lang/pt-BR/). Commits seguem [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/).

> Histórico anterior a este arquivo fica só no `git log` (os commits já usavam prefixos `feat:`/`fix:`/`docs:` informalmente, sem changelog dedicado). Este arquivo passa a ser mantido a partir de 2026-07-10.

## [Não lançado]

## [0.2.0] - 2026-07-10

### Added
- Formulário `/rh/novo` dividido em duas etapas (dados básicos → dados complementares), com indicador de progresso, foco movido entre etapas e dados preservados ao voltar.
- Validação de CPF por dígito verificador (módulo 11) no cadastro de funcionário — client bloqueia avanço, server revalida antes do insert (`src/lib/cpf.ts`).
- `design.md` como fonte da verdade de design (tokens, componentes, acessibilidade, antipadrões).
- `README.md` reescrito: produto, como rodar, estrutura de pastas, pointers para `AGENTS.md`/`design.md`/`CONTEXT.md`.
- `AGENTS.md` com convenções de projeto, leitura obrigatória de `CONTEXT.md`/`design.md` antes de mexer em domínio/UI.
- Discovery, PRD e regras de negócio do hub de sincronização de Pessoas Físicas (`docs/prd-hub-pessoas-fisicas.md`, `docs/regras-negocio-hub-pessoas-fisicas.md`) — ainda em desenho, não implementado.
- `CHANGELOG.md` e convenção de versionamento (Conventional Commits, branch por tarefa, SemVer) documentada em `AGENTS.md`.
- Pasta `.claude/skills/` com 12 skills de design/frontend (criação, avaliação e disciplina de design system).
