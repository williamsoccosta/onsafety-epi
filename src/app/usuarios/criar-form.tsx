"use client";

import { useState } from "react";
import { criarUsuario } from "./actions";

const PERFIS = [
  { value: "supervisor", label: "Supervisor" },
  { value: "almoxarife", label: "Almoxarife" },
  { value: "administrativo", label: "Administrativo" },
  { value: "tecnico_seguranca", label: "Tec. Seguranca" },
  { value: "colaborador", label: "Colaborador" },
];

export function CriarUsuarioForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const result = await criarUsuario(fd);
    if (result.error) {
      setMsg({ type: "err", text: result.error });
    } else {
      setMsg({ type: "ok", text: "Usuario criado com sucesso." });
      (e.target as HTMLFormElement).reset();
      setOpen(false);
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <button onClick={() => setOpen(true)}
          className="h-9 px-4 rounded-md text-[13px] font-semibold transition-opacity"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
          + Novo usuario
        </button>
        {msg && (
          <p className="text-[13px]" style={{ color: msg.type === "ok" ? "var(--success)" : "var(--danger)" }}>
            {msg.text}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-5 space-y-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-semibold" style={{ color: "var(--ink)" }}>Novo usuario</p>
        <button onClick={() => setOpen(false)} className="text-[12px]" style={{ color: "var(--ink-muted)" }}>Cancelar</button>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <Field label="Nome" name="nome" type="text" />
        <Field label="E-mail" name="email" type="email" required />
        <Field label="Senha inicial" name="password" type="password" required />
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5"
            style={{ color: "var(--ink-muted)" }}>Perfil</label>
          <select name="perfil" required
            className="w-full h-10 rounded-md border px-3 text-[13px] outline-none"
            style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}>
            <option value="">Selecione...</option>
            {PERFIS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <Field label="ID Colaborador (opcional)" name="colaborador_id" type="text" placeholder="UUID do colaborador" />
        {msg && (
          <p className="col-span-2 text-[13px]"
            style={{ color: msg.type === "ok" ? "var(--success)" : "var(--danger)" }}>{msg.text}</p>
        )}
        <div className="col-span-2 flex justify-end gap-2">
          <button type="submit" disabled={loading}
            className="h-9 px-5 rounded-md text-[13px] font-semibold disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
            {loading ? "Criando..." : "Criar usuario"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, type, required, placeholder }: {
  label: string; name: string; type: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5"
        style={{ color: "var(--ink-muted)" }}>{label}</label>
      <input name={name} type={type} required={required} placeholder={placeholder}
        className="w-full h-10 rounded-md border px-3 text-[13px] outline-none"
        style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }} />
    </div>
  );
}
