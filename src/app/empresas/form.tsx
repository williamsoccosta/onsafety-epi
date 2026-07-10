"use client";

import { useState } from "react";
import { consultarCnpj, type ResultadoConsulta, type DadosEmpresa } from "./actions";

// Mensagens dos estados nao-sucesso (mesmos status de services/empresas/main.py).
const MENSAGENS_STATUS: Record<string, string> = {
  ja_cadastrada: "Esta empresa ja esta cadastrada na base.",
  aprovacao_pendente:
    "Ja existe uma solicitacao pendente de aprovacao para este CNPJ.",
  aguardando_processamento:
    "Solicitacao ja aprovada, aguardando processamento.",
};

function mascararCnpj(v: string) {
  const n = v.replace(/\D/g, "").slice(0, 14);
  return n
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function EmpresaForm() {
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<ResultadoConsulta | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const limpo = cnpj.replace(/\D/g, "");
    if (limpo.length !== 14) {
      setRes({ ok: false, erro: "Digite os 14 digitos do CNPJ." });
      return;
    }
    setLoading(true);
    setRes(null);
    const r = await consultarCnpj(limpo);
    setRes(r);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className="block text-[12px] font-medium mb-1.5"
            style={{ color: "var(--ink)" }}
          >
            CNPJ
          </label>
          <input
            value={cnpj}
            onChange={(e) => setCnpj(mascararCnpj(e.target.value))}
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
            autoFocus
            className="w-full h-[42px] rounded-md border px-3 text-[14px] tabular outline-none"
            style={{
              background: "var(--control-bg)",
              borderColor: "var(--control-border)",
              color: "var(--ink)",
            }}
          />
          <p className="text-[11px] mt-1.5" style={{ color: "var(--ink-muted)" }}>
            A consulta busca os dados na Receita Federal e registra a empresa para
            aprovacao. A aprovacao final continua no fluxo do gestor.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-md text-[14px] font-semibold uppercase tracking-[0.08em] transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          {loading ? "Consultando..." : "Consultar e registrar"}
        </button>
      </form>

      {res && <Resultado res={res} />}
    </div>
  );
}

function Resultado({ res }: { res: ResultadoConsulta }) {
  if (!res.ok) {
    return (
      <div
        className="rounded-md p-4"
        style={{ background: "var(--danger-soft)", borderLeft: "4px solid var(--danger)" }}
      >
        <p className="text-[13px] font-medium" style={{ color: "var(--danger)" }}>
          {res.erro}
        </p>
      </div>
    );
  }

  if (res.status === "solicitacao_registrada") {
    return (
      <div className="space-y-4">
        <div
          className="rounded-md p-4"
          style={{ background: "var(--success-soft)", borderLeft: "4px solid var(--success)" }}
        >
          <p className="text-[13px] font-medium" style={{ color: "var(--success)" }}>
            Solicitacao registrada. A empresa entrara na fila de aprovacao.
          </p>
        </div>
        {res.resultado && <CardEmpresa d={res.resultado} />}
      </div>
    );
  }

  // ja_cadastrada | aprovacao_pendente | aguardando_processamento
  return (
    <div
      className="rounded-md p-4"
      style={{ background: "var(--accent-soft)", borderLeft: "4px solid var(--accent)" }}
    >
      <p className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>
        {MENSAGENS_STATUS[res.status] ?? "Solicitacao processada."}
      </p>
    </div>
  );
}

function CardEmpresa({ d }: { d: DadosEmpresa }) {
  const endereco = [
    [d.logradouro, d.numero].filter(Boolean).join(", "),
    d.bairro,
    [d.municipio, d.uf].filter(Boolean).join(" - "),
    d.cep,
  ]
    .filter(Boolean)
    .join(" · ");

  const linhas: [string, string | undefined][] = [
    ["Razao social", d.razao_social],
    ["Nome fantasia", d.nome_fantasia],
    ["Situacao", d.descricao_situacao_cadastral],
    ["Atividade (CNAE)", d.cnae_fiscal_descricao],
    ["Endereco", endereco || undefined],
  ];

  return (
    <div className="rounded-md border overflow-hidden" style={{ borderColor: "var(--line)" }}>
      {linhas
        .filter(([, v]) => v)
        .map(([rotulo, valor], i, arr) => (
          <div
            key={rotulo}
            className="grid grid-cols-[132px_1fr] gap-3 px-4 py-2.5"
            style={{
              background: "var(--surface)",
              borderBottom: i < arr.length - 1 ? "1px solid var(--line-soft)" : "none",
            }}
          >
            <span
              className="text-[11px] uppercase tracking-[0.08em]"
              style={{ color: "var(--ink-tertiary)" }}
            >
              {rotulo}
            </span>
            <span className="text-[13px]" style={{ color: "var(--ink)" }}>
              {valor}
            </span>
          </div>
        ))}
    </div>
  );
}
