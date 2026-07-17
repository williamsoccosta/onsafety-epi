"use client";

import { useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { salvarAssinatura } from "@/app/auth/actions";
import { useSignatureCanvas } from "@/hooks/useSignatureCanvas";

interface Props {
  movimentacaoId: string;
  colaboradorId: string;
  onSalvo: (url: string) => void;
}

type Modo = "desenhar" | "digitar";

export function AssinaturaCanvas({ movimentacaoId, colaboradorId, onSalvo }: Props) {
  const { canvasRef, empty, clear, markNotEmpty } = useSignatureCanvas({ strokeStyle: "#2a2722", lineWidth: 2.5 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modo, setModo] = useState<Modo>("desenhar");
  const [nomeDigitado, setNomeDigitado] = useState("");
  const nomeInputRef = useRef<HTMLInputElement>(null);

  // Considera preenchido tanto o desenho a mao livre (canvas "empty" do hook)
  // quanto o modo "Digitar" com nome nao vazio ainda nao renderizado no canvas.
  const podeConfirmar = modo === "desenhar" ? !empty : nomeDigitado.trim().length > 0;

  function alternarModo(novoModo: Modo) {
    if (novoModo === modo) return;
    clear();
    setNomeDigitado("");
    setError(null);
    setModo(novoModo);
  }

  // Renderiza o nome digitado dentro do canvas usando fonte cursiva, para
  // que o restante do fluxo (toBlob -> upload -> salvarAssinatura) permaneca
  // identico independente do modo usado para preencher a assinatura.
  function desenharNomeNoCanvas(nome: string) {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#2a2722";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let fontSize = 28;
    ctx.font = `italic ${fontSize}px "Brush Script MT", "Segoe Script", cursive`;
    const maxWidth = canvas.width - 24;
    while (ctx.measureText(nome).width > maxWidth && fontSize > 12) {
      fontSize -= 2;
      ctx.font = `italic ${fontSize}px "Brush Script MT", "Segoe Script", cursive`;
    }

    ctx.fillText(nome, canvas.width / 2, canvas.height / 2);
    markNotEmpty();
    return true;
  }

  async function salvar() {
    if (modo === "digitar") {
      const nome = nomeDigitado.trim();
      if (!nome) return;
      const ok = desenharNomeNoCanvas(nome);
      if (!ok) {
        setError("Nao foi possivel gerar a assinatura");
        return;
      }
    }

    const canvas = canvasRef.current;
    if (!canvas || (modo === "desenhar" && empty)) return;
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
      <div className="flex gap-1" role="tablist" aria-label="Modo de assinatura">
        <button
          type="button"
          role="tab"
          aria-selected={modo === "desenhar"}
          onClick={() => alternarModo("desenhar")}
          className="h-6 px-2.5 rounded text-[11px] border font-medium"
          style={{
            borderColor: "var(--line-strong)",
            background: modo === "desenhar" ? "var(--accent)" : "transparent",
            color: modo === "desenhar" ? "var(--accent-ink)" : "var(--ink-secondary)",
          }}
        >
          Desenhar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={modo === "digitar"}
          onClick={() => alternarModo("digitar")}
          className="h-6 px-2.5 rounded text-[11px] border font-medium"
          style={{
            borderColor: "var(--line-strong)",
            background: modo === "digitar" ? "var(--accent)" : "transparent",
            color: modo === "digitar" ? "var(--accent-ink)" : "var(--ink-secondary)",
          }}
        >
          Digitar
        </button>
      </div>

      <div className="rounded-md border overflow-hidden" style={{ borderColor: "var(--line-strong)", background: "#fff" }}>
        <canvas ref={canvasRef} width={300} height={100}
          className="block w-full touch-none cursor-crosshair" style={{ height: "80px" }} />
      </div>

      {modo === "digitar" && (
        <div className="space-y-1">
          <label htmlFor={`nome-assinatura-${movimentacaoId}`} className="text-[11px]" style={{ color: "var(--ink-secondary)" }}>
            Nome completo para confirmar assinatura
          </label>
          <input
            id={`nome-assinatura-${movimentacaoId}`}
            ref={nomeInputRef}
            type="text"
            value={nomeDigitado}
            onChange={(e) => setNomeDigitado(e.target.value)}
            aria-label="Nome completo para confirmar assinatura"
            placeholder="Digite seu nome completo"
            className="h-7 px-2 rounded text-[12px] border w-full"
            style={{ borderColor: "var(--line-strong)", color: "var(--ink-secondary)", background: "#fff" }}
          />
        </div>
      )}

      {error && <p className="text-[11px]" style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => { clear(); setNomeDigitado(""); }}
          className="h-7 px-2.5 rounded text-[11px] border"
          style={{ borderColor: "var(--line)", color: "var(--ink-secondary)" }}>
          Limpar
        </button>
        <button type="button" onClick={salvar} disabled={!podeConfirmar || saving}
          className="h-7 px-3 rounded text-[11px] font-semibold disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
          {saving ? "Salvando..." : "Confirmar"}
        </button>
      </div>
    </div>
  );
}
