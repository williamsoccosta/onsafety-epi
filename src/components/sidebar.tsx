"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { logoutAction } from "@/app/auth/actions";
import type { PerfilUsuario, Perfil } from "@/lib/types";
import { LABELS_PERFIL } from "@/lib/types";

function getNav(perfil: Perfil) {
  const cadastros = [
    ...(["supervisor","almoxarife","administrativo"].includes(perfil)
      ? [{ href: "/colaboradores", label: "Colaboradores", marca: "C" }] : []),
    ...(["supervisor"].includes(perfil)
      ? [{ href: "/obras", label: "Obras", marca: "O" }] : []),
    ...(["supervisor","almoxarife"].includes(perfil)
      ? [{ href: "/epis", label: "Catalogo EPI", marca: "E" }] : []),
  ];
  const operacoes = [
    ...(["supervisor","almoxarife","tecnico_seguranca"].includes(perfil)
      ? [
          { href: "/movimentacoes", label: "Movimentacoes", marca: "M" },
          { href: "/movimentacoes/nova-entrega", label: "Entrega de EPI", marca: "EE" },
        ] : []),
  ];
  const consultas = [
    ...(perfil !== "colaborador"
      ? [{ href: "/ca", label: "Consulta CA", marca: "CA" }] : []),
  ];
  const admin = [
    ...(perfil === "supervisor"
      ? [{ href: "/usuarios", label: "Usuarios", marca: "U" }] : []),
  ];
  return { cadastros, operacoes, consultas, admin };
}

type NavItem2 = { href: string; label: string; marca: string };

function NavItem({ href, label, marca, active, collapsed }: NavItem2 & { active: boolean; collapsed: boolean }) {
  return (
    <Link href={href}
      className="flex items-center gap-2.5 rounded-md py-2 text-[13px] transition-colors"
      style={{
        padding: collapsed ? "8px 10px" : "8px 10px",
        justifyContent: collapsed ? "center" : undefined,
        background: active ? "var(--surface)" : "transparent",
        color: active ? "var(--ink)" : "var(--ink-secondary)",
        border: active ? "1px solid var(--line)" : "1px solid transparent",
        fontWeight: active ? 600 : 500,
      }}
      title={collapsed ? label : undefined}>
      <span className="flex h-5 shrink-0 items-center justify-center rounded text-[9px] font-semibold"
        style={{
          width: marca.length > 1 ? "24px" : "20px",
          background: active ? "var(--accent-soft)" : "var(--surface-2)",
          color: active ? "var(--accent)" : "var(--ink-tertiary)",
        }}>
        {marca}
      </span>
      {!collapsed && label}
    </Link>
  );
}

function NavGroup({ label, items, pathname, collapsed }: {
  label: string; items: NavItem2[]; pathname: string | null; collapsed: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <>
      {!collapsed && (
        <p className="px-2.5 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--ink-muted)" }}>{label}</p>
      )}
      {collapsed && <div className="pt-2" />}
      {items.map((item) => (
        <NavItem key={item.href} {...item} active={!!pathname?.startsWith(item.href)} collapsed={collapsed} />
      ))}
    </>
  );
}

export function Sidebar({ perfil }: { perfil: PerfilUsuario }) {
  const pathname = usePathname();
  const nav = getNav(perfil.perfil);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  }

  const w = collapsed ? "w-14" : "w-60";

  return (
    <aside className={`${w} shrink-0 border-r flex flex-col transition-all duration-200`}
      style={{ background: "var(--canvas)", borderColor: "var(--line)" }}>

      {/* Header */}
      <div className="px-3 pt-4 pb-4 border-b flex items-center justify-between gap-2"
        style={{ borderColor: "var(--line-soft)" }}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>CA</span>
            <div className="leading-tight min-w-0">
              <p className="text-[13px] font-semibold tracking-tight truncate" style={{ color: "var(--ink)" }}>
                Onsafety EPI
              </p>
              <p className="text-[11px]" style={{ color: "var(--ink-tertiary)" }}>FAAB Engenharia</p>
            </div>
          </div>
        )}
        {collapsed && (
          <span className="flex h-8 w-8 mx-auto items-center justify-center rounded-md text-sm font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>CA</span>
        )}
        <button onClick={toggle} className="shrink-0 flex items-center justify-center h-7 w-7 rounded-md transition-colors"
          style={{ color: "var(--ink-tertiary)" }}
          title={collapsed ? "Expandir menu" : "Recolher menu"}>
          {collapsed ? "»" : "«"}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <NavGroup label="Cadastros" items={nav.cadastros} pathname={pathname} collapsed={collapsed} />
        <NavGroup label="Operacoes" items={nav.operacoes} pathname={pathname} collapsed={collapsed} />
        <NavGroup label="Consultas" items={nav.consultas} pathname={pathname} collapsed={collapsed} />
        {nav.admin.length > 0 && (
          <NavGroup label="Admin" items={nav.admin} pathname={pathname} collapsed={collapsed} />
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t space-y-2" style={{ borderColor: "var(--line-soft)" }}>
        {!collapsed && (
          <div>
            <p className="text-[12px] font-medium truncate" style={{ color: "var(--ink)" }}>
              {perfil.nome ?? perfil.email}
            </p>
            <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
              {LABELS_PERFIL[perfil.perfil]}
            </p>
          </div>
        )}
        <form action={logoutAction}>
          <button type="submit"
            className="w-full h-8 rounded-md text-[12px] font-medium border transition-colors"
            style={{ borderColor: "var(--line)", color: "var(--ink-secondary)", background: "transparent" }}
            title="Sair">
            {collapsed ? "×" : "Sair"}
          </button>
        </form>
      </div>
    </aside>
  );
}
