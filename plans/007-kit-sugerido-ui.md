# Plan 007: "Kit sugerido" — bloco de UI na tela de nova entrega (stub, sem schema)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat b920c750..HEAD -- src/app/movimentacoes/nova-entrega/entrega-form.tsx src/app/movimentacoes/nova-entrega/page.tsx`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none for this plan's own execution (uses a stub data
  source). **But the feature is not real until plan 006 lands** — see "Why
  this matters".
- **Category**: feature (UI-only slice)
- **Planned at**: commit `b920c750462429a0d1542b309e4e59257256148a`, branch
  `feat/materiais-via-insumos-service`, 2026-07-17

## Why this matters

`docs/prd-kit-por-funcao.md` and `docs/regras-negocio-kit-por-funcao.md`
define the "Kit de EPI por função" feature: when an almoxarife opens "Nova
entrega" and picks a colaborador, the system should show which EPIs are
mandatory for that colaborador's `funcao` and let the almoxarife fill the
item list with one click, without blocking manual entry (PRD RF2/RF3/RF6,
Regra 3, Regra 4).

**This plan covers only the visual/interaction layer.** The table
`epi.kit_funcao` and the real lookup query do not exist yet — that is a
separate plan (**006**, not yet written, targeting `epi.kit_funcao` schema +
query, owned by whoever does the Dev Master / backend slice) referenced by
the stub function below. Shipping this UI plan alone makes the block always
render one deterministic mock state; it becomes truthful only once 006 lands
and the stub is swapped for a real Supabase query. Do not present this plan
as feature-complete — it is scaffolding.

Three findings from an earlier visual-hierarchy critique (done against a
static HTML prototype using the real `globals.css` tokens) **must** be
honored as implementation requirements here, not just style notes:

1. The kit block nests **inside** the existing "Dados da entrega" card via a
   `border-top` separator — it is an extension of that card, not a new
   sibling card. This was an intentional call (extension, not a new form),
   but it is a visual-hierarchy judgment call that should be eyeballed
   against the real running app before this plan is marked done (see Step 5
   / STOP conditions — flag it if it reads as cramped or competes visually
   with the "Dados da entrega" heading).
2. Kit items must **not** use `--surface-2` as background. Per
   `src/app/globals.css:7`, that token is commented `/* inputs -- "inset",
   recebem conteudo */` — reserving it for `--surface-2` on an
   informational, non-editable list would visually claim "this is an
   editable field" when it isn't. Use `--surface-raised` (`globals.css:8`,
   "dropdowns, popovers -- 1 nivel acima") or a bottom-border-only treatment
   instead.
3. The prototype assumed a 640px container width without checking the real
   layout. The real container is **`max-w-3xl` (768px)**, set on the `<main>`
   in `src/app/movimentacoes/nova-entrega/page.tsx:19`. Do not hardcode any
   width for the kit block — it must inherit the full width of the "Dados da
   entrega" card (itself unconstrained inside the 768px `<main>`), matching
   the grid/flex patterns already used by sibling sections in
   `entrega-form.tsx`.

## Current state

**`src/app/movimentacoes/nova-entrega/page.tsx`** (35 lines) — server
component. Fetches `obras`, `epis`, `colaboradores` in parallel
(lines 9–15) and renders `<EntregaForm>` inside a `max-w-3xl` `<main>`
(line 19). The `colaboradores` query (lines 13–14) currently selects only
`id,nome,matricula` — **it does not select `funcao`**, which this feature
needs to look up the kit. `<main className="px-4 sm:px-8 py-6 sm:py-8
max-w-3xl">` is the real container — 768px, not the prototype's assumed
640px.

**`src/app/movimentacoes/nova-entrega/entrega-form.tsx`** (330 lines) —
client component, already refactored per plan 004 (uses
`useSignatureCanvas` from `@/hooks/useSignatureCanvas`, line 5). Relevant
excerpts:

- Types (lines 7–10):
  ```ts
  type Obra  = { id: string; nome: string };
  type EPI   = { id: string; nome: string; complemento: string | null; ca: number | null };
  type Colab = { id: string; nome: string; matricula: string | null };
  type ItemEntrega = { epi_id: string; quantidade: number };
  ```
  `Colab` has no `funcao` field — needs one.
- Component signature (lines 12–14):
  ```ts
  export function EntregaForm({
    obras, epis, colaboradores,
  }: { obras: Obra[]; epis: EPI[]; colaboradores: Colab[] }) {
  ```
- Item-list state and mutators already exist and are exactly what Regra 3
  requires reusing (lines 18, 29–37):
  ```ts
  const [itens, setItens] = useState<ItemEntrega[]>([{ epi_id: "", quantidade: 1 }]);
  function setItem(idx: number, patch: Partial<ItemEntrega>) { ... }
  function addItem() { setItens((prev) => [...prev, { epi_id: "", quantidade: 1 }]); }
  function removeItem(idx: number) { ... }
  ```
- The "Dados da entrega" card — where the kit block nests, per critique
  finding #1 — spans **lines 79–130**. It contains the 3-column grid
  (Motivo/Colaborador/Obra, lines 90–110) and the "Observação" field
  (lines 112–129). The kit block goes **after line 129's closing `</div>`
  wrapper of Observação, before line 130's closing `</div>` of the card**,
  i.e. as the last child of the "Dados da entrega" card, separated by
  `border-top`.
- The `Colaborador` `<select>` is built via the generic `Field` helper
  (lines 95–103, `Field` defined lines 301–330) — it does **not** expose
  the selected colaborador's row, only `colaborador_id` as a form field
  name. To know the selected colaborador's `funcao`, the component needs
  its own `<select>` (not the generic `Field` wrapper) or a controlled
  `colaboradorId` state mirroring the field, since `funcao` lookup depends
  on knowing *which* colaborador is currently selected — `Field` renders an
  uncontrolled native `<select name="colaborador_id">` with no `onChange`
  hook today.
- Pre-existing technical debt **not** to copy (both docs call this out
  explicitly — PRD "Estados de UI" table and Regra 5): the "Confirmada"
  badge at **lines 214–220** uses a hardcoded, off-palette color
  (`background: "#dcfce7", color: "#16a34a"`) instead of `.selo--ok`. Do not
  touch this badge (out of scope — it's a separate, already-logged debt
  item) but do not replicate the pattern in the new kit block; use
  `.selo--ok` / `.selo--alert` there instead.
- Toke targets already below 44px exist in this file (e.g. the `×` remove
  button, `h-[38px] w-9`, lines 188–197, and the "Confirmar assinatura"
  button, `h-9`, lines 257–264) — also pre-existing debt, not in scope to
  fix, but the new kit block's own controls must hit ≥44px per the PRD's
  Acessibilidade section, not follow this existing pattern.

**`src/app/globals.css`** — relevant tokens already exist and must be
reused, not reinvented:
- `--surface-2` (line 7): commented `/* inputs -- "inset", recebem conteudo
  */` — do not use for kit items (critique finding #2).
- `--surface-raised` (line 8): `/* dropdowns, popovers -- 1 nivel acima */`
  — use this, or a border-only treatment, for kit item rows.
- `.selo`, `.selo--ok`, `.selo--alert`, `.selo--off` (lines 76–127) — the
  dashed-border "etiqueta" component. Use `.selo--ok` for "kit completo"
  and `.selo--alert` for "itens faltando", per PRD's "Estados de UI" table
  and Regra 5.
- `.campo-foco` (lines 141–144): `box-shadow: 0 0 0 2px var(--line-focus)`
  on `:focus-visible`. Required on the new "Preencher com kit sugerido"
  button per PRD Acessibilidade.
- `--danger` — used for the erro state, matching the existing pattern at
  `entrega-form.tsx:282–286`.

**Existing `aria-live`/`role="status"` precedent in the codebase** (to
match, not invent a new pattern):
- `src/app/rh/novo/form.tsx:268`: `<span role="status" aria-live="polite"
  className="sr-only">{loading ? "Salvando cadastro..." : ""}</span>` — a
  visually-hidden live region paired with a visible loading state on the
  button itself.
- `src/app/movimentacoes/form.tsx:154`: `<p role="status" ...>Movimentacao
  registrada.</p>` — a visible status paragraph, no `aria-live` attribute
  (the PRD explicitly asks for `aria-live="polite"` on the kit block itself,
  which is the stronger/more complete pattern — follow the PRD here, the
  kit block's outer wrapper gets both `aria-live="polite"` and, on the selo
  specifically, `role="status"`).
- Toque-alvo precedent: `src/app/epis/novo-form.tsx:73` uses `h-11
  min-w-[44px] ... campo-foco`; `src/app/usuarios/criar-form.tsx:55` uses
  `min-h-[44px] ... campo-foco`. Follow this `h-11`/`min-h-[44px]` +
  `campo-foco` combination for the new button.

**`epi.colaboradores.funcao`** — confirmed as a free-text column, no FK, no
enum (`src/app/colaboradores/actions.ts:12`, `src/app/colaboradores/
page.tsx:48,92`). Field name to select/type is `funcao` (lowercase,
Portuguese, no accent — matches existing convention).

## Commands you will need

| Purpose   | Command            | Expected on success |
|-----------|--------------------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0, no errors   |
| Build     | `npm run build`    | exit 0, "Compiled successfully" |
| Lint      | `npx eslint src/app/movimentacoes/nova-entrega src/lib/kit-funcao-stub.ts` | exit 0 |
| Grep check (no off-palette color) | `grep -n "#dcfce7\|#16a34a" src/app/movimentacoes/nova-entrega/entrega-form.tsx` | only the pre-existing "Confirmada" badge match (lines ~217), no new matches |
| Grep check (no surface-2 on kit items) | `grep -n "surface-2" src/app/movimentacoes/nova-entrega/entrega-form.tsx` | zero matches |

No test runner exists in this repo (per `plans/README.md`).

## Scope

**In scope**:
- `src/app/movimentacoes/nova-entrega/page.tsx` — add `funcao` to the
  `colaboradores` select and pass it through (type augmentation only, no
  new query source).
- `src/app/movimentacoes/nova-entrega/entrega-form.tsx` — add the "Kit
  sugerido" block nested inside the "Dados da entrega" card; add whatever
  local state is needed to track the selected colaborador and drive the
  lookup; wire "Preencher com kit sugerido" to the existing `itens`/
  `setItem`/`addItem` state.
- `src/lib/kit-funcao-stub.ts` (create) — the mock lookup function described
  in Step 2 below. Lives in `src/lib/` alongside other non-component
  helpers (matches repo convention — no existing `src/lib/*-stub.ts`
  precedent, but this is the natural home; `src/hooks/` is for hooks only,
  per plan 004's precedent, not data-fetch stubs).
- Optionally, `src/components/kit-sugerido.tsx` (create) if the block is
  extracted as its own component rather than kept inline in
  `entrega-form.tsx` — executor's call based on resulting line count; if
  extracted, update the Done-criteria file list accordingly and note the
  deviation in the status row.

**Explicit out of scope (do NOT do)**:
- Do **not** create the `epi.kit_funcao` table or any migration/SQL.
- Do **not** write a real Supabase/PostgREST query against `epi.kit_funcao`
  — it doesn't exist. The lookup function must be a clearly-marked stub
  (Step 2).
- Do **not** touch `src/app/movimentacoes/actions.ts` (or any `actions.ts`)
  — this plan is presentation-only; `registrarEntregaComAssinatura` and the
  rest of the submit path are untouched.
- Do **not** build the CRUD screen for supervisors to manage
  `epi.kit_funcao` (PRD scope item 2) — different plan.
- Do **not** build the Dashboard "Kits incompletos" card (PRD scope item 4)
  — different plan, needs the real table.
- Do **not** fix the pre-existing off-palette "Confirmada" badge
  (`entrega-form.tsx:214–220`) or the sub-44px "×"/"Confirmar assinatura"
  buttons — both are logged, separate debt, not this feature's job.
- Do **not** implement `funcao` normalization (trim/lowercase) logic in the
  UI layer — Regra 1 says that's a comparison-time concern for whatever
  does the real query (plan 006's job), not the stub or the component.

## Git workflow

- Branch: `advisor/007-kit-sugerido-ui`
- Commit per step is fine; Portuguese imperative messages, e.g. `feat: adiciona bloco kit sugerido (stub) na tela de nova entrega`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Expose `funcao` on the colaborador list

In `src/app/movimentacoes/nova-entrega/page.tsx`, add `funcao` to the
`colaboradores` select on line 13–14:
```ts
supabase.schema("epi").from("colaboradores")
  .select("id,nome,matricula,funcao").eq("ativo", true).order("nome"),
```
In `entrega-form.tsx`, extend the `Colab` type (line 9):
```ts
type Colab = { id: string; nome: string; matricula: string | null; funcao: string | null };
```

**Verify**: `npx tsc --noEmit` → exit 0 (confirms `page.tsx` and
`entrega-form.tsx` agree on the new shape).

### Step 2: Create the stub kit-lookup function

Create `src/lib/kit-funcao-stub.ts`. This is the interface plan 006's
executor will implement for real — the function signature and return shape
must not need to change when the stub is swapped, only the body.

```ts
// TODO(dev-master): substituir por query real de epi.kit_funcao quando a
// tabela existir (ver plans/006-kit-funcao-schema.md)

export type KitItemStatus = "pendente" | "entregue";

export type KitItem = {
  epi_id: string;
  nome: string; // rótulo já resolvido, formato igual a epiLabel() em entrega-form.tsx
  status: KitItemStatus;
};

export type KitFuncaoResultado =
  | { estado: "sem-kit" }
  | { estado: "erro"; mensagem: string }
  | { estado: "encontrado"; itens: KitItem[] };

/**
 * Busca o kit sugerido para uma função. Assinatura async porque a
 * implementação real (plan 006) faz uma chamada Supabase; o stub resolve
 * de forma síncrona embrulhada em Promise para já forçar os call sites a
 * tratar loading corretamente.
 */
export async function buscarKitPorFuncao(
  funcao: string | null,
  colaboradorId: string
): Promise<KitFuncaoResultado> {
  // Stub determinístico — sem chamada de rede, sem tabela real.
  // Troca de estado feita manualmente durante o desenvolvimento visual;
  // plan 006 substitui o corpo inteiro por uma query real mantendo a
  // assinatura acima.
  if (!funcao) return { estado: "sem-kit" };
  return { estado: "sem-kit" };
}
```

Keep the mock deliberately inert (`sem-kit` for everything) rather than
faking success — Step 3 below builds all 5 states behind a dev-only toggle
so each is visually verifiable without depending on fragile hardcoded
matches against real `colaboradores.funcao` values, and nobody mistakes the
stub's fake data for real product content on a shared branch.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 3: Build the "Kit sugerido" block — all 5 states

Add to `entrega-form.tsx`, nested inside the "Dados da entrega" card
(after the Observação field's closing `</div>` at line 129, still inside
the card's outer `</div>` at line 130), separated by `border-top`:

```tsx
<div
  className="pt-4 mt-1"
  style={{ borderTop: "1px solid var(--line)" }}
  aria-live="polite"
>
  <p
    className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2"
    style={{ color: "var(--ink-tertiary)" }}
  >
    Kit sugerido
  </p>
  {/* estado-driven content below */}
</div>
```

Track the selected colaborador and kit lookup with local state:
```ts
const [colaboradorId, setColaboradorId] = useState("");
const [kit, setKit] = useState<KitFuncaoResultado | null>(null);
const [kitLoading, setKitLoading] = useState(false);
```
This requires converting the Colaborador `<select>` (currently rendered via
the generic `Field` wrapper, lines 95–103) to a controlled, dedicated
`<select onChange={...}>` so `colaboradorId` updates and an effect can
trigger `buscarKitPorFuncao`. Keep `name="colaborador_id"` and `required`
so the existing `FormData` submit path (line 65: `new
FormData(e.currentTarget)`) keeps working unchanged.

Drive the lookup with an effect keyed on `colaboradorId`:
```ts
useEffect(() => {
  if (!colaboradorId) { setKit(null); return; }
  const colab = colaboradores.find((c) => c.id === colaboradorId);
  setKitLoading(true);
  buscarKitPorFuncao(colab?.funcao ?? null, colaboradorId)
    .then(setKit)
    .catch(() => setKit({ estado: "erro", mensagem: "Falha ao buscar kit sugerido." }))
    .finally(() => setKitLoading(false));
}, [colaboradorId, colaboradores]);
```

Render all 5 states inside the wrapper from above, matching the PRD's
"Estados de UI" table exactly:

| Estado | Condição | Render |
|---|---|---|
| Loading | `kitLoading` | Text swap, no new spinner — e.g. `<p style={{ color: "var(--ink-muted)" }}>Buscando kit sugerido...</p>`, matching the "Registrando..." text-swap pattern already used at line 294. |
| Vazio (sem kit) | `kit?.estado === "sem-kit"` | Centered message, `--ink-muted`: `"Função sem kit cadastrado."` — never omit the block silently (PRD fluxo passo 3, RF6). |
| Erro | `kit?.estado === "erro"` | `<p style={{ color: "var(--danger)" }}>{kit.mensagem}</p>`, same visual pattern as the existing `erro` paragraph at lines 282–286. |
| Completo | `kit?.estado === "encontrado" && kit.itens.every(i => i.status === "entregue")` | `<span role="status" className="selo selo--ok">Kit completo</span>` |
| Parcial | `kit?.estado === "encontrado" && kit.itens.some(i => i.status === "pendente")` | `<span role="status" className="selo selo--alert">{n} pendente(s)</span>` + the item list below |

When `estado === "encontrado"`, list `kit.itens` below the selo. Each row:
container background **must** be `var(--surface-raised)` or border-only —
**never `var(--surface-2)`** (critique finding #2; verified by the grep
check in Commands). Example row treatment:
```tsx
<div
  className="flex items-center justify-between px-3 py-2 rounded-md text-[13px]"
  style={{ background: "var(--surface-raised)", color: "var(--ink)" }}
>
  <span>{item.nome}</span>
  <span
    className="text-[11px]"
    style={{ color: item.status === "pendente" ? "var(--danger)" : "var(--ink-tertiary)" }}
  >
    {item.status === "pendente" ? "Pendente" : "Já entregue"}
  </span>
</div>
```

Add the "Preencher com kit sugerido" button, visible only when
`estado === "encontrado"` and at least one item is `"pendente"`:
```tsx
<button
  type="button"
  onClick={preencherComKit}
  aria-label="Preencher lista de itens com o kit sugerido"
  className="h-11 min-w-[44px] px-4 mt-2 rounded-md text-[12px] font-semibold border transition-colors campo-foco"
  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
>
  Preencher com kit sugerido
</button>
```

**Verify**: `npx tsc --noEmit` → exit 0. Then `npx eslint src/app/
movimentacoes/nova-entrega/entrega-form.tsx` → exit 0. Then the two grep
checks from the Commands table (no `#dcfce7`/`#16a34a` beyond the existing
badge, zero `surface-2` occurrences).

### Step 4: Wire "Preencher com kit sugerido" (Regra 3)

Implement `preencherComKit`, reusing the existing `itens`/`setItem`/
`addItem` state exactly as Regra 3 requires (no parallel list component):

```ts
function preencherComKit() {
  if (kit?.estado !== "encontrado") return;
  const pendentes = kit.itens.filter((i) => i.status === "pendente");
  const jaNaLista = new Set(itens.map((i) => i.epi_id).filter(Boolean));
  const novos = pendentes.filter((i) => !jaNaLista.has(i.epi_id));
  if (novos.length === 0) return;
  setItens((prev) => {
    // reaproveita a primeira linha vazia (epi_id === "") em vez de duplicar,
    // depois empilha o restante — mantém o padrão de addItem()
    const semVazias = prev.filter((it) => it.epi_id !== "");
    return [...semVazias, ...novos.map((n) => ({ epi_id: n.epi_id, quantidade: 1 }))];
  });
}
```
This satisfies Regra 3 ("apenas os itens pendentes", "não duplica itens já
presentes na lista") and PRD critério de aceite 5. Do not add quantity
logic beyond `quantidade: 1` — the existing quantity input stays editable
per-row after insertion, same as any manually-added item.

**Verify**: `npx tsc --noEmit` → exit 0, then `npm run build` → "Compiled
successfully".

### Step 5: Manual visual validation (required — do not skip)

Because two of the three critique findings are layout judgment calls, not
just token substitutions, run the app (if you have a way to run it — see
"Test plan" below) and visually confirm:

1. The nested "Kit sugerido" block (inside "Dados da entrega", `border-top`
   separator) does not visually compete with or get lost under the
   Motivo/Colaborador/Obra grid above it. If it reads as cramped or
   unclear where "Dados da entrega" ends and "Kit sugerido" begins, that is
   a **STOP condition** — report it, do not silently promote it to a
   separate card without checking with the requester first (the nesting
   was an explicit, intentional decision documented above, not something
   this plan can unilaterally reverse).
2. The block's width matches the "Dados da entrega" card's width inside the
   real 768px (`max-w-3xl`) container — no 640px assumption leaking in from
   the prototype anywhere (no hardcoded `max-w-*` or `width:` on the kit
   block or its children).
3. Kit item rows read as informational, not as editable fields — confirm
   they don't look like the `--control-bg`/`--control-border` inputs used
   elsewhere in the same form (e.g. the Observação input at lines
   119–128).

## Test plan

No test runner exists in this repo (`plans/README.md`). Manual verification
to record in the report:

- `npx tsc --noEmit`, `npm run build`, both grep checks — all passing.
- If the app can be run: temporarily hardcode each of the 5
  `KitFuncaoResultado` branches (or add a dev-only query-param switch) in
  `kit-funcao-stub.ts` one at a time, reload "Nova entrega", select any
  colaborador, and screenshot/confirm each of the 5 states renders per the
  table in Step 3 — then revert the stub back to always returning
  `{ estado: "sem-kit" }` before committing (Step 2's stub must not ship
  hardcoded to a "fun" state).
- Confirm keyboard-only flow: tab to "Preencher com kit sugerido", confirm
  the `campo-foco` focus ring appears, press Enter/Space, confirm items
  populate.
- Confirm a screen reader (or the accessibility tree in devtools) announces
  the kit block's state change when a colaborador is selected — this is
  what `aria-live="polite"` is for; if you cannot test with a real screen
  reader, at minimum confirm via devtools that the `aria-live="polite"`
  attribute is present on the outer wrapper and `role="status"` is present
  on the selo.
- If you cannot run the app at all, state that explicitly in the report and
  rely on typecheck + build + grep + manual code read-through of the JSX
  against the state table in Step 3.

If plan 005 (test infra) has landed by the time this executes, add a
component test that mounts `EntregaForm` with a colaborador that has a
`funcao`, mocks `buscarKitPorFuncao` to resolve each of the 5 states, and
asserts the corresponding selo/text renders. Otherwise skip — no test
runner exists yet.

## Done criteria

ALL must hold:

- [ ] `src/lib/kit-funcao-stub.ts` exists, exports `buscarKitPorFuncao`,
      `KitFuncaoResultado`, `KitItem`, and contains the
      `// TODO(dev-master): ... plans/006-kit-funcao-schema.md` comment
      verbatim (or close enough to be grep-able for `TODO(dev-master)`).
- [ ] The "Kit sugerido" block renders nested inside "Dados da entrega"
      (not as a sibling card), separated by `border-top`.
- [ ] All 5 states (loading/vazio/completo/parcial/erro) are implemented
      and were each manually verified per the Test plan (or explicitly
      noted as unverified if the app couldn't be run).
- [ ] `aria-live="polite"` on the block wrapper, `role="status"` on the
      selo, `aria-label` on the "Preencher com kit sugerido" button,
      `campo-foco` class on that button, and its tap target is ≥44px
      (`h-11 min-w-[44px]` or equivalent).
- [ ] No kit item row uses `var(--surface-2)` as background (grep check
      passes).
- [ ] No new hardcoded off-palette colors were introduced (grep check
      passes — only the pre-existing "Confirmada" badge match remains).
- [ ] "Preencher com kit sugerido" only adds pending items, never
      duplicates items already in the list (Step 4 logic reviewed against
      Regra 3 and PRD critério de aceite 5).
- [ ] Step 5's three visual-validation points were checked and reported
      on, including the container-width confirmation (768px / `max-w-3xl`,
      not 640px).
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm run build` exits 0 with "Compiled successfully".
- [ ] `epi.kit_funcao` table was NOT created; no SQL/migration files added.
- [ ] `src/app/movimentacoes/actions.ts` was NOT modified.
- [ ] Only the files listed in Scope were modified/created (`git status`).
- [ ] `plans/README.md` status row added/updated for plan 007 (and this
      file renamed/added to the table if the README format requires it).

## STOP conditions

Stop and report if:

- `page.tsx` or `entrega-form.tsx` don't match the "Current state" excerpts
  (drift since this plan was written at commit `b920c750`).
- The Colaborador `<select>` cannot be made controlled without breaking the
  existing `Field` component's other three uses (Motivo/Obra also use
  `Field` — if converting Colaborador alone turns out to require touching
  `Field`'s shared signature in a way that affects Motivo/Obra, stop and
  report rather than widening `Field`'s contract silently).
- The nested-vs-separate-card layout (critique finding #1) reads badly in
  the running app — per Step 5, this needs a human call, not a unilateral
  fix.
- `npm run build` fails twice after a reasonable fix attempt.
- Any temptation arises to write a real `epi.kit_funcao` query "since it's
  easy" — resist it; that is plan 006's scope and doing it here creates
  merge conflict risk and skips whatever schema review 006 is meant to get.

## Maintenance notes

- When plan 006 lands, only `src/lib/kit-funcao-stub.ts`'s function body
  changes (ideally the file itself gets renamed off `-stub`, with call
  sites updated) — the return type contract (`KitFuncaoResultado`) is
  designed to not require touching `entrega-form.tsx` at all, provided 006
  keeps the same states (`sem-kit` / `erro` / `encontrado` with per-item
  `status`).
- The kit item's `status: "entregue" | "pendente"` computation (Regra 2:
  dedup by `colaborador_id + epi_id`, latest entry wins, motivo `Entrega`/
  `Substituicao`) is entirely plan 006's responsibility — this plan's stub
  and component only consume the already-computed status per item, never
  recompute it client-side.
- If a future change needs the kit block to also block submission on
  incomplete kits (PRD Pergunta #5, currently "no" per Regra 4), that is a
  product decision requiring a new plan — this plan's `preencherComKit` is
  intentionally non-blocking and reversible (items stay editable/removable
  after insertion).
