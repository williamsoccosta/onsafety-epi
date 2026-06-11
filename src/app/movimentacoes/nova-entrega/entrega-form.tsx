"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { registrarEntregaComAssinatura } from "../actions";

type Obra  = { id: string; nome: string };
type EPI   = { id: string; nome: string; complemento: string | null; ca: number | null };
type Colab = { id: string; nome: string; matricula: string | null };

export function EntregaForm({
  obras, epis, colaboradores,
}: { obras: Obra[]; epis: EPI[]; colaboradores: Colab[] }) {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const lastPt        = useRef<{ x: number; y: number } | null>(null);
  const assinaturaRef = useRef<string>("");

  const [drawing,  setDrawing]  = useState(false);
  const [empty,    setEmpty]    = useState(true);
  const [assinado, setAssinado] = useState(false);
  const [erro,     setErro]     = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function getPos(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    if ("touches" in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * sx,
        y: (e.touches[0].clientY - rect.top) * sy,
      };
    }
    const me = e as MouseEvent;
    return { x: (me.clientX - rect.left) * sx, y: (me.clientY - rect.top) * sy };
  }

  const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDrawing(true);
    setEmpty(false);
    setAssinado(false);
    lastPt.current = getPos(e, canvas);
  }, []);

  const draw = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!drawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx || !lastPt.current) return;
      const pt = getPos(e, canvas);
      ctx.beginPath();
      ctx.moveTo(lastPt.current.x, lastPt.current.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      lastPt.current = pt;
    },
    [drawing]
  );

  const stopDraw = useCallback(() => {
    setDrawing(false);
    lastPt.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("mousedown",  startDraw);
    canvas.addEventListener("mousemove",  draw);
    canvas.addEventListener("mouseup",    stopDraw);
    canvas.addEventListener("mouseleave", stopDraw);
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove",  draw,      { passive: false });
    canvas.addEventListener("touchend",   stopDraw);
    return () => {
      canvas.removeEventListener("mousedown",  startDraw);
      canvas.removeEventListener("mousemove",  draw);
      canvas.removeEventListener("mouseup",    stopDraw);
      canvas.removeEventListener("mouseleave", stopDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove",  draw);
      canvas.removeEventListener("touchend",   stopDraw);
    };
  }, [startDraw, draw, stopDraw]);

  function limpar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
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
    if (!assinado || !assinaturaRef.current) {
      setErro("Confirme a assinatura antes de registrar.");
      return;
    }
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("assinatura_base64", assinaturaRef.current);
    const res = await registrarEntregaComAssinatura(fd);
    if (res?.error) {
      setErro(res.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Dados */}
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

        <div className="grid grid-cols-2 gap-3">
          <Field label="Colaborador" name="colaborador_id" required>
            <option value="">Selecione...</option>
            {colaboradores.map((col) => (
              <option key={col.id} value={col.id}>
                {col.nome}
                {col.matricula ? " · " + col.matricula : ""}
              </option>
            ))}
          </Field>
          <Field label="Obra" name="obra_id" required>
            <option value="">Selecione...</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="EPI" name="epi_id" required className="col-span-2">
            <option value="">Selecione...</option>
            {epis.map((ep) => (
              <option key={ep.id} value={ep.id}>
                {ep.nome}
                {ep.complemento ? " · " + ep.complemento : ""}
                {ep.ca ? " (CA " + ep.ca + ")" : ""}
              </option>
            ))}
          </Field>
          <div className="flex flex-col gap-1.5">
            <span
              className="text-[11px] font-medium uppercase tracking-[0.08em]"
              style={{ color: "var(--ink-tertiary)" }}
            >
              Quantidade
            </span>
            <input
              name="quantidade"
              type="number"
              min="1"
              defaultValue="1"
              required
              className="h-[38px] rounded-md border px-3 text-[13px] outline-none"
              style={{
                background: "var(--control-bg)",
                borderColor: "var(--control-border)",
                color: "var(--ink)",
              }}
            />
          </div>
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
      </div>

      {/* Canvas */}
      <div
        className="rounded-lg border p-5"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            Assinatura do colaborador
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

function Field({
  label, name, required, children, className = "",
}: {
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
