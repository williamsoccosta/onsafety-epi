import Link from "next/link";

export default function Home() {
  return (
    <main className="px-8 py-10 max-w-2xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>
        Painel interno
      </p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
        Onsafety EPI
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--ink-secondary)" }}>
        Controle de equipamentos de protecao individual e fardamento da FAAB Engenharia --
        do cadastro de colaboradores e obras ate a entrega em campo.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/colaboradores"
          className="rounded-md border px-4 py-2 text-[13px] font-medium transition-colors"
          style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
        >
          Ver colaboradores
        </Link>
        <Link
          href="/obras"
          className="rounded-md border px-4 py-2 text-[13px] font-medium transition-colors"
          style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
        >
          Ver obras
        </Link>
      </div>
    </main>
  );
}
