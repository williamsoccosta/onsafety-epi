import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getPerfilAtual } from "@/lib/auth";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Onsafety EPI - FAAB Engenharia",
  description: "Gestao de EPIs e fardamentos em obra",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const perfil = await getPerfilAtual();

  return (
    <html lang="pt-BR">
      <body
        className={`${display.variable} ${mono.variable} antialiased`}
        style={{ fontFamily: "var(--font-display), sans-serif" }}
      >
        <AppShell perfil={perfil}>{children}</AppShell>
      </body>
    </html>
  );
}
