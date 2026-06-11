"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { salvarAssinatura } from "@/app/auth/actions";
import { useSignatureCanvas } from "@/hooks/useSignatureCanvas";

interface Props {
  movimentacaoId: string;
  colaboradorId: string;
  onSalvo: (url: string) => void;
}

export function AssinaturaCanvas({ movimentacaoId, colaboradorId, onSalvo }: Props) {
  const { canvasRef, empty, clear } = useSignatureCanvas({ strokeStyle: "#2a2722", lineWidth: 2.5 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <button type="button" onClick={clear}
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
