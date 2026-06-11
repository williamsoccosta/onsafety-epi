# Plan 001: Every privileged server action enforces perfil authorization

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 823d4e3..HEAD -- src/app/colaboradores/actions.ts src/app/epis/actions.ts src/app/obras/actions.ts src/app/movimentacoes/actions.ts src/app/auth/actions.ts src/lib/auth.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `823d4e3`, 2026-06-11

## Why this matters

This is a Brazilian NR-06 PPE-compliance system. Authorization is enforced today in two places: the Postgres RLS policies (database layer) and exactly ONE server action (`src/app/usuarios/actions.ts`, which calls `requirePerfil("supervisor")`). Every other privileged server action — creating employees, EPIs, work sites, stock movements, and signatures — performs **no authorization check at all** and relies solely on RLS. That means a logged-in user of any perfil can invoke these actions directly; if an RLS policy is ever loosened, dropped, or has a gap, there is no second line of defense. The fix is mechanical: the helper functions already exist (`requirePerfil`, `podeRegistrarMovimentacao`, etc. in `src/lib/auth.ts`), they are simply not called. Adding them gives defense-in-depth and makes the access model legible in the application code, not only in SQL.

## Current state

The authorization helpers already exist and are unused outside `usuarios`:

`src/lib/auth.ts:33-46`:
```ts
export async function requirePerfil(...perfis: Perfil[]): Promise<PerfilUsuario> {
  const p = await getPerfilAtual();
  if (!p || !perfis.includes(p.perfil)) redirect("/");
  return p;
}

export function podeRegistrarMovimentacao(p: Perfil) {
  return ["supervisor", "almoxarife", "tecnico_seguranca"].includes(p);
}
export function podeCadastrarColaborador(p: Perfil) {
  return ["supervisor", "administrativo"].includes(p);
}
export function podeCadastrarObra(p: Perfil) { return p === "supervisor"; }
export function podeGerenciarUsuarios(p: Perfil) { return p === "supervisor"; }
```

The exemplar to match — the ONLY action that already guards, `src/app/usuarios/actions.ts:7-8`:
```ts
export async function criarUsuario(formData: FormData) {
  await requirePerfil("supervisor");
  // ...
```

The matrix to enforce (from the project's RLS policies in `scripts/rls-por-perfil.sql`, and the `pode*` helpers above):

| Action | Allowed perfis |
|--------|----------------|
| Register/edit movement (incl. signed delivery) | supervisor, almoxarife |
| Create/toggle colaborador | supervisor, administrativo |
| Create/toggle obra | supervisor |
| Create/toggle/update EPI item | supervisor, almoxarife |
| Save/delete signature | supervisor, almoxarife |

> Note: `podeRegistrarMovimentacao` includes `tecnico_seguranca`, but the SQL RLS for `epi.movimentacoes` INSERT allows only `('supervisor','almoxarife')`. **The SQL is the source of truth** (técnico is read-only by design — see `CONTEXT.md` perfil table). Use `supervisor, almoxarife` for movement actions and do NOT rely on `podeRegistrarMovimentacao`. This mismatch is addressed in Step 6.

Unguarded actions that must be fixed:

- `src/app/colaboradores/actions.ts:6` `criarColaborador`, `:29` `alternarAtivo` — no guard.
- `src/app/epis/actions.ts:6` `criarEPI`, `:28` `alternarAtivoEPI`, `:35` `atualizarParametrosEPI` — no guard.
- `src/app/obras/actions.ts:6` `criarObra`, `:25` `alternarAtiva` — no guard.
- `src/app/movimentacoes/actions.ts:12` `registrarMovimentacao`, `:40` `registrarEntregaComAssinatura` — no guard.
- `src/app/auth/actions.ts:26` `salvarAssinatura`, `:43` `apagarAssinatura` — no guard. (NOTE: `loginAction` and `logoutAction` in the same file must NOT be guarded — they run pre-auth.)

Convention: actions return `{ error: string | null }` on validation failure. But `requirePerfil` **redirects** (throws) on failure rather than returning — that is the established pattern from `criarUsuario` and is acceptable here: an unauthorized direct call is not a normal user path, so redirecting to `/` is correct. Match `criarUsuario` exactly — call `await requirePerfil(...)` as the first line, before reading FormData.

## Commands you will need

| Purpose   | Command            | Expected on success |
|-----------|--------------------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0, no errors   |
| Build     | `npm run build`    | exit 0, "Compiled successfully" |

This repo has **no test runner** (see plan 005 context — there is none yet). Verification is typecheck + build + the grep checks in Done criteria.

## Scope

**In scope** (the only files you should modify):
- `src/app/colaboradores/actions.ts`
- `src/app/epis/actions.ts`
- `src/app/obras/actions.ts`
- `src/app/movimentacoes/actions.ts`
- `src/app/auth/actions.ts`

**Out of scope** (do NOT touch):
- `src/app/usuarios/actions.ts` — already guarded correctly; leave it.
- `src/lib/auth.ts` — the helpers are correct as-is; do not edit (Step 6 only removes dead helpers IF you do that optional step, see below).
- Any RLS SQL in `scripts/` — database policies are correct and out of scope.
- `loginAction`, `logoutAction` in `auth/actions.ts` — must remain unguarded.

## Git workflow

- Branch: `advisor/001-authz-server-actions`
- One commit for the whole plan is fine; message style matches repo (Portuguese, imperative). Example from `git log`: `feat: descontinua perfil colaborador (sem login de colaborador)`. Suggested message: `fix: exige autorizacao por perfil nas server actions privilegiadas`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Guard colaboradores actions

In `src/app/colaboradores/actions.ts`, add `import { requirePerfil } from "@/lib/auth";` to the imports. Make `await requirePerfil("supervisor", "administrativo");` the FIRST statement inside both `criarColaborador` and `alternarAtivo`.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 2: Guard epis actions

In `src/app/epis/actions.ts`, add the `requirePerfil` import. Make `await requirePerfil("supervisor", "almoxarife");` the first statement inside `criarEPI`, `alternarAtivoEPI`, and `atualizarParametrosEPI`.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 3: Guard obras actions

In `src/app/obras/actions.ts`, add the import. Make `await requirePerfil("supervisor");` the first statement inside `criarObra` and `alternarAtiva`.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 4: Guard movimentacoes actions

In `src/app/movimentacoes/actions.ts`, add the import. Make `await requirePerfil("supervisor", "almoxarife");` the first statement inside `registrarMovimentacao` and `registrarEntregaComAssinatura` (before the existing `const supabase = ...` line).

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 5: Guard signature actions (NOT login/logout)

In `src/app/auth/actions.ts`, add `requirePerfil` to the existing `@/lib/auth` import if present, otherwise add the import. Make `await requirePerfil("supervisor", "almoxarife");` the first statement inside `salvarAssinatura` and `apagarAssinatura` ONLY. Do NOT add any guard to `loginAction` or `logoutAction`.

**Verify**: `npx tsc --noEmit` → exit 0, then `npm run build` → "Compiled successfully".

### Step 6 (optional cleanup): reconcile the dead helpers

The functions `podeRegistrarMovimentacao`, `podeCadastrarColaborador`, `podeCadastrarObra`, `podeGerenciarUsuarios` in `src/lib/auth.ts:39-46` are now still unused (this plan uses inline `requirePerfil` arg lists, matching `criarUsuario`). `podeRegistrarMovimentacao` is also **inconsistent** with the SQL (it lists `tecnico_seguranca`, which the DB denies for writes). Leaving them is harmless but misleading.

This step is OPTIONAL and may be deferred to a separate tech-debt pass. If you do it: delete those four functions from `src/lib/auth.ts`. If deleting causes any typecheck error, an importer exists you didn't expect — STOP and report instead. If you skip it, note "Step 6 deferred" in the status row.

**Verify (if done)**: `grep -rn "podeRegistrarMovimentacao\|podeCadastrarColaborador\|podeCadastrarObra\|podeGerenciarUsuarios" src/` → no matches, then `npx tsc --noEmit` → exit 0.

## Test plan

No test runner exists in this repo yet (a Vitest setup is proposed separately in plan 005). Do not add one here. Verification for this plan is:

- `npx tsc --noEmit` passes.
- `npm run build` succeeds.
- Manual reasoning check (record in your report, do not automate): for each guarded action, the `requirePerfil(...)` arg list matches the matrix table in "Current state".

If plan 005 (test infra) has already landed when you execute this, add one test per guarded action asserting it redirects/throws for a disallowed perfil — model it after whatever auth-mock pattern 005 established. Otherwise skip.

## Done criteria

ALL must hold:

- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm run build` exits 0 with "Compiled successfully".
- [ ] `grep -rn "requirePerfil" src/app/colaboradores/actions.ts src/app/epis/actions.ts src/app/obras/actions.ts src/app/movimentacoes/actions.ts` → at least one match in each file.
- [ ] `grep -n "requirePerfil" src/app/auth/actions.ts` → matches inside `salvarAssinatura` and `apagarAssinatura` but the file still contains unguarded `loginAction`/`logoutAction`.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back (do not improvise) if:

- The "Current state" excerpts don't match the live code (drift since `823d4e3`).
- Any action you're guarding already contains a `requirePerfil` call (someone partially did this) — report which, don't double-guard.
- `requirePerfil` is no longer exported from `src/lib/auth.ts`, or its signature changed.
- Step 6 deletion breaks a typecheck (an unexpected importer exists).

## Maintenance notes

- New server actions must call `requirePerfil` as their first line; consider this the project convention from now on. A reviewer should reject any new `actions.ts` export that mutates data without it.
- The guard arg lists must stay in sync with `scripts/rls-por-perfil.sql`. If the RLS matrix changes, update both.
- `requirePerfil` redirects to `/` on failure (does not return `{ error }`). That's intentional for unauthorized direct calls; do not "fix" it to return an error shape without checking how forms consume it.
