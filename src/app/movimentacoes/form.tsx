"use client";

import { useState } from "react";
import { registrarMovimentacao } from "./actions";
import { MOTIVOS, SAIDA } from "@/lib/constants";

type Obra = { id: string; nome: string };
type EPI = { id: string; nome: string; complemento: string | null; ca: string | null };
type Colaborador = { id: string; nome: string; matricula: string | null };

export function MovForm({
  obras,
  epis,
  colaboradores,
}: {
  obras: Obra[];
  epis: EPI[];
  colaboradores: Colaborador[];
}) {
  const [motivo, setMotivo] = useState("Entrada");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const ehSaida = SAIDA.includes(motivo);

  async function handleSubmit(formData: FormData) {
    setErro(null);
    setOk(false);
    const res = await registrarMovimentacao(formData);
    if (res.error) {
      setErro(res.error);
    } else {
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    }
  }

  return (
    <section
      className="rounded-lg border p-5"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}
    >
      <p
        className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--ink-tertiary)" }}
      >
        Registrar movimentacao
      </p>

      <form action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select label="Obra" name="obra_id" required>
            <option value="">Selecione...</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </Select>

          <Select label="EPI" name="epi_id" required className="col-span-2">
            <option value="">Selecione...</option>
            {epis.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}{e.complemento ? ` — ${e.complemento}` : ""}{e.ca ? ` (CA ${e.ca})` : ""}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--ink-tertiary)" }}>
              Motivo
            </span>
            <select
              name="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="h-[38px] rounded-md border px-3 text-[13px] outline-none"
              style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}
            >
              {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--ink-tertiary)" }}>
              Quantidade
            </span>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold"
                style={{ color: ehSaida ? "var(--danger)" : "var(--success)" }}
              >
                {ehSaida ? "-" : "+"}
              </span>
              <input
                name="quantidade"
                type="number"
                min="1"
                defaultValue="1"
                required
                className="w-full h-[38px] rounded-md border pl-7 pr-3 text-[13px] tabular outline-none"
                style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}
              />
            </div>
          </label>

          {motivo === "Entrega" ? (
            <Select label="Colaborador" name="colaborador_id" required>
              <option value="">Selecione...</option>
              {colaboradores.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.nome}{col.matricula ? ` — ${col.matricula}` : ""}
                </option>
              ))}
            </Select>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--ink-tertiary)" }}>
                Observacao
              </span>
              <input
                name="observacao"
                placeholder="Opcional"
                className="h-[38px] rounded-md border px-3 text-[13px] outline-none"
                style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}
              />
            </label>
          )}
        </div>

        {motivo === "Entrega" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--ink-tertiary)" }}>
              Observacao
            </span>
            <input
              name="observacao"
              placeholder="Opcional"
              className="h-[38px] rounded-md border px-3 text-[13px] outline-none"
              style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}
            />
          </label>
        )}

        <div className="flex items-center justify-between">
          <div>
            {erro && (
              <p className="text-[13px]" style={{ color: "var(--danger)" }}>{erro}</p>
            )}
            {ok && (
              <p className="text-[13px]" style={{ color: "var(--success)" }}>Movimentacao registrada.</p>
            )}
          </div>
          <button
            type="submit"
            className="h-[38px] px-5 rounded-md text-[13px] font-semibold transition-opacity hover:opacity-90 shrink-0"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Registrar
          </button>
        </div>
      </form>
    </section>
  );
}

function Select({
  label,
  name,
  required,
  children,
  className = "",
}: {
  label: string;
  name: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={"flex flex-col gap-1.5 " + className}>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--ink-tertiary)" }}>
        {label}
      </span>
      <select
        name={name}
        required={required}
        className="h-[38px] rounded-md border px-3 text-[13px] outline-none"
        style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}
      >
        {children}
      </select>
    </label>
  );
}
