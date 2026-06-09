"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const CADASTROS = [
  { href: "/colaboradores", label: "Colaboradores", marca: "C" },
  { href: "/obras", label: "Obras", marca: "O" },
  { href: "/epis", label: "Catalogo EPI", marca: "E" },
];

const OPERACOES = [
  { href: "/movimentacoes", label: "Movimentacoes", marca: "M" },
];

const CONSULTAS = [
  { href: "/ca", label: "Consulta CA", marca: "CA" },
];

function NavItem({ href, label, marca, active }: { href: string; label: string; marca: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors"
      style={{
        background: active ? "var(--surface)" : "transparent",
        color: active ? "var(--ink)" : "var(--ink-secondary)",
        border: active ? "1px solid var(--line)" : "1px solid transparent",
        fontWeight: active ? 600 : 500,
      }}
    >
      <span
        className="flex h-5 shrink-0 items-center justify-center rounded text-[9px] font-semibold"
        style={{
          width: marca.length > 1 ? "24px" : "20px",
          background: active ? "var(--accent-soft)" : "var(--surface-2)",
          color: active ? "var(--accent)" : "var(--ink-tertiary)",
        }}
      >
        {marca}
      </span>
      {label}
    </Link>
  );
}

function NavGroup({ label, items, pathname }: { label: string; items: typeof CADASTROS; pathname: string | null }) {
  return (
    <>
      <p className="px-2.5 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] first:pt-0" style={{ color: "var(--ink-muted)" }}>
        {label}
      </p>
      {items.map((item) => (
        <NavItem key={item.href} {...item} active={!!pathname?.startsWith(item.href)} />
      ))}
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 shrink-0 border-r flex flex-col"
      style={{ background: "var(--canvas)", borderColor: "var(--line)" }}
    >
      <div className="px-5 pt-6 pb-5 border-b" style={{ borderColor: "var(--line-soft)" }}>
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold tabular"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            CA
          </span>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>Onsafety EPI</p>
            <p className="text-[11px]" style={{ color: "var(--ink-tertiary)" }}>FAAB Engenharia</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <NavGroup label="Cadastros" items={CADASTROS} pathname={pathname} />
        <NavGroup label="Operacoes" items={OPERACOES} pathname={pathname} />
        <NavGroup label="Consultas" items={CONSULTAS} pathname={pathname} />
      </nav>

      <div className="px-5 py-4 border-t" style={{ borderColor: "var(--line-soft)" }}>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>
          Painel interno — operadores de almoxarifado.
        </p>
      </div>
    </aside>
  );
}
