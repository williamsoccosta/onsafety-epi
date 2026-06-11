# Plan 002: Signature uploads are size- and format-validated before reaching storage

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 823d4e3..HEAD -- src/app/movimentacoes/actions.ts src/app/auth/actions.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (coordinate with plan 001 if both touch `movimentacoes/actions.ts` — land 001 first to avoid a merge conflict, but they edit different regions)
- **Category**: security
- **Planned at**: commit `823d4e3`, 2026-06-11

## Why this matters

The signed-delivery flow accepts a base64 PNG from the client, decodes it to a Buffer, and uploads it to Supabase Storage with no size or content check. A malicious or buggy client can submit an arbitrarily large base64 string (or non-PNG bytes labeled as PNG); the server decodes and stores it unconditionally. At best this wastes storage; at worst a few large requests exhaust the bucket or memory. Signatures are small line drawings — a canvas PNG of 600×160 is a few KB to tens of KB. A generous cap of 2 MB plus a PNG magic-byte check rejects abuse while never affecting a real signature.

## Current state

`src/app/movimentacoes/actions.ts:70-86` — the only upload path (the signed delivery flow):
```ts
  // Uma assinatura cobre a lista toda — upload unico, URL compartilhada
  let assinaturaUrl: string | null = null;
  const loteId = crypto.randomUUID();
  try {
    const b64 = assinaturaB64.replace(/^data:image\/png;base64,/, "");
    const buf = Buffer.from(b64, "base64");
    const storagePath = `${colaborador_id}/${loteId}.png`;
    await admin.storage.from("assinaturas").upload(storagePath, buf, {
      contentType: "image/png",
      upsert: true,
    });
    // URL publica — admin client retorna URL interna que browser nao acessa
    assinaturaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL +
      "/storage/v1/object/public/assinaturas/" + storagePath;
  } catch {
    return { error: "Falha ao salvar a assinatura. Tente novamente." };
  }
```

`assinaturaB64` comes from `formData.get("assinatura_base64")` at line 49. There is a second, simpler signature writer in `src/app/auth/actions.ts` — `salvarAssinatura(movimentacaoId, colaboradorId, assinaturaUrl)` — but that one receives an already-uploaded URL string, NOT raw bytes (the upload happens client-side in `src/components/assinatura-canvas.tsx`). This plan covers the server-side decode path in `movimentacoes/actions.ts`. The client-side upload path is noted in Maintenance.

Convention: the function returns `{ error: string }` on failure and the catch already returns a user-facing Portuguese message. Add the validation as guard clauses that return the same shape.

## Commands you will need

| Purpose   | Command            | Expected on success |
|-----------|--------------------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0, no errors   |
| Build     | `npm run build`    | exit 0, "Compiled successfully" |

No test runner exists in this repo.

## Scope

**In scope**:
- `src/app/movimentacoes/actions.ts` — add validation inside `registrarEntregaComAssinatura`.

**Out of scope** (do NOT touch):
- `src/components/assinatura-canvas.tsx` — the client-side upload path; a follow-up, not this plan.
- `scripts/rls-storage-assinaturas.sql` — storage policies are intentionally "any authenticated user" by design (project decision); not a bug.
- The `urlInterna`/public-URL construction logic — leave as-is.

## Git workflow

- Branch: `advisor/002-signature-validation`
- Single commit; Portuguese imperative message, e.g. `fix: valida tamanho e formato da assinatura antes do upload`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add a PNG validation helper

At the top of `src/app/movimentacoes/actions.ts` (after the imports, before `registrarMovimentacao`), add a module-level constant and helper:

```ts
const MAX_ASSINATURA_BYTES = 2 * 1024 * 1024; // 2 MB — assinatura real tem dezenas de KB

// Confirma que o buffer comeca com o magic number de PNG (89 50 4E 47).
function ehPng(buf: Buffer): boolean {
  return buf.length >= 4 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}
```

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 2: Validate before upload

Inside `registrarEntregaComAssinatura`, in the `try` block of the upload section (currently lines 73-80), after `const buf = Buffer.from(b64, "base64");` and BEFORE the `admin.storage...upload(...)` call, insert:

```ts
    if (buf.length === 0 || buf.length > MAX_ASSINATURA_BYTES) {
      return { error: "Assinatura invalida ou muito grande." };
    }
    if (!ehPng(buf)) {
      return { error: "Assinatura em formato invalido." };
    }
```

Leave the rest of the block unchanged. The early `return` inside the `try` is fine — it returns the `{ error }` shape the caller expects (it does not fall through to the `catch`, which only handles thrown errors).

**Verify**: `npx tsc --noEmit` → exit 0, then `npm run build` → "Compiled successfully".

## Test plan

No test runner exists. Manual verification to record in your report (do not automate):
- Trace the code: a 3 MB buffer hits the `buf.length > MAX_ASSINATURA_BYTES` branch and returns before upload. ✓
- A buffer not starting with `89 50 4E 47` returns "formato invalido". ✓
- A normal canvas PNG (starts with the PNG magic, < 2 MB) passes both checks and uploads. ✓

If plan 005 (test infra) has landed, add a unit test for `ehPng` (true for `Buffer.from([0x89,0x50,0x4e,0x47])`, false for `Buffer.from("hello")`) in a colocated test file following 005's pattern. Otherwise skip.

## Done criteria

ALL must hold:

- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm run build` exits 0 with "Compiled successfully".
- [ ] `grep -n "MAX_ASSINATURA_BYTES" src/app/movimentacoes/actions.ts` → at least 2 matches (declaration + use).
- [ ] `grep -n "ehPng" src/app/movimentacoes/actions.ts` → at least 2 matches.
- [ ] No files outside `src/app/movimentacoes/actions.ts` modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- The upload block in "Current state" doesn't match the live code (drift).
- The decode no longer uses `Buffer.from(b64, "base64")` (the parsing approach changed).
- Adding the early `return` inside the `try` produces a typecheck error about return types — report it; do not restructure the whole function.

## Maintenance notes

- The same validation should eventually be applied to the client-initiated upload path in `src/components/assinatura-canvas.tsx` (which calls Supabase Storage from the browser). That path is out of scope here; flag it as a follow-up. Because storage RLS allows any authenticated upload by design, server-side validation is the real gate — so the canvas path's bytes are currently unvalidated server-side. Worth a dedicated follow-up.
- If the canvas is ever enlarged or switched to JPEG, revisit `ehPng` and the 2 MB cap.
- A reviewer should confirm the size check happens BEFORE `admin.storage.upload`, not after.
