"use client";

import { useState } from "react";
import { AssinaturaCanvas } from "@/components/assinatura-canvas";
import { apagarAssinatura } from "@/app/auth/actions";

interface Props {
  movimentacaoId: string;
  colaboradorId: string;
  assinaturaUrl: string | null;
}

export function ColunaAssinatura({ movimentacaoId, colaboradorId, assinaturaUrl }: Props) {
  const [url, setUrl] = useState(assinaturaUrl);
  const [showCanvas, setShowCanvas] = useState(false);
  const [apagando, setApagando] = useState(false);

  async function handleApagar() {
    if (!confirm("Apagar assinatura? Nao podera ser desfeito.")) return;
    setApagando(true);
    const res = await apagarAssinatura(movimentacaoId, colaboradorId);
    if (!res.error) setUrl(null);
    setApagando(false);
  }

  if (url) {
    return (
      <div className="relative inline-block print:block group">
        <img
          src={url}
          alt="Assinatura"
          className="h-12 max-w-[140px] object-contain rounded-md"
          style={{ border: "1px solid var(--line)", background: "#fff" }}
        />
        {/* Botao X no canto superior direito, visivel no hover */}
        <button
          type="button"
          onClick={handleApagar}
          disabled={apagando}
          className="print:hidden absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shadow-sm transition-opacity opacity-0 group-hover:opacity-100 disabled:opacity-40"
          style={{
            background: "var(--danger, #dc2626)",
            color: "#fff",
            border: "1.5px solid #fff",
          }}
          title="Apagar assinatura"
        >
          {apagando ? "·" : "×"}
        </button>
      </div>
    );
  }

  if (showCanvas) {
    return (
      <AssinaturaCanvas
        movimentacaoId={movimentacaoId}
        colaboradorId={colaboradorId}
        onSalvo={(u) => { setUrl(u); setShowCanvas(false); }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowCanvas(true)}
      className="h-8 px-3 rounded-md text-[11px] font-semibold border transition-colors print:hidden"
      style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
    >
      Assinar
    </button>
  );
}
