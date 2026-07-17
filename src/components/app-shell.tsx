"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import type { PerfilUsuario } from "@/lib/types";
import Link from "next/link";

const NO_SHELL_PATHS = ["/login"];

const SIDEBAR_MODULES = ["/epis", "/movimentacoes", "/trocas", "/materiais"];

function hasSidebar(pathname: string) {
  return SIDEBAR_MODULES.some((m) => pathname.startsWith(m));
}

function getModuleTitle(pathname: string): string | null {
  if (pathname.startsWith("/colaboradores")) return "Colaboradores";
  if (pathname.startsWith("/obras")) return "Obras";
  if (pathname.startsWith("/empresas")) return "Empresas";
  if (pathname.startsWith("/rh")) return "RH";
  if (pathname.startsWith("/ca")) return "Consulta CA";
  if (pathname.startsWith("/usuarios")) return "Usuarios";
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  return null;
}

export function AppShell({ children, perfil }: {
  children: React.ReactNode;
  perfil: PerfilUsuario | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthPage = NO_SHELL_PATHS.some(p => pathname.startsWith(p));

  if (isAuthPage || !perfil) {
    return <>{children}</>;
  }

  const isHome = pathname === "/";
  const showSidebar = hasSidebar(pathname);
  const moduleTitle = getModuleTitle(pathname);

  if (isHome) {
    return <>{children}</>;
  }

  if (showSidebar) {
    return (
      <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
        <Sidebar perfil={perfil} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex-1 min-w-0 flex flex-col">
          <header
            className="lg:hidden sticky top-0 flex items-center gap-3 px-4 h-14 border-b"
            style={{ background: "var(--canvas)", borderColor: "var(--line)", zIndex: "var(--z-header)" }}
          >
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
              className="flex items-center justify-center h-11 w-11 rounded-md border text-[18px] leading-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--surface)" }}
            >
              ☰
            </button>
            <Link href="/"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[12px] font-bold"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
              CA
            </Link>
            <span className="text-[14px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
              Onsafety EPI
            </span>
          </header>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      <header
        className="sticky top-0 flex items-center gap-3 px-4 sm:px-8 h-14 border-b"
        style={{ background: "var(--canvas)", borderColor: "var(--line)", zIndex: "var(--z-header)" }}
      >
        <Link href="/"
          className="flex items-center gap-2 text-[13px] transition-opacity hover:opacity-70"
          style={{ color: "var(--ink-secondary)" }}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[12px] font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
            CA
          </span>
          <span>&#8592;</span>
        </Link>
        {moduleTitle && (
          <span className="text-[14px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
            {moduleTitle}
          </span>
        )}
      </header>
      {children}
    </div>
  );
}
