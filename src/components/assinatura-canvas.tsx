"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { salvarAssinatura } from "@/app/auth/actions";

interface Props {
  movimentacaoId: string;
  colaboradorId: string;
  onSalvo: (url: string) => void;
}

export function AssinaturaCanvas({ movimentacaoId, colaboradorId, onSalvo }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [empty, setEmpty] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastPt = useRef<{ x: number; y: number } | null>(null);

  function getPos(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    const me = e as MouseEvent;
    return { x: (me.clientX - rect.left) * scaleX, y: (me.clientY - rect.top) * scaleY };
  }

  const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDrawing(true);
    setEmpty(false);
    lastPt.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || !lastPt.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPt.current.x, lastPt.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#2a2722";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPt.current = pos;
  }, [drawing]);

  const stopDraw = useCallback(() => { setDrawing(false); lastPt.current = null; }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDraw);
    canvas.addEventListener("mouseleave", stopDraw);
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDraw);
    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDraw);
      canvas.removeEventListener("mouseleave", stopDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stopDraw);
    };
  }, [startDraw, draw, stopDraw]);

  function limpar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
  }

  async function salvar() {
    const canvas = canvasRef.current;
    if (!canvas || empty) return;
    setSaving(true);
    setError(null);
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("canvas vazio")), "image/png")
      );

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const filename = `${colaboradorId}/${movimentacaoId}.png`;
      const { error: upErr } = await supabase.storage
        .from("assinaturas")
        .upload(filename, blob, { contentType: "image/png", upsert: true });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from("assinaturas").getPublicUrl(filename);

      const result = await salvarAssinatura(movimentacaoId, colaboradorId, publicUrl);
      if (result.error) throw new Error(result.error);
      onSalvo(publicUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 min-w-[220px]">
      <div className="rounded-md border overflow-hidden" style={{ borderColor: "var(--line-strong)", background: "#fff" }}>
        <canvas ref={canvasRef} width={300} height={100}
          className="block w-full touch-none cursor-crosshair" style={{ height: "80px" }} />
      </div>
      {error && <p className="text-[11px]" style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={limpar}
          className="h-7 px-2.5 rounded text-[11px] border"
          style={{ borderColor: "var(--line)", color: "var(--ink-secondary)" }}>
          Limpar
        </button>
        <button type="button" onClick={salvar} disabled={empty || saving}
          className="h-7 px-3 rounded text-[11px] font-semibold disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
          {saving ? "Salvando..." : "Confirmar"}
        </button>
      </div>
    </div>
  );
}
