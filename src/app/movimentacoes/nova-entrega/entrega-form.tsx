"use client";

import { useEffect, useRef, useState } from "react";
import { registrarEntregaComAssinatura } from "../actions";
import { useSignatureCanvas } from "@/hooks/useSignatureCanvas";
import { buscarKitPorFuncao, type KitFuncaoResultado } from "@/lib/kit-funcao-stub";

type Obra  = { id: string; nome: string };
type EPI   = { id: string; nome: string; complemento: string | null; ca: number | null };
type Colab = { id: string; nome: string; matricula: string | null; funcao: string | null };
type ItemEntrega = { epi_id: string; quantidade: number };

export function EntregaForm({
  obras, epis, colaboradores,
}: { obras: Obra[]; epis: EPI[]; colaboradores: Colab[] }) {
  const { canvasRef, empty, clear } = useSignatureCanvas({ strokeStyle: "#111111", lineWidth: 2 });
  const assinaturaRef = useRef<string>("");

  const [itens, setItens]       = useState<ItemEntrega[]>([{ epi_id: "", quantidade: 1 }]);
  const [assinado, setAssinado] = useState(false);
  const [erro,     setErro]     = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const [colaboradorId, setColaboradorId] = useState("");
  const [kit, setKit] = useState<KitFuncaoResultado | null>(null);
  const [kitLoading, setKitLoading] = useState(false);

  useEffect(() => {
    if (!colaboradorId) return;
    const colab = colaboradores.find((c) => c.id === colaboradorId);
    // Inicia o fetch do kit sugerido ao trocar de colaborador — setState
    // sincrono aqui e intencional (mesmo padrao de src/components/sidebar.tsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKitLoading(true);
    buscarKitPorFuncao(colab?.funcao ?? null, colaboradorId)
      .then(setKit)
      .catch(() => setKit({ estado: "erro", mensagem: "Falha ao buscar kit sugerido." }))
      .finally(() => setKitLoading(false));
  }, [colaboradorId, colaboradores]);

  function epiLabel(e: EPI) {
    return e.nome
      + (e.complemento ? " · " + e.complemento : "")
      + (e.ca ? " (CA " + e.ca + ")" : "");
  }

  function setItem(idx: number, patch: Partial<ItemEntrega>) {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItens((prev) => [...prev, { epi_id: "", quantidade: 1 }]);
  }
  function removeItem(idx: number) {
    setItens((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  function preencherComKit() {
    if (kit?.estado !== "encontrado") return;
    const pendentes = kit.itens.filter((i) => i.status === "pendente");
    const jaNaLista = new Set(itens.map((i) => i.epi_id).filter(Boolean));
    const novos = pendentes.filter((i) => !jaNaLista.has(i.epi_id));
    if (novos.length === 0) return;
    setItens((prev) => {
      // reaproveita a primeira linha vazia (epi_id === "") em vez de duplicar,
      // depois empilha o restante -- mantem o padrao de addItem()
      const semVazias = prev.filter((it) => it.epi_id !== "");
      return [...semVazias, ...novos.map((n) => ({ epi_id: n.epi_id, quantidade: 1 }))];
    });
  }

  function limpar() {
    clear();
    setAssinado(false);
    assinaturaRef.current = "";
  }

  function confirmarAssinatura() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    assinaturaRef.current = canvas.toDataURL("image/png");
    setAssinado(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const validos = itens.filter((i) => i.epi_id && i.quantidade > 0);
    if (validos.length === 0) {
      setErro("Adicione pelo menos um EPI.");
      return;
    }
    if (!assinado || !assinaturaRef.current) {
      setErro("Confirme a assinatura antes de registrar.");
      return;
    }
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("assinatura_base64", assinaturaRef.current);
    fd.set("itens_json", JSON.stringify(validos));
    const res = await registrarEntregaComAssinatura(fd);
    if (res?.error) {
      setErro(res.error);
      setLoading(false);
    }
  }

  const kitPendentes = kit?.estado === "encontrado"
    ? kit.itens.filter((i) => i.status === "pendente")
    : [];
  const kitCompleto = kit?.estado === "encontrado" && kitPendentes.length === 0;
  const kitParcial = kit?.estado === "encontrado" && kitPendentes.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Dados gerais */}
      <div
        className="rounded-lg border p-5 space-y-4"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: "var(--ink-tertiary)" }}
        >
          Dados da entrega
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Motivo" name="motivo" required>
            <option value="Entrega">Entrega</option>
            <option value="Substituicao">Substituicao</option>
          </Field>
          <label className="flex flex-col gap-1.5">
            <span
              className="text-[11px] font-medium uppercase tracking-[0.08em]"
              style={{ color: "var(--ink-tertiary)" }}
            >
              Colaborador
            </span>
            <select
              name="colaborador_id"
              required
              value={colaboradorId}
              onChange={(e) => {
                const v = e.target.value;
                setColaboradorId(v);
                if (!v) setKit(null);
              }}
              className="h-[38px] rounded-md border px-3 text-[13px] outline-none"
              style={{
                background: "var(--control-bg)",
                borderColor: "var(--control-border)",
                color: "var(--ink)",
              }}
            >
              <option value="">Selecione...</option>
              {colaboradores.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.nome}
                  {col.matricula ? " · " + col.matricula : ""}
                </option>
              ))}
            </select>
          </label>
          <Field label="Obra" name="obra_id" required>
            <option value="">Selecione...</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </Field>
        </div>

        <div className="flex flex-col gap-1.5">
          <span
            className="text-[11px] font-medium uppercase tracking-[0.08em]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            Observacao (opcional)
          </span>
          <input
            name="observacao"
            placeholder="Ex: substituicao por desgaste"
            className="h-[38px] rounded-md border px-3 text-[13px] outline-none"
            style={{
              background: "var(--control-bg)",
              borderColor: "var(--control-border)",
              color: "var(--ink)",
            }}
          />
        </div>

        {colaboradorId && (
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

            {kitLoading && (
              <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                Buscando kit sugerido...
              </p>
            )}

            {!kitLoading && kit?.estado === "sem-kit" && (
              <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                Funcao sem kit cadastrado.
              </p>
            )}

            {!kitLoading && kit?.estado === "erro" && (
              <p className="text-[13px]" style={{ color: "var(--danger)" }}>
                {kit.mensagem}
              </p>
            )}

            {!kitLoading && kit?.estado === "encontrado" && (
              <div className="space-y-2">
                {kitCompleto && (
                  <span role="status" className="selo selo--ok">Kit completo</span>
                )}
                {kitParcial && (
                  <span role="status" className="selo selo--alert">
                    {kitPendentes.length} pendente{kitPendentes.length > 1 ? "s" : ""}
                  </span>
                )}

                <div className="space-y-1">
                  {kit.itens.map((item) => (
                    <div
                      key={item.epi_id}
                      className="flex items-center justify-between px-3 py-2 rounded-md text-[13px]"
                      style={{ background: "var(--surface-raised)", color: "var(--ink)" }}
                    >
                      <span>{item.nome}</span>
                      <span
                        className="text-[11px]"
                        style={{ color: item.status === "pendente" ? "var(--danger)" : "var(--ink-tertiary)" }}
                      >
                        {item.status === "pendente" ? "Pendente" : "Ja entregue"}
                      </span>
                    </div>
                  ))}
                </div>

                {kitParcial && (
                  <button
                    type="button"
                    onClick={preencherComKit}
                    aria-label="Preencher lista de itens com o kit sugerido"
                    className="h-11 min-w-[44px] px-4 mt-2 rounded-md text-[12px] font-semibold border transition-colors campo-foco"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                  >
                    Preencher com kit sugerido
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Itens da entrega */}
      <div
        className="rounded-lg border p-5 space-y-3"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div className="flex items-center justify-between">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            EPIs da entrega ({itens.filter((i) => i.epi_id).length})
          </p>
          <button
            type="button"
            onClick={addItem}
            className="h-7 px-3 rounded-md text-[12px] font-semibold border transition-colors"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            + Adicionar EPI
          </button>
        </div>

        {itens.map((item, idx) => (
          <div key={idx} className="flex items-end gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              {idx === 0 && (
                <span className="text-[11px] font-medium uppercase tracking-[0.08em]"
                  style={{ color: "var(--ink-tertiary)" }}>EPI</span>
              )}
              <select
                value={item.epi_id}
                onChange={(e) => setItem(idx, { epi_id: e.target.value })}
                required
                className="h-[38px] w-full rounded-md border px-3 text-[13px] outline-none"
                style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}
              >
                <option value="">Selecione...</option>
                {epis.map((ep) => (
                  <option key={ep.id} value={ep.id}>{epiLabel(ep)}</option>
                ))}
              </select>
            </div>
            <div className="w-24 flex flex-col gap-1.5">
              {idx === 0 && (
                <span className="text-[11px] font-medium uppercase tracking-[0.08em]"
                  style={{ color: "var(--ink-tertiary)" }}>Qtd</span>
              )}
              <input
                type="number"
                min={1}
                value={item.quantidade}
                onChange={(e) => setItem(idx, { quantidade: parseInt(e.target.value) || 1 })}
                className="h-[38px] w-full rounded-md border px-3 text-[13px] tabular outline-none"
                style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}
              />
            </div>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              disabled={itens.length === 1}
              className="h-[38px] w-9 shrink-0 rounded-md border text-[15px] transition-colors disabled:opacity-30"
              style={{ borderColor: "var(--line)", color: "var(--ink-tertiary)" }}
              title="Remover item"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Assinatura */}
      <div
        className="rounded-lg border p-5"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            Assinatura do colaborador (cobre todos os itens)
          </p>
          {assinado ? (
            <span
              className="text-[11px] font-semibold px-2 py-1 rounded"
              style={{ background: "#dcfce7", color: "#16a34a" }}
            >
              Confirmada
            </span>
          ) : !empty ? (
            <button
              type="button"
              onClick={limpar}
              className="text-[11px] px-2 py-1 rounded border"
              style={{ color: "var(--ink-secondary)", borderColor: "var(--line)" }}
            >
              Limpar
            </button>
          ) : null}
        </div>

        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          onMouseDown={() => setAssinado(false)}
          onTouchStart={() => setAssinado(false)}
          className="w-full rounded-md border touch-none"
          style={{
            borderColor: assinado ? "#16a34a" : "var(--line)",
            borderWidth: assinado ? "2px" : "1px",
            background: "#fff",
            cursor: assinado ? "default" : "crosshair",
            pointerEvents: assinado ? "none" : "auto",
          }}
        />

        {!assinado && (
          <p className="mt-2 text-[11px]" style={{ color: "var(--ink-muted)" }}>
            Assine no campo acima com mouse ou toque.
          </p>
        )}

        <div className="mt-3 flex items-center gap-3">
          {!assinado && !empty && (
            <button
              type="button"
              onClick={confirmarAssinatura}
              className="h-9 px-4 rounded-md text-[12px] font-semibold border transition-colors"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              Confirmar assinatura
            </button>
          )}
          {assinado && (
            <button
              type="button"
              onClick={limpar}
              className="text-[12px]"
              style={{ color: "var(--ink-muted)" }}
            >
              Refazer
            </button>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between gap-4">
        <div>
          {erro && (
            <p className="text-[13px]" style={{ color: "var(--danger)" }}>
              {erro}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="h-10 px-6 rounded-md text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          {loading ? "Registrando..." : "Registrar Entrega"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, name, required, children, className = "" }: {
  label: string;
  name: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={"flex flex-col gap-1.5 " + className}>
      <span
        className="text-[11px] font-medium uppercase tracking-[0.08em]"
        style={{ color: "var(--ink-tertiary)" }}
      >
        {label}
      </span>
      <select
        name={name}
        required={required}
        className="h-[38px] rounded-md border px-3 text-[13px] outline-none"
        style={{
          background: "var(--control-bg)",
          borderColor: "var(--control-border)",
          color: "var(--ink)",
        }}
      >
        {children}
      </select>
    </label>
  );
}
