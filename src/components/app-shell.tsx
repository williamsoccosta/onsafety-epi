"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import type { PerfilUsuario } from "@/lib/types";

const NO_SHELL_PATHS = ["/login"];

export function AppShell({ children, perfil }: {
  children: React.ReactNode;
  perfil: PerfilUsuario | null;
}) {
  const pathname = usePathname();
  const isAuthPage = NO_SHELL_PATHS.some(p => pathname.startsWith(p));

  if (isAuthPage || !perfil) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar perfil={perfil} />
      <div className="flex-1 min-w-0 overflow-auto">{children}</div>
    </div>
  );
}
