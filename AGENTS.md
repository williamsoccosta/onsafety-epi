<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — onsafety-epi

## Projeto
App Next.js de gestão de almoxarifado de EPI para canteiros de obra da FAAB Engenharia. Uso em campo por almoxarife/supervisor/administrativo — mobile-first.

## Comandos
- dev / build / start / lint (você roda por mim quando eu pedir). Não há script de test configurado hoje.

## Versionamento
- Commits seguem [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/) (`feat:`, `fix:`, `docs:`, `refactor:`, etc.) — mensagem clara do que mudou e por quê.
- Branch por tarefa: uma mudança isolada por vez, não misturar features/fixes não relacionados no mesmo branch.
- A cada feature concluída, adicionar uma linha em [CHANGELOG.md](CHANGELOG.md) (formato Keep a Changelog) e sugerir a próxima versão SemVer (`feat` sem breaking change → minor; `fix` → patch; breaking change → major, ou minor enquanto `0.x`).
- README, changelog e mensagens de commit ficam atualizados por padrão — não é preciso pedir a cada vez, isso é convenção do projeto.

## Stack & estrutura
- Next.js 16 (App Router) + React 19 + Tailwind 4 + Supabase self-hosted (`@supabase/ssr`)
- `src/app` → rotas, Server Actions (`actions.ts`) e forms por módulo · `src/components` → UI compartilhada · `src/lib` → clients Supabase, auth, tipos
- Leia SEMPRE [CONTEXT.md](CONTEXT.md) antes de mexer em domínio, schema ou fluxo de deploy.
- Leia SEMPRE [design.md](design.md) antes de criar ou alterar qualquer interface.

## Convenções
- Segue convenção de arquivo do Next.js (`page.tsx`, `actions.ts`, `form.tsx`) por rota/módulo.
- Server Actions ficam em `actions.ts` dentro da própria rota; client components só quando precisam de interatividade (`"use client"`).
- Sem design system formal de tokens — reutiliza classes Tailwind e componentes já existentes em `src/components` antes de criar novo.

## Acessibilidade (obrigatório)
- WCAG AA, foco visível, operável por teclado. Cobrir estados: loading/erro/vazio/sucesso.

## NÃO tocar
- `.env.local` e chaves SSH — nunca commitar segredos.
- Não editar arquivos direto na VPS fora do fluxo `git push` + `git pull` descrito no CONTEXT.md — mudança não commitada quebra o próximo deploy.
