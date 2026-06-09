"use client";

export function BotaoImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="h-[36px] px-4 rounded-md border text-[13px] font-medium transition-opacity hover:opacity-80 print:hidden"
      style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink-secondary)" }}
    >
      Imprimir / Salvar PDF
    </button>
  );
}
