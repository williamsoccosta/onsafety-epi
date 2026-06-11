"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import type { PerfilUsuario } from "@/lib/types";

const NO_SHELL_PATHS = ["/login"];

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

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar perfil={perfil} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col overflow-auto">
        {/* Topbar — apenas mobile/tablet */}
        <header
          className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b"
          style={{ background: "var(--canvas)", borderColor: "var(--line)" }}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="flex items-center justify-center h-9 w-9 rounded-md border text-[18px] leading-none"
            style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--surface)" }}
          >
            ☰
          </button>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[12px] font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>CA</span>
          <span className="text-[14px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
            Onsafety EPI
          </span>
        </header>

        {children}
      </div>
    </div>
  );
}
