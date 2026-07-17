"use client";

import { useState } from "react";
import { loginAction } from "@/app/auth/actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await loginAction(fd);
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--canvas)" }}>
      <div className="w-full max-w-sm px-4">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg text-base font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>CA</span>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>Onsafety EPI</p>
            <p className="text-[12px]" style={{ color: "var(--ink-tertiary)" }}>FAAB Engenharia Ltda</p>
          </div>
        </div>

        <div className="rounded-xl border p-6 shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
          <h1 className="text-[18px] font-semibold mb-1" style={{ color: "var(--ink)" }}>Entrar</h1>
          <p className="text-[13px] mb-6" style={{ color: "var(--ink-tertiary)" }}>
            Acesso restrito a usuarios autorizados.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5"
                style={{ color: "var(--ink-muted)" }}>E-mail</label>
              <input id="login-email" name="email" type="email" required autoComplete="email"
                className="w-full h-11 rounded-md border px-3 text-[13px] outline-none campo-foco"
                style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }} />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5"
                style={{ color: "var(--ink-muted)" }}>Senha</label>
              <input id="login-password" name="password" type="password" required autoComplete="current-password"
                className="w-full h-11 rounded-md border px-3 text-[13px] outline-none campo-foco"
                style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }} />
            </div>
            {error && (
              <p role="alert" className="text-[13px] rounded-md border px-3 py-2"
                style={{ color: "var(--danger)", borderColor: "rgba(163,50,31,0.3)", background: "var(--danger-soft)" }}>
                {error}
              </p>
            )}
            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-md text-[13px] font-semibold transition-opacity disabled:opacity-60 campo-foco"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
        <p className="text-center text-[11px] mt-6" style={{ color: "var(--ink-muted)" }}>
          Gestao de EPIs — FAAB Engenharia Ltda
        </p>
      </div>
    </div>
  );
}
