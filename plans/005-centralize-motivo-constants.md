# Plan 005: Movement-motivo constants have one source of truth

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 823d4e3..HEAD -- src/app/movimentacoes/form.tsx src/app/movimentacoes/actions.ts`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (touches `movimentacoes/actions.ts`; if running alongside 001/002/003, land this last — it edits the top-of-file constants region)
- **Category**: tech-debt
- **Planned at**: commit `823d4e3`, 2026-06-11

## Why this matters

The list of movement motivos and the subset that counts as stock outflow (`SAIDA`) are declared independently in two files. Add or rename a motivo and you must edit both; miss one and the client form can offer a motivo the server rejects (or vice versa). The values must also stay accent-free to satisfy a Postgres CHECK constraint (documented in `CONTEXT.md` and enforced in `scripts/`). One shared constants module removes the drift and gives a single place that the DB constraint comment can point at.

## Current state

Duplicated declarations:

`src/app/movimentacoes/form.tsx:6-7` (client component):
```ts
const MOTIVOS = ["Entrada", "Quantidade Inicial", "Entrega", "Substituicao", "Devolucao"];
const SAIDA = ["Entrega", "Devolucao", "Substituicao"];
```

`src/app/movimentacoes/actions.ts:8-10` (server actions):
```ts
const SAIDA = ["Entrega", "Devolucao", "Substituicao"];
// Motivos do fluxo de balcao — exigem assinatura do colaborador
const MOTIVOS_BALCAO = ["Entrega", "Substituicao"];
```

`SAIDA` is identical in both. `MOTIVOS` (full list, form-only) and `MOTIVOS_BALCAO` (counter-flow subset, server-only) each live in one place but logically belong with the others. No `src/lib/constants.ts` exists yet. The project keeps shared types in `src/lib/types.ts` (e.g. `Perfil`, `LABELS_PERFIL`) — that is the convention for shared, framework-agnostic values; a `src/lib/constants.ts` sits naturally beside it.

Important: the strings must remain **exactly** as written (accent-free: "Substituicao", "Devolucao") — a Postgres CHECK constraint rejects other spellings. Do not "correct" the Portuguese.

## Commands you will need

| Purpose   | Command            | Expected on success |
|-----------|--------------------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0, no errors   |
| Build     | `npm run build`    | exit 0, "Compiled successfully" |

No test runner exists in this repo.

## Scope

**In scope**:
- `src/lib/constants.ts` (create)
- `src/app/movimentacoes/form.tsx` (import instead of declare)
- `src/app/movimentacoes/actions.ts` (import instead of declare)

**Out of scope**:
- The Postgres CHECK constraint / any SQL — leave it; the constants must match it, not the reverse.
- Any behavior change to how motivos are used (sign logic, balcão gating) — pure extraction.

## Git workflow

- Branch: `advisor/005-motivo-constants`
- Single commit, Portuguese imperative, e.g. `refactor: centraliza constantes de motivo em lib/constants`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create the constants module

Create `src/lib/constants.ts`:
```ts
// Motivos de movimentacao de EPI.
// IMPORTANTE: sem acentos — alinhado a um CHECK constraint no Postgres
// (ver scripts/ e CONTEXT.md). Nao altere a grafia sem mudar a constraint.
export const MOTIVOS = [
  "Entrada",
  "Quantidade Inicial",
  "Entrega",
  "Substituicao",
  "Devolucao",
] as const;

// Motivos que reduzem o estoque (quantidade negativa).
export const SAIDA = ["Entrega", "Devolucao", "Substituicao"] as const;

// Motivos do fluxo de balcao que exigem assinatura do colaborador (NR-06).
export const MOTIVOS_BALCAO = ["Entrega", "Substituicao"] as const;
```

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 2: Consume from the form

In `src/app/movimentacoes/form.tsx`, delete the local `MOTIVOS` and `SAIDA` declarations (lines 6-7) and add `import { MOTIVOS, SAIDA } from "@/lib/constants";`.

If TypeScript complains that a `readonly` tuple (`as const`) isn't assignable where a mutable `string[]` is expected (e.g. `.includes` on `SAIDA`, or `.map` over `MOTIVOS`), that's expected and fine — `.includes`/`.map` work on readonly arrays. Only if an assignment to a `string[]`-typed variable fails, change that variable's type to `readonly string[]`. Do NOT drop `as const` from the constants.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 3: Consume from the actions

In `src/app/movimentacoes/actions.ts`, delete the local `SAIDA` and `MOTIVOS_BALCAO` declarations (lines 8-10) and add `import { SAIDA, MOTIVOS_BALCAO } from "@/lib/constants";`. Keep all usages (`SAIDA.includes(motivo)`, `MOTIVOS_BALCAO.includes(motivo)`) as they are.

**Verify**: `npx tsc --noEmit` → exit 0, then `npm run build` → "Compiled successfully".

### Step 4: Confirm no local re-declarations remain

**Verify**: `grep -rn "^const SAIDA\|^const MOTIVOS" src/app/movimentacoes/` → **zero matches** (both files now import).

## Test plan

No test runner exists. Manual verification:
- `npm run build` succeeds — proves both files resolve the import and types line up.
- Trace: the form's motivo `<select>` still renders all five `MOTIVOS`; the server still negates quantity for `SAIDA` motivos and still gates the balcão on `MOTIVOS_BALCAO`. No value changed.

If plan 005-test-infra-equivalent lands later, a trivial test asserting `SAIDA.every(m => MOTIVOS.includes(m))` documents the invariant. Optional.

## Done criteria

ALL must hold:

- [ ] `src/lib/constants.ts` exists exporting `MOTIVOS`, `SAIDA`, `MOTIVOS_BALCAO`.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm run build` exits 0 with "Compiled successfully".
- [ ] `grep -rn "^const SAIDA\|^const MOTIVOS" src/app/movimentacoes/` → zero matches.
- [ ] Only the three in-scope files modified/created (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- The constant declarations in "Current state" don't match live code (drift).
- Removing `as const` seems necessary to satisfy types — STOP; the right fix is `readonly string[]` on the consuming variable, not weakening the constants. Report if that doesn't resolve it.

## Maintenance notes

- Adding a motivo now means: edit `src/lib/constants.ts` AND the Postgres CHECK constraint in `scripts/`. The constants file comment says so — keep that comment accurate.
- A reviewer should confirm no third copy of these lists reappears elsewhere (e.g. a future report page); point such code at `@/lib/constants`.
