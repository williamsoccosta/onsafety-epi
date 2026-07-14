# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/). Versionamento em [SemVer](https://semver.org/lang/pt-BR/). Commits seguem [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/).

> Histórico anterior a este arquivo fica só no `git log` (os commits já usavam prefixos `feat:`/`fix:`/`docs:` informalmente, sem changelog dedicado). Este arquivo passa a ser mantido a partir de 2026-07-10.

## [Não lançado]

### Added
- Cadastro de funcionário (`/rh/novo`): telefone passa a ser obrigatório na etapa 1 (e-mail continua opcional), alinhado à decisão de negócio do hub de pessoas físicas.
- Cadastro de funcionário: CPF duplicado é checado antes de persistir, com aviso no topo do formulário e link direto para a ficha já existente.

### Fixed
- Cadastro de funcionário (`/rh/novo`): foco visível restaurado em todos os campos e botões (`outline-none` sem substituto violava design.md e WCAG 2.4.7), contraste do rótulo dos campos corrigido (3.42:1 → ~6.9:1, AA), alvos de toque elevados para 44px, legenda de campos obrigatórios adicionada e estado de carregamento do submit anunciado a leitor de tela.

## [0.3.1] - 2026-07-10

### Fixed
- 4 erros reais de lint pendentes do repo: navegação interna via `<a>` trocada por `<Link>`, aspas literais em JSX escapadas, `setState` dentro de `useEffect` reativo movido para o handler de evento em `filtro-coluna.tsx`, leitura de `localStorage` pós-mount documentada com `eslint-disable` pontual em `sidebar.tsx`.

## [0.3.0] - 2026-07-10

### Added
- Home vira grid de cards por módulo (Dashboard, EPI, Colaboradores, Obras, Empresas, RH, Materiais, Consulta CA, Usuários), com visibilidade por perfil; sidebar lateral único vira sidebar contextual só em EPI/Materiais.
- Módulo **Dashboard**: indicadores e gráficos extraídos da home para `/dashboard`.
- Módulo **Empresas**: cadastro de CNPJ via consulta à Receita Federal (adapter na VPS), com preenchimento automático.
- Módulo **Materiais**: catálogo geral de insumos da FAAB (5 segmentos, hierarquia segmento→categoria→tipo→insumo).
- Módulo **RH**: páginas de listagem e ficha completa do funcionário.
- Ficha do colaborador (`/colaboradores/[id]`) exibe resumo do funcionário RH vinculado (CPF, telefone, e-mail) com link para a ficha completa; listagem de colaboradores ganha coluna de status de vínculo RH.
- Obras ganham `empresa_id` (FK para `core.empresas`), com fallback pro campo `cliente` em texto livre; agrupamento por cliente usa `empresa_id` quando disponível.

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
