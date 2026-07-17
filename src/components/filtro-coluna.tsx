"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useEffect } from "react";

interface FiltroColunaProps {
  rotulo: string;
  parametro: string;
  modo: "texto" | "opcoes";
  opcoes?: string[];
  placeholder?: string;
  align?: "left" | "right";
}

export function FiltroColuna({
  rotulo,
  parametro,
  modo,
  opcoes = [],
  placeholder = "Filtrar...",
  align = "left",
}: FiltroColunaProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const valorAtivo = searchParams.get(parametro) ?? "";

  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const containerRef = useRef<HTMLTableCellElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (aberto && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
        setBusca("");
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [aberto]);

  function alternarAberto() {
    const proximo = !aberto;
    setAberto(proximo);
    if (proximo) {
      setBusca(modo === "texto" ? valorAtivo : "");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function aplicarFiltro(valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor.trim()) {
      params.set(parametro, valor.trim());
    } else {
      params.delete(parametro);
    }
    router.replace("/ca?" + params.toString());
    setAberto(false);
    setBusca("");
  }

  function limparFiltro() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(parametro);
    router.replace("/ca?" + params.toString());
    setAberto(false);
    setBusca("");
  }

  const opcoesFiltradas = opcoes.filter((o) =>
    o.toLowerCase().includes(busca.toLowerCase())
  );

  const ativo = valorAtivo.length > 0;

  return (
    <th
      ref={containerRef}
      style={{ position: "relative", overflow: "visible" }}
      className={"px-4 py-3 " + (align === "right" ? "text-right" : "text-left")}
    >
      <button
        onClick={alternarAberto}
        aria-expanded={aberto}
        aria-haspopup={modo === "opcoes" ? "listbox" : "dialog"}
        className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-opacity hover:opacity-70"
        style={{
          color: ativo ? "var(--accent)" : "var(--ink-tertiary)",
          marginLeft: align === "right" ? "auto" : undefined,
        }}
      >
        {rotulo}
        {ativo && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--accent)",
              flexShrink: 0,
              display: "inline-block",
            }}
          />
        )}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="currentColor"
          style={{ opacity: 0.6, flexShrink: 0 }}
        >
          <path d="M5 7L1 3h8L5 7z" />
        </svg>
      </button>

      {aberto && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            [align === "right" ? "right" : "left"]: 0,
            zIndex: "var(--z-dropdown)",
            minWidth: 220,
            background: "var(--surface-raised)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <input
            ref={inputRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={placeholder}
            aria-label={rotulo}
            onKeyDown={(e) => {
              if (e.key === "Enter" && modo === "texto") aplicarFiltro(busca);
              if (e.key === "Escape") { setAberto(false); setBusca(""); }
            }}
            className="w-full h-[32px] px-3 rounded-md border text-[12px]"
            style={{
              background: "var(--control-bg)",
              borderColor: "var(--control-border)",
              color: "var(--ink)",
            }}
          />

          {modo === "texto" && (
            <button
              onClick={() => aplicarFiltro(busca)}
              className="h-[30px] px-3 rounded-md text-[12px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              Aplicar
            </button>
          )}

          {modo === "opcoes" && opcoesFiltradas.length > 0 && (
            <ul
              role="listbox"
              aria-label={rotulo}
              style={{
                maxHeight: 200,
                overflowY: "auto",
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {opcoesFiltradas.map((opcao) => {
                const selecionado = valorAtivo === opcao;
                return (
                  <li key={opcao} role="presentation">
                    <button
                      onClick={() => selecionado ? limparFiltro() : aplicarFiltro(opcao)}
                      role="option"
                      aria-selected={selecionado}
                      className="w-full text-left px-3 py-1.5 rounded text-[12px] transition-colors hover:opacity-80"
                      style={{
                        background: selecionado ? "var(--accent)" : "transparent",
                        color: selecionado ? "var(--accent-ink)" : "var(--ink-secondary)",
                        fontWeight: selecionado ? 600 : 400,
                      }}
                    >
                      {opcao}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {modo === "opcoes" && opcoesFiltradas.length === 0 && (
            <p className="text-[11px] px-2 py-1" style={{ color: "var(--ink-muted)" }}>
              Nenhuma opção encontrada
            </p>
          )}

          <div style={{ borderTop: "1px solid var(--line-soft)", marginTop: 2, paddingTop: 4 }}>
            <button
              onClick={limparFiltro}
              disabled={!ativo}
              className="w-full text-left px-2 py-1 rounded text-[11px] transition-opacity hover:opacity-70"
              style={{
                color: "var(--danger)",
                opacity: ativo ? 1 : 0.3,
                cursor: ativo ? "pointer" : "default",
              }}
            >
              Limpar filtro
            </button>
          </div>
        </div>
      )}
    </th>
  );
}
