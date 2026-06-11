# Plan 004: Signature canvas drawing logic lives in one shared hook

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 823d4e3..HEAD -- src/components/assinatura-canvas.tsx src/app/movimentacoes/nova-entrega/entrega-form.tsx`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `823d4e3`, 2026-06-11

## Why this matters

The canvas drawing logic — pointer/touch position scaling, `startDraw`/`draw`/`stopDraw`, and the `useEffect` that binds and unbinds seven DOM listeners — is implemented twice, nearly identically, in two components: the standalone `assinatura-canvas.tsx` and the inline signature pad in `entrega-form.tsx`. The two copies have already drifted (different stroke colors and canvas sizes), and both are on the NR-06-critical signature-capture path with zero tests. A bug fixed in one (e.g. a touch-scaling error on high-DPI tablets, which is exactly the kind of device used at a construction-site counter) must be hand-ported to the other. Extracting one hook removes the drift risk and gives a single place to test and fix.

## Current state

Two implementations of the same drawing core:

**`src/components/assinatura-canvas.tsx`** — standalone pad, 300×100, stroke `#2a2722`, uploads to Supabase from the browser then calls `salvarAssinatura`. Drawing logic at lines 21-91 (`getPos`, `startDraw`, `draw`, `stopDraw`, the bind/unbind `useEffect`, `limpar`).

**`src/app/movimentacoes/nova-entrega/entrega-form.tsx`** — inline pad inside the multi-item delivery form, 600×160, stroke `#111111`, no upload (produces a data URL consumed by the server action). The same `getPos`/`startDraw`/`draw`/`stopDraw`/bind-`useEffect`/`limpar` logic is duplicated inside this larger component.

The duplicated core (from `assinatura-canvas.tsx:21-91`) is the canonical shape to extract:
```ts
function getPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  // touch vs mouse coordinate, scaled to canvas pixels
}
// startDraw / draw / stopDraw via useCallback
// useEffect: add 7 listeners (mousedown/move/up/leave, touchstart/move/end), cleanup removes them
// limpar(): clearRect + setEmpty(true)
```

The two differ in: `width`/`height`, `strokeStyle`, `lineWidth`, and what "confirm" does (upload+callback vs. produce data URL). Those are the parameters/return values the hook must expose; the drawing mechanics are identical.

Repo conventions: hooks would be new — there is no `src/hooks/` directory yet. Components are PascalCase `.tsx` under `src/components/`; a hook file should be `src/hooks/useSignatureCanvas.ts` (camelCase, `use` prefix — standard React). Styling uses CSS variables; keep stroke colors as hook parameters so each call site keeps its current look.

## Commands you will need

| Purpose   | Command            | Expected on success |
|-----------|--------------------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0, no errors   |
| Build     | `npm run build`    | exit 0, "Compiled successfully" |
| Lint      | `npx eslint src/hooks src/components/assinatura-canvas.tsx` | exit 0 |

No test runner exists in this repo.

## Suggested executor toolkit

- This repo's `AGENTS.md` warns that this is a modified Next.js 16 with breaking changes and points to `node_modules/next/dist/docs/`. The hook is plain React (no Next-specific API), so that caveat is low-risk here, but keep the hook free of server-only imports — both call sites are client components (`"use client"`).

## Scope

**In scope**:
- `src/hooks/useSignatureCanvas.ts` (create)
- `src/components/assinatura-canvas.tsx` (refactor to use the hook)
- `src/app/movimentacoes/nova-entrega/entrega-form.tsx` (refactor the signature section to use the hook)

**Out of scope** (do NOT touch):
- The upload logic in `assinatura-canvas.tsx` `salvar()` and the data-URL/submit logic in `entrega-form.tsx` `handleSubmit` — the hook exposes the canvas ref and an `isEmpty` flag and a `clear()`; the "what to do on confirm" stays in each component.
- Validation from plan 002 (if landed) — don't move it into the hook.
- Visual styling/layout of either component beyond wiring the ref.

## Git workflow

- Branch: `advisor/004-signature-canvas-hook`
- Commit per step is fine; Portuguese imperative messages, e.g. `refactor: extrai hook useSignatureCanvas compartilhado`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create the hook

Create `src/hooks/useSignatureCanvas.ts`. It encapsulates the drawing mechanics and exposes a ref + state. Target shape:

```ts
"use client";
import { useRef, useState, useCallback, useEffect } from "react";

interface Options {
  strokeStyle?: string;  // default "#111111"
  lineWidth?: number;    // default 2.5
}

export function useSignatureCanvas(opts: Options = {}) {
  const { strokeStyle = "#111111", lineWidth = 2.5 } = opts;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [empty, setEmpty] = useState(true);

  // getPos, startDraw, draw (uses strokeStyle/lineWidth), stopDraw — copied verbatim
  // from assinatura-canvas.tsx:21-63, with the two style values taken from opts
  // useEffect binds/unbinds the 7 listeners — copied verbatim from lines 65-84

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
  }, []);

  return { canvasRef, empty, clear };
}
```

Copy the body of `getPos`, `startDraw`, `draw`, `stopDraw`, and the listener `useEffect` from `assinatura-canvas.tsx:21-84` exactly, changing only the hardcoded `ctx.strokeStyle`/`ctx.lineWidth` to use `strokeStyle`/`lineWidth` from options.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 2: Refactor `assinatura-canvas.tsx` to use the hook

Replace the inlined `getPos`/`startDraw`/`draw`/`stopDraw`/listener-`useEffect`/`limpar` with:
```ts
const { canvasRef, empty, clear } = useSignatureCanvas({ strokeStyle: "#2a2722", lineWidth: 2.5 });
```
Keep `saving`, `error`, and the entire `salvar()` upload function unchanged. Replace calls to `limpar()` with `clear()`. The `<canvas ref={canvasRef} width={300} height={100} ... />` stays.

**Verify**: `npx tsc --noEmit` → exit 0; `npx eslint src/components/assinatura-canvas.tsx` → exit 0.

### Step 3: Refactor the signature section in `entrega-form.tsx`

In `src/app/movimentacoes/nova-entrega/entrega-form.tsx`, replace the duplicated drawing logic with:
```ts
const { canvasRef, empty, clear } = useSignatureCanvas({ strokeStyle: "#111111", lineWidth: 2 });
```
Keep the form's own state and `handleSubmit` (which reads the canvas via `canvasRef.current.toDataURL(...)`) intact. Point the existing `<canvas>` at `canvasRef` and keep `width={600} height={160}`. Replace any local clear-canvas handler with `clear()`. Remove the now-dead duplicated functions.

**Verify**: `npx tsc --noEmit` → exit 0, then `npm run build` → "Compiled successfully".

### Step 4: Confirm no duplicated drawing core remains

**Verify**: `grep -rn "getBoundingClientRect" src/components/assinatura-canvas.tsx src/app/movimentacoes/nova-entrega/entrega-form.tsx` → **zero matches** (the only `getBoundingClientRect` now lives in the hook). If either file still matches, its drawing logic wasn't fully replaced — finish the refactor.

## Test plan

No test runner exists. Manual verification to record:
- Run `npm run build`; both components compile.
- If you can run the app: draw on both signature pads (the standalone employee-ficha pad and the delivery-form pad), confirm strokes appear in the right color and "Confirmar"/submit still work. If you cannot run the app, state that in your report and rely on typecheck+build+grep.

If plan 005 (test infra) has landed, add a hook test that mounts a canvas, simulates a pointer drag, and asserts `empty` flips to `false` and `clear()` flips it back. Model after 005's React test pattern. Otherwise skip.

## Done criteria

ALL must hold:

- [ ] `src/hooks/useSignatureCanvas.ts` exists and exports `useSignatureCanvas`.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm run build` exits 0 with "Compiled successfully".
- [ ] `grep -rn "getBoundingClientRect" src/components/assinatura-canvas.tsx src/app/movimentacoes/nova-entrega/entrega-form.tsx` → zero matches.
- [ ] Only the three in-scope files modified/created (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Either "Current state" file doesn't match the excerpts (drift).
- After extraction, the two call sites would need DIFFERENT drawing behavior beyond `strokeStyle`/`lineWidth` (e.g. different event sets) — that means the abstraction doesn't fit; report it rather than forcing it.
- `npm run build` fails twice after a reasonable fix attempt.

## Maintenance notes

- New signature surfaces should consume `useSignatureCanvas`, not re-implement drawing. A reviewer should reject a new component that re-adds `getBoundingClientRect` scaling.
- If high-DPI rendering is later improved (e.g. scaling the backing store by `devicePixelRatio`), it goes in the hook once and both pads benefit — that's the payoff of this plan.
- The "confirm" behaviors stayed in the components on purpose (one uploads, one produces a data URL). Don't merge those into the hook.
