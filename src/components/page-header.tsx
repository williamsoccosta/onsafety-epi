export function CabecalhoPagina({
  titulo,
  subtitulo,
  contagem,
  rotulo,
}: {
  titulo: string;
  subtitulo: string;
  contagem: number;
  rotulo: string;
}) {
  return (
    <header
      className="flex items-end justify-between px-8 py-6 border-b"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}
    >
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
          {titulo}
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: "var(--ink-tertiary)" }}>
          {subtitulo}
        </p>
      </div>
      <div
        className="flex items-baseline gap-1.5 rounded-md border px-3 py-1.5"
        style={{ borderColor: "var(--line)", background: "var(--surface-raised)" }}
      >
        <span className="text-[20px] font-semibold tabular leading-none" style={{ color: "var(--ink)" }}>
          {String(contagem).padStart(2, "0")}
        </span>
        <span className="text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--ink-tertiary)" }}>
          {rotulo}
        </span>
      </div>
    </header>
  );
}
