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
          { href: "/trocas", label: "Agenda de Trocas", marca: "AT" },
        ] : []),
  ];
  const consultas = [
    { href: "/ca", label: "Consulta CA", marca: "CA" },
  ];
  const admin = [
    ...(perfil === "supervisor"
      ? [{ href: "/usuarios", label: "Usuarios", marca: "U" }] : []),
  ];
  return { cadastros, operacoes, consultas, admin };
}

type NavItem2 = { href: string; label: string; marca: string };

function NavItem({ href, label, marca, active, collapsed, onNavigate }: NavItem2 & {
  active: boolean; collapsed: boolean; onNavigate?: () => void;
}) {
  return (
    <Link href={href} onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-md py-2 text-[13px] transition-colors"
      style={{
        padding: "8px 10px",
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

function NavGroup({ label, items, pathname, collapsed, onNavigate }: {
  label: string; items: NavItem2[]; pathname: string | null; collapsed: boolean; onNavigate?: () => void;
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
        <NavItem key={item.href} {...item} active={!!pathname?.startsWith(item.href)}
          collapsed={collapsed} onNavigate={onNavigate} />
      ))}
    </>
  );
}

/** Conteudo interno reaproveitado pelo painel desktop e pelo drawer mobile. */
function PainelInterno({ perfil, collapsed, headerRight, onNavigate }: {
  perfil: PerfilUsuario;
  collapsed: boolean;
  headerRight: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const nav = getNav(perfil.perfil);

  return (
    <>
      {/* Header */}
      <div className="px-3 pt-4 pb-4 border-b flex items-center justify-between gap-2"
        style={{ borderColor: "var(--line-soft)" }}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>CA</span>
            <div className="leading-tight min-w-0">
              <p className="text-[13px] font-semibold tracking-tight truncate" style={{ color: "var(--ink)" }}>
                Onsafety EPI
              </p>
              <p className="text-[11px]" style={{ color: "var(--ink-tertiary)" }}>FAAB Engenharia</p>
            </div>
          </div>
        ) : (
          <span className="flex h-8 w-8 mx-auto items-center justify-center rounded-md text-sm font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>CA</span>
        )}
        {headerRight}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <NavGroup label="Cadastros" items={nav.cadastros} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
        <NavGroup label="Operacoes" items={nav.operacoes} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
        <NavGroup label="Consultas" items={nav.consultas} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
        {nav.admin.length > 0 && (
          <NavGroup label="Admin" items={nav.admin} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
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
    </>
  );
}

export function Sidebar({ perfil, mobileOpen = false, onClose }: {
  perfil: PerfilUsuario;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  // Trava o scroll do body quando o drawer mobile esta aberto
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mobileOpen]);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  }

  const w = collapsed ? "w-14" : "w-60";

  return (
    <>
      {/* ===== Desktop (>= lg): fixa e colapsavel ===== */}
      <aside className={`${w} shrink-0 border-r flex-col transition-all duration-200 hidden lg:flex`}
        style={{ background: "var(--canvas)", borderColor: "var(--line)" }}>
        <PainelInterno
          perfil={perfil}
          collapsed={collapsed}
          headerRight={
            <button onClick={toggle} className="shrink-0 flex items-center justify-center h-7 w-7 rounded-md transition-colors"
              style={{ color: "var(--ink-tertiary)" }}
              title={collapsed ? "Expandir menu" : "Recolher menu"}>
              {collapsed ? "»" : "«"}
            </button>
          }
        />
      </aside>

      {/* ===== Mobile/tablet (< lg): drawer off-canvas ===== */}
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-200 ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(0,0,0,0.45)" }}
        aria-hidden="true"
      />
      {/* Drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 border-r flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--canvas)", borderColor: "var(--line)" }}
      >
        <PainelInterno
          perfil={perfil}
          collapsed={false}
          onNavigate={onClose}
          headerRight={
            <button onClick={onClose} className="shrink-0 flex items-center justify-center h-7 w-7 rounded-md text-[18px] leading-none"
              style={{ color: "var(--ink-tertiary)" }}
              aria-label="Fechar menu">
              ×
            </button>
          }
        />
      </aside>
    </>
  );
}
