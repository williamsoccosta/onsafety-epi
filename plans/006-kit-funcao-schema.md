# Plan 006: `epi.kit_funcao` schema + cálculo de "kit incompleto"

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git log -1 --format=%H -- docs/prd-kit-por-funcao.md docs/regras-negocio-kit-por-funcao.md src/app/trocas/page.tsx scripts/`
> Compare against the commit this plan was written at (below). If any of
> these paths changed since, re-read them before proceeding — this plan
> quotes exact line ranges and SQL that may have drifted.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (schema addition is low-risk/additive; the real risk is
  building on top of unvalidated `funcao` data — see STOP conditions)
- **Depends on**: none (this is the first plan of the Kit-por-Função feature;
  plan 007, not yet written, will build the UI on top of this schema)
- **Category**: feature (schema + data-layer only, no UI)
- **Planned at**: 2026-07-17, against `feat/materiais-via-insumos-service`
  branch, informed by `docs/prd-kit-por-funcao.md` and
  `docs/regras-negocio-kit-por-funcao.md` (both already merged to this
  branch as of planning time).

## Why this matters

The system today has no notion of "which EPIs does this function require."
`epi.colaboradores.funcao` is free text with no catalog behind it, so the
almoxarife decides what to deliver by consulting an external certification
document, by memory. Nothing in the app validates that decision or flags
when a colaborador is missing a required item. `docs/prd-kit-por-funcao.md`
scopes the full feature (schema + CRUD UI + "kit sugerido" in nova-entrega +
Dashboard indicator); this plan is **only the schema and the reusable
calculation logic** that every later UI piece depends on. Landing this first,
isolated, lets the calculation be validated against real data (via the
diagnostic query in Step 0) before any UI commits to a match strategy.

## Current state

- `epi.colaboradores.funcao` is a plain `text` column, no FK, no enum
  (`src/app/colaboradores/actions.ts:12`, `src/app/colaboradores/page.tsx:48`).
  No `funcoes`/`cargos` table exists in any schema (`epi`, `rh`, `catalogo`).
- `epi.itens` is the item catalog, kept in sync from an external catalog via
  trigger `trg_sync_itens` (per `CONTEXT.md:126-127`). Any new table
  referencing an item must FK to `epi.itens(id)`.
- PostgREST does not resolve cross-schema joins in this project (established
  rule per `CONTEXT.md`) — this is *why* `movimentacoes.epi_id` points at
  `epi.itens` instead of the external catalog directly, and it's why the new
  table must live in the `epi` schema too, not a separate one.
- There is **no migrations framework**. `scripts/` contains standalone `.sql`
  files (`estoque-minimo.sql`, `rls-por-perfil.sql`, `rls-storage-assinaturas.sql`,
  `test-rls.sql`, plus two `hub-pessoas-*.sql` files) applied ad hoc, by hand,
  via `psql` against the VPS database. There is no version/checksum tracking
  table and no `migrations/` directory anywhere in the repo (confirmed: `find`
  for `*migration*` returns nothing). `scripts/estoque-minimo.sql` is the
  simplest precedent — a single idempotent `ALTER TABLE ... ADD COLUMN IF NOT
  EXISTS`. `scripts/rls-por-perfil.sql` is the precedent for policy scripts —
  `DROP POLICY IF EXISTS` followed by `CREATE POLICY`, grouped by table with a
  comment banner, referencing `public.perfil_atual()`.
- The dedup pattern for "active delivery per colaborador+EPI" already exists
  in `src/app/trocas/page.tsx:33-52` (used for the "Trocas vencidas" Dashboard
  indicator, `src/app/dashboard/page.tsx:101-114`). It queries
  `epi.movimentacoes` filtered to `motivo in ("Entrega","Substituicao")`,
  ordered `criado_em desc`, then walks rows once building a `Set<string>` of
  `colaborador_id + ":" + epi_id` — the first (most recent, because of the
  `desc` order) occurrence of a key wins and is treated as the colaborador's
  current/active delivery of that item; later rows with the same key are
  skipped. This exact pattern is what Regra 2 in
  `docs/regras-negocio-kit-por-funcao.md` says to replicate for "kit
  incompleto" — not a new SQL aggregate, in-memory in the server component,
  same as the rest of the Dashboard.
- Proposed schema already drafted in
  `docs/regras-negocio-kit-por-funcao.md` "Modelo de dados":
  ```sql
  create table epi.kit_funcao (
    id uuid primary key default gen_random_uuid(),
    funcao text not null,
    epi_id uuid not null references epi.itens(id),
    criado_em timestamptz not null default now(),
    unique (funcao, epi_id)
  );
  ```
  This plan validates and finalizes that draft (Step 1) rather than inventing
  a new shape.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0, no errors |
| Build | `npm run build` | exit 0, "Compiled successfully" |
| Apply SQL script (manual, ad hoc — this project's only mechanism) | `psql "$DATABASE_URL" -f scripts/kit-funcao-schema.sql` | no errors; run against a **non-production** connection first if one is available, otherwise coordinate a maintenance window — this plan touches the real schema |
| Diagnostic query (Step 0) | `psql "$DATABASE_URL" -f scripts/kit-funcao-diagnostico.sql` | prints distinct `funcao` values + counts, see Step 0 |

No test runner exists in this repo (`plans/README.md`). Verification here is
SQL-execution success + `tsc`/`build` for the TS calculation helper.

## Scope

**In scope**:
- `scripts/kit-funcao-diagnostico.sql` (create) — read-only diagnostic query,
  Step 0.
- `scripts/kit-funcao-schema.sql` (create) — `CREATE TABLE epi.kit_funcao`
  and its RLS policies, Step 1–2.
- A shared TS calculation helper for "kit incompleto" (exact location decided
  in Step 3 — likely `src/lib/kit-funcao.ts` or colocated under
  `src/app/kits-funcao/` if plan 007 creates that route first; this plan
  creates the helper standalone with no route dependency), Step 3.
- Updating `plans/README.md`'s table with this plan's row.

**Out of scope** (do NOT touch — separate plans):
- Any UI: no CRUD screen for kit_funcao, no changes to
  `nova-entrega`/`entrega-form.tsx`, no Dashboard `MetricCard`. That's plan
  007 (not yet written), which will depend on this one.
- Final RLS policy sign-off. Step 2 writes a policy that *mirrors* the
  existing "Cadastrar/editar EPI" permission row (supervisor-only write,
  everyone-with-a-perfil read) by direct analogy, exactly as
  `docs/regras-negocio-kit-por-funcao.md` Regra 6 marks `[VALIDAR]` — **this
  plan does not get a security sign-off on that mapping**, it only implements
  the analogy already used elsewhere in the codebase (`rls-por-perfil.sql`).
  If product/security later says the analogy is wrong, that's a follow-up
  plan, not a revision of this one's completed work.
- Normalizing `epi.colaboradores.funcao` or building a `funcoes`/`cargos`
  table (explicitly a separate backlog item, "Funções (RH)", `CONTEXT.md:167`).
- Any data cleanup of existing `funcao` values.
- Occupational-risk-by-function modeling (separate backlog item,
  `CONTEXT.md:168`).

## Git workflow

- Branch: `advisor/006-kit-funcao-schema`
- Commit per step is fine; Portuguese imperative messages, e.g. `feat: cria
  tabela epi.kit_funcao e helper de calculo de kit incompleto`
- Do NOT push or open a PR unless instructed.
- Do NOT run the schema/RLS SQL against the production database without
  explicit human confirmation first — see STOP conditions. Committing the
  `.sql` files to git is fine and expected; *executing* them against the real
  DB is the sensitive action.

## Steps

### Step 0: Run the diagnostic query BEFORE writing the `unique` constraint

This is the most important step in the plan — read the STOP conditions
section before doing anything else. The PRD (`docs/prd-kit-por-funcao.md`,
"Dúvidas que ainda impedem implementação segura", #2) and the regras doc
(Regra 1, "Riscos técnicos" #3) both flag the same open question: **nobody
has confirmed how many distinct `funcao` values exist in the real data, or
how dirty they are** (casing, trailing whitespace, near-duplicate strings
like "Pedreiro" vs "Pedreiro Oficial").

Create `scripts/kit-funcao-diagnostico.sql`:
```sql
-- Diagnostico read-only: distribuicao de epi.colaboradores.funcao
-- Rodar ANTES de aplicar kit-funcao-schema.sql. Nao altera dados.

-- 1. Contagem de colaboradores por valor exato de funcao (revela variacao de grafia)
select funcao, count(*) as colaboradores
from epi.colaboradores
where ativo is true  -- ajustar nome da coluna de status se diferente; confirmar em colaboradores/actions.ts
group by funcao
order by colaboradores desc;

-- 2. Quantos valores distintos colapsariam sob trim+lower (candidatos a variacao de grafia)
select lower(trim(funcao)) as funcao_normalizada, count(distinct funcao) as variantes_grafia, count(*) as colaboradores
from epi.colaboradores
where ativo is true
group by lower(trim(funcao))
having count(distinct funcao) > 1
order by colaboradores desc;

-- 3. Totais gerais
select
  count(distinct funcao) as funcoes_distintas_exatas,
  count(distinct lower(trim(funcao))) as funcoes_distintas_normalizadas,
  count(*) filter (where funcao is null or trim(funcao) = '') as colaboradores_sem_funcao
from epi.colaboradores
where ativo is true;
```

Run it read-only against the real database (`psql "$DATABASE_URL" -f
scripts/kit-funcao-diagnostico.sql`) and **paste the actual output into the
plan's status report** when you hand off. Do not proceed to Step 1's
`unique (funcao, epi_id)` constraint design without having seen this output —
see STOP conditions below for what to do depending on what it shows.

**Verify**: query runs without error; you have captured and reported the
three result sets above.

### Step 1: Create `scripts/kit-funcao-schema.sql`

Base this on the draft in `docs/regras-negocio-kit-por-funcao.md` "Modelo de
dados", written in this project's existing idempotent style (see
`scripts/estoque-minimo.sql` for the `IF NOT EXISTS` convention):

```sql
-- Kit de EPI por funcao (docs/prd-kit-por-funcao.md, docs/regras-negocio-kit-por-funcao.md)
-- Tabela nova no schema epi (evita join cross-schema do PostgREST, mesma razao
-- de movimentacoes.epi_id apontar para epi.itens em vez do catalogo externo).

create table if not exists epi.kit_funcao (
  id uuid primary key default gen_random_uuid(),
  funcao text not null,
  epi_id uuid not null references epi.itens(id),
  criado_em timestamptz not null default now(),
  unique (funcao, epi_id)
);

comment on table epi.kit_funcao is
  'Relacao funcao (texto livre, casa por string exata contra epi.colaboradores.funcao) -> EPI obrigatorio. Ver docs/regras-negocio-kit-por-funcao.md Regra 1 sobre risco de match frio por variacao de grafia.';
```

Do **not** add `on delete cascade`/`restrict` on the `epi_id` FK without
checking how other FKs to `epi.itens` behave in this schema first (grep
existing `references epi.itens` usages); match the existing convention
rather than picking a default arbitrarily.

Do **not** add a functional unique index on `lower(trim(funcao))` in this
step — that decision is explicitly deferred, see STOP conditions.

**Verify**: file is syntactically valid SQL (`psql --dry-run` isn't a real
flag; instead eyeball it against `estoque-minimo.sql`'s style, and confirm
`epi.itens(id)` is in fact the PK column name by checking
`scripts/estoque-minimo.sql`'s target table or grepping
`src/app/colaboradores/actions.ts` / catalog code for `itens.*id`).

### Step 2: Add RLS policies for `epi.kit_funcao`

Append to the same `scripts/kit-funcao-schema.sql` file, following the exact
pattern of `scripts/rls-por-perfil.sql` (comment banner, `DROP POLICY IF
EXISTS` then `CREATE POLICY`, using `public.perfil_atual()`). Per
`docs/regras-negocio-kit-por-funcao.md` Regra 6, mirror the "Cadastrar/editar
EPI" permission row: supervisor can write, supervisor+almoxarife+tec.
segurança can read (tec. segurança is read-only on "kits incompletos" per the
PRD's permission table — but this table stores the kit *definitions*, and the
regras doc's table gives Tec. Segurança read on "kits incompletos" not
explicitly on `kit_funcao` itself; since almoxarife needs read to show "kit
sugerido" in nova-entrega per PRD RF2/RF3, and the PRD's own table marks
almoxarife "sim" on "Ver/usar kit sugerido na entrega", grant SELECT to any
authenticated perfil — same shape as `itens_select`/`colab_select` in
`rls-por-perfil.sql`, which use `public.perfil_atual() IS NOT NULL`, i.e.
"any perfil, no perfil-specific restriction on read"):

```sql
-- ── epi.kit_funcao ───────────────────────────────────────────
alter table epi.kit_funcao enable row level security;

drop policy if exists kit_funcao_select on epi.kit_funcao;
create policy kit_funcao_select on epi.kit_funcao for select
  using (public.perfil_atual() is not null);

drop policy if exists kit_funcao_insert on epi.kit_funcao;
create policy kit_funcao_insert on epi.kit_funcao for insert
  with check (public.perfil_atual() = 'supervisor');

drop policy if exists kit_funcao_update on epi.kit_funcao;
create policy kit_funcao_update on epi.kit_funcao for update
  using (public.perfil_atual() = 'supervisor')
  with check (public.perfil_atual() = 'supervisor');

drop policy if exists kit_funcao_delete on epi.kit_funcao;
create policy kit_funcao_delete on epi.kit_funcao for delete
  using (public.perfil_atual() = 'supervisor');
```

This is a first pass by analogy, explicitly flagged `[VALIDAR]` in the source
doc — do not treat this as a final security review (see Scope/Out of scope).

**Verify**: policy block matches the structural pattern of
`rls-por-perfil.sql` (same DROP-then-CREATE shape, same `perfil_atual()`
usage) — diff them side by side.

### Step 3: Create the "kit incompleto" calculation helper

Create a standalone TS helper (suggested path: `src/lib/kit-funcao.ts` — if
`src/lib/` doesn't exist as a convention in this repo, check where other
cross-route helpers live first via `grep -rn "^import" src/app/dashboard/page.tsx
src/app/trocas/page.tsx` and place it consistently with whatever pattern you
find; do not invent a new directory convention without checking).

Port the exact dedup algorithm from `src/app/trocas/page.tsx:33-52`
(`vistos` Set keyed on `colaborador_id + ":" + epi_id`, most-recent-wins via
`criado_em desc` ordering) rather than reimplementing it differently. The
function signature should take the raw `epi.movimentacoes` rows (same shape
already queried elsewhere: `colaborador_id`, `epi_id`, `criado_em`, filtered
to `motivo in ("Entrega","Substituicao")`) plus the `epi.kit_funcao` rows and
`epi.colaboradores` rows, and return, per Regra 2 in the regras doc:

```ts
// src/lib/kit-funcao.ts
export interface KitFuncaoRow {
  funcao: string;
  epi_id: string;
}

export interface MovimentacaoAtivaRow {
  colaborador_id: string;
  epi_id: string;
  criado_em: string; // ISO, rows MUST already be sorted criado_em desc by the caller
}

export interface ColaboradorRow {
  id: string;
  nome: string;
  funcao: string;
}

export interface KitIncompleto {
  colaborador: ColaboradorRow;
  itensPendentes: string[]; // epi_id[]
}

/**
 * Replica o dedup de "entrega ativa" de src/app/trocas/page.tsx:33-52.
 * Caller deve passar `movimentacoesAtivas` ja ordenado criado_em desc
 * (mesma query shape usada em trocas/page.tsx) e filtrado a
 * motivo in ("Entrega","Substituicao").
 */
export function calcularKitsIncompletos(
  colaboradores: ColaboradorRow[],
  kitPorFuncao: KitFuncaoRow[],
  movimentacoesAtivas: MovimentacaoAtivaRow[],
): KitIncompleto[] {
  // 1. dedup: chave colaborador_id+epi_id, primeira ocorrencia (mais recente) vence
  const entregasAtivas = new Set<string>();
  for (const m of movimentacoesAtivas) {
    const chave = m.colaborador_id + ":" + m.epi_id;
    if (entregasAtivas.has(chave)) continue;
    entregasAtivas.add(chave);
  }

  // 2. agrupar kit por funcao (match por string exata, ver Regra 1)
  const kitsPorFuncao = new Map<string, string[]>();
  for (const k of kitPorFuncao) {
    const lista = kitsPorFuncao.get(k.funcao) ?? [];
    lista.push(k.epi_id);
    kitsPorFuncao.set(k.funcao, lista);
  }

  // 3. por colaborador com funcao que tem kit definido, achar itens pendentes
  const resultado: KitIncompleto[] = [];
  for (const colab of colaboradores) {
    const kit = kitsPorFuncao.get(colab.funcao);
    if (!kit || kit.length === 0) continue; // funcao sem kit: nao entra no calculo
    const pendentes = kit.filter(
      (epiId) => !entregasAtivas.has(colab.id + ":" + epiId),
    );
    if (pendentes.length > 0) {
      resultado.push({ colaborador: colab, itensPendentes: pendentes });
    }
  }
  return resultado;
}
```

Match is **string-exact** on `funcao` (Regra 1) — do NOT add
`trim()`/`toLowerCase()` normalization inside this helper. If normalization
is later decided (per the open PRD question), it belongs in the query/data
layer, not silently inside this calculation function, so callers can see and
test the two behaviors separately.

**Verify**: `npx tsc --noEmit` → exit 0. Write no UI/route code that calls
this yet (that's plan 007) — a route file that imports and calls it just to
prove it compiles is fine, but do not build the Dashboard card or nova-entrega
integration here.

### Step 4: Confirm the helper matches the `trocas/page.tsx` pattern

**Verify**: `diff <(grep -A20 "const vistos = new Set" src/app/trocas/page.tsx) <(grep -A6 "const entregasAtivas = new Set" src/lib/kit-funcao.ts)` —
not expected to be identical (different variable names/shape), but manually
confirm the two use the same "first-occurrence-under-desc-order wins" logic.
If you changed the dedup semantics in any way (e.g., aggregating instead of
first-wins), that's a deviation from Regra 2 — stop and report rather than
diverging silently.

## Test plan

No test runner exists in this repo (`plans/README.md`). Record:
- `npx tsc --noEmit` passes for the new helper.
- `npm run build` passes.
- Diagnostic query (Step 0) output captured and reported verbatim.
- If/when Vitest infra lands (see `plans/README.md` "Not yet planned"), add a
  unit test for `calcularKitsIncompletos` covering: (a) colaborador with all
  kit items delivered → not in result; (b) colaborador with 1 of N pending →
  in result with correct `itensPendentes`; (c) função with no kit rows →
  excluded entirely; (d) a superseded delivery (older `criado_em`, same
  colaborador+epi_id) does not count as active. Model after this plan's
  Step 3 function directly — no mocking needed since it's pure.
- Manual: after Step 1–2 are applied to a non-prod DB (if available), insert
  one test row into `epi.kit_funcao` and confirm `select * from
  epi.kit_funcao` round-trips and the unique constraint rejects a duplicate
  `(funcao, epi_id)` pair.

## Done criteria

ALL must hold:

- [ ] `scripts/kit-funcao-diagnostico.sql` exists and was actually run
      against real data, with output captured in the handoff report.
- [ ] `scripts/kit-funcao-schema.sql` exists with the `CREATE TABLE` and RLS
      policy blocks.
- [ ] `src/lib/kit-funcao.ts` (or wherever Step 3 lands per repo convention)
      exists and exports `calcularKitsIncompletos` matching the
      `trocas/page.tsx` dedup pattern.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm run build` exits 0 with "Compiled successfully".
- [ ] Only the files listed in Scope were created/modified (`git status`).
- [ ] `plans/README.md` status row added for plan 006.
- [ ] The STOP condition below about diagnostic results was explicitly
      resolved one way or the other (not silently skipped).

## STOP conditions

Stop and report — do not improvise a resolution — if:

- **The diagnostic query (Step 0) has not been run, or its output has not
  been reported.** This is the single most important gate in this plan. We
  do not currently know how many distinct `funcao` values exist in the real
  data or how much grafia variation exists between them (PRD open question
  #2; regras doc "Riscos técnicos" #3). The `unique(funcao, epi_id)`
  constraint and the entire string-exact match strategy (Regra 1) are only
  provisionally correct until this is known. **Do not invent an answer, do
  not guess a number, and do not silently add `trim()`/`lower()`
  normalization to "fix" what the diagnostic might reveal** — that is a
  product decision (PRD question #1), not an implementation detail to
  resolve unilaterally.
- The diagnostic query reveals a large number of near-duplicate `funcao`
  strings that would obviously make string-exact matching useless in
  practice (e.g., most colaboradores' `funcao` values differ only by case or
  whitespace from another). If so, stop before Step 1 and report the
  finding — do not proceed to create the schema as if the match strategy
  were settled; flag it back to product per PRD question #1.
- `epi.colaboradores` has no `ativo`-like status column, or a different name
  — the Step 0 diagnostic query guesses `ativo`; if that's wrong, fix the
  query to the real column name (check `src/app/colaboradores/actions.ts`)
  rather than dropping the filter silently.
- You do not have a non-production database connection to test the schema
  script against, and applying `kit-funcao-schema.sql` directly to
  production would be the only way to verify it works. In that case, stop
  before running it and ask for explicit confirmation — this plan is
  additive (new table, doesn't touch existing tables) but any DDL against
  the real DB deserves a human go-ahead, not an assumption that "additive
  equals safe."
- `epi.itens`'s primary key is not literally named `id`, or is not `uuid`
  type — the FK in Step 1 assumes both; verify against the real schema (e.g.
  via `\d epi.itens` in psql, or by grepping existing code that selects
  `epi.itens` columns) before creating the constraint.
- `npm run build` fails twice after a reasonable fix attempt.

## Maintenance notes

- This plan deliberately stops at schema + pure calculation logic. Plan 007
  (CRUD UI for `kit_funcao`, nova-entrega "kit sugerido" block, Dashboard
  "Kits incompletos" card) depends on this one and should import
  `calcularKitsIncompletos` rather than reimplementing the dedup.
- If the "Funções (RH)" backlog item (`CONTEXT.md:167`) advances and
  `funcao` becomes a normalized/FK'd table, `epi.kit_funcao.funcao` (string)
  becomes technical debt requiring a data migration — this was flagged as a
  known risk in `docs/regras-negocio-kit-por-funcao.md` "Riscos técnicos" #1,
  not something this plan resolves.
- No history is kept of a colaborador's past `funcao` values — if they change
  function, the kit recalculates against their current `funcao` with no
  record of what was required before. Accepted for v1 per the regras doc,
  since the system has no `funcao` history anywhere today.
