# Plan 003: Malformed item lists fail gracefully instead of crashing the delivery action

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 823d4e3..HEAD -- src/app/movimentacoes/actions.ts`
> If the file changed since this plan was written, compare the "Current state"
> excerpt against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (edits the same file as 001 and 002 but a different region; land after them to avoid conflicts)
- **Category**: bug
- **Planned at**: commit `823d4e3`, 2026-06-11

## Why this matters

The signed-delivery action parses an item list from a JSON string in the FormData. It wraps `JSON.parse` in a try/catch (good), but immediately calls `.filter()` on the result without checking it is an array. Valid JSON that is not an array — `{}`, `"x"`, `42`, `null` — passes the parse, then throws a `TypeError` at `.filter`, which is NOT caught (the catch only wraps the parse). The result is an unhandled 500 instead of the intended user-facing "lista de itens invalida" message. A one-line guard closes it.

## Current state

`src/app/movimentacoes/actions.ts:60-68`:
```ts
  let itens: { epi_id: string; quantidade: number }[];
  try {
    itens = JSON.parse(itensJson);
  } catch {
    return { error: "Lista de itens invalida." };
  }
  itens = itens.filter((i) => i.epi_id && i.quantidade > 0);
  if (itens.length === 0)
    return { error: "Adicione pelo menos um EPI." };
```

`itensJson` is `String(formData.get("itens_json") || "[]")` from line 50. The bug: if `JSON.parse` returns a non-array (e.g. `{}`), line 66 `itens.filter(...)` throws because plain objects have no `.filter`, and that throw escapes the function.

Convention: return `{ error: "<Portuguese message>" }` on any bad input.

## Commands you will need

| Purpose   | Command            | Expected on success |
|-----------|--------------------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0, no errors   |
| Build     | `npm run build`    | exit 0, "Compiled successfully" |

No test runner exists in this repo.

## Scope

**In scope**:
- `src/app/movimentacoes/actions.ts` — add an array guard in `registrarEntregaComAssinatura`.

**Out of scope**:
- Everything else. This is a one-guard change.

## Git workflow

- Branch: `advisor/003-json-array-guard`
- Single commit, Portuguese imperative, e.g. `fix: rejeita lista de itens nao-array no fluxo de entrega`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Guard the parse result

In `src/app/movimentacoes/actions.ts`, change the parse block so the `catch` also rejects non-arrays. Replace the current block (lines 60-65) with:

```ts
  let itens: { epi_id: string; quantidade: number }[];
  try {
    const parsed = JSON.parse(itensJson);
    if (!Array.isArray(parsed)) {
      return { error: "Lista de itens invalida." };
    }
    itens = parsed;
  } catch {
    return { error: "Lista de itens invalida." };
  }
```

Leave the subsequent `itens = itens.filter(...)` and the empty-check exactly as they are.

**Verify**: `npx tsc --noEmit` → exit 0, then `npm run build` → "Compiled successfully".

## Test plan

No test runner exists. Manual trace to record in your report:
- `itens_json = "{}"` → `Array.isArray({})` is false → returns "Lista de itens invalida." before `.filter`. ✓
- `itens_json = "not json"` → `JSON.parse` throws → catch returns the same message. ✓
- `itens_json = '[{"epi_id":"x","quantidade":2}]'` → array → proceeds normally. ✓

If plan 005 (test infra) has landed, add a unit test passing each of the three inputs above to `registrarEntregaComAssinatura` (with the other required fields mocked) and asserting the first two return `{ error }` and don't throw. Model after 005's server-action test pattern. Otherwise skip.

## Done criteria

ALL must hold:

- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm run build` exits 0 with "Compiled successfully".
- [ ] `grep -n "Array.isArray" src/app/movimentacoes/actions.ts` → at least 1 match.
- [ ] No files outside `src/app/movimentacoes/actions.ts` modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- The parse block in "Current state" doesn't match live code (drift).
- The function no longer reads `itens_json` from FormData (the contract changed).

## Maintenance notes

- If the item list ever moves from a JSON string to structured FormData fields, this guard becomes unnecessary — remove it then.
- A reviewer should confirm the `Array.isArray` check sits before any `.filter`/`.map` on the parsed value.
