"use client";

import { useRef, useState } from "react";
import { criarEPI } from "./actions";

type CaResult = {
  found: boolean;
  nome_equipamento?: string;
  data_validade?: string;
  situacao?: string;
};

export function NovoEPIForm() {
  const [buscando, setBuscando] = useState(false);
  const [caResult, setCaResult] = useState<CaResult | null>(null);
  const nomeRef = useRef<HTMLInputElement>(null);
  const validadeRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function buscarCA(ca: string) {
    if (!ca || !/^\d+$/.test(ca.trim())) return;
    setBuscando(true);
    try {
      const res = await fetch(`/api/ca-lookup?ca=${ca.trim()}`);
      const data: CaResult = await res.json();
      setCaResult(data);
      if (data.found && data.nome_equipamento && nomeRef.current) {
        nomeRef.current.value = data.nome_equipamento;
      }
      if (data.found && data.data_validade && validadeRef.current) {
        validadeRef.current.value = data.data_validade.split("T")[0];
      }
    } catch {}
    setBuscando(false);
  }

  async function handleSubmit(formData: FormData) {
    await criarEPI(formData);
    formRef.current?.reset();
    setCaResult(null);
  }

  return (
    <section
      className="rounded-lg border p-5"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}
    >
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--ink-tertiary)" }}>
        Novo EPI
      </p>
      <form ref={formRef} action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {/* CA input com lookup */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--ink-tertiary)" }}>
              CA
            </span>
            <div className="flex gap-1.5">
              <input
                name="ca"
                placeholder="Ex: 365"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), buscarCA((e.target as HTMLInputElement).value))}
                className="flex-1 h-[38px] rounded-md border px-3 text-[13px] tabular outline-none"
                style={{ background: "var(--control-bg)", borderColor: caResult?.found === false ? "rgba(163,50,31,0.5)" : caResult?.found ? "rgba(91,107,58,0.5)" : "var(--control-border)", color: "var(--ink)" }}
              />
              <button
                type="button"
                onClick={(e) => {
                  const inp = (e.currentTarget.parentElement?.querySelector("input") as HTMLInputElement);
                  buscarCA(inp?.value ?? "");
                }}
                className="h-[38px] px-3 rounded-md border text-[11px] font-semibold transition-opacity hover:opacity-80"
                style={{ borderColor: "var(--line)", background: "var(--surface-2)", color: "var(--ink-secondary)" }}
              >
                {buscando ? "..." : "Buscar"}
              </button>
            </div>
            {caResult?.found === false && (
              <span className="text-[11px]" style={{ color: "var(--danger)" }}>CA nao encontrado no catalogo.</span>
            )}
            {caResult?.found && caResult.situacao === "VENCIDO" && (
              <span className="text-[11px]" style={{ color: "var(--danger)" }}>CA vencido — confira a validade.</span>
            )}
            {caResult?.found && caResult.situacao === "VALIDO" && (
              <span className="text-[11px]" style={{ color: "var(--success)" }}>CA valido encontrado.</span>
            )}
          </label>

          {/* Nome — auto-preenchido pelo lookup */}
          <label className="flex flex-col gap-1.5 col-span-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--ink-tertiary)" }}>
              Nome do equipamento
            </span>
            <input
              ref={nomeRef}
              name="nome"
              required
              placeholder="Ex: Capacete Classe E"
              className="h-[38px] rounded-md border px-3 text-[13px] outline-none"
              style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}
            />
          </label>

          {/* Validade CA — auto-preenchido */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--ink-tertiary)" }}>
              Validade CA
            </span>
            <input
              ref={validadeRef}
              name="ca_validade"
              type="date"
              className="h-[38px] rounded-md border px-3 text-[13px] tabular outline-none"
              style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}
            />
          </label>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <label className="flex flex-col gap-1.5 col-span-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--ink-tertiary)" }}>
              Complemento
            </span>
            <input
              name="complemento"
              placeholder="Ex: Aba Total, TAM. G, Azul"
              className="h-[38px] rounded-md border px-3 text-[13px] outline-none"
              style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--ink-tertiary)" }}>
              Vida util (dias)
            </span>
            <input
              name="vida_util_dias"
              type="number"
              min="1"
              placeholder="Ex: 180"
              className="h-[38px] rounded-md border px-3 text-[13px] tabular outline-none"
              style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--ink-tertiary)" }}>
              Limite/entrega
            </span>
            <input
              name="limite_por_entrega"
              type="number"
              min="1"
              placeholder="Ex: 1"
              className="h-[38px] rounded-md border px-3 text-[13px] tabular outline-none"
              style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="h-[38px] px-5 rounded-md text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Cadastrar EPI
          </button>
        </div>
      </form>
    </section>
  );
}
