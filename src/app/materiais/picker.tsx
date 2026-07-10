"use client";

import { useState } from "react";
import Link from "next/link";

type Seg = { id: string; codigo: string; nome: string };
type Cat = { id: string; codigo: string; nome: string; segmento_id: string };
type Tip = { id: string; codigo: string; nome: string; categoria_id: string };
type Ins = {
  id: string; codigo: string; nome: string | null; nome_gerado: string | null;
  marca: string | null; material_acabamento: string | null; info_adicional: string | null;
  apresentacao: string | null; grupo_insumo: string | null; controla_estoque: boolean;
  segmento_id: string; categoria_id: string; tipo_id: string;
  validado: boolean; ativo: boolean; ficha_tecnica_id: string | null;
};

export function CatalogoPicker({
  segmentos, categorias, tipos, insumos, podeEscrever,
}: {
  segmentos: Seg[]; categorias: Cat[]; tipos: Tip[]; insumos: Ins[]; podeEscrever: boolean;
}) {
  const [segId, setSegId] = useState("");
  const [catId, setCatId] = useState("");
  const [tipId, setTipId] = useState("");
  const [busca, setBusca] = useState("");

  const catsFiltradas = segId ? categorias.filter((c) => c.segmento_id === segId) : categorias;
  const tiposFiltrados = catId ? tipos.filter((t) => t.categoria_id === catId) : tipos;

  const insumosFiltrados = insumos.filter((i) =>
    (!segId || i.segmento_id === segId) &&
    (!catId || i.categoria_id === catId) &&
    (!tipId || i.tipo_id === tipId) &&
    (!busca || [i.nome, i.marca, i.info_adicional, i.codigo, i.nome_gerado, i.material_acabamento]
      .filter(Boolean).join(" ").toLowerCase().includes(busca.toLowerCase()))
  );

  function contarInsumos(nivel: string, id: string) {
    if (nivel === "seg") return insumos.filter((i) => i.segmento_id === id).length;
    if (nivel === "cat") return insumos.filter((i) => i.categoria_id === id).length;
    return insumos.filter((i) => i.tipo_id === id).length;
  }

  const segNome = segmentos.find((s) => s.id === segId)?.nome;
  const catNome = categorias.find((c) => c.id === catId)?.nome;
  const tipNome = tipos.find((t) => t.id === tipId)?.nome;
  const breadcrumb = [segNome, catNome, tipNome].filter(Boolean).join(" → ");

  const novoUrl = segId && catId && tipId
    ? `/materiais/novo?segmento_id=${segId}&categoria_id=${catId}&tipo_id=${tipId}`
    : "/materiais/novo";

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <MetricaMini rotulo="Segmentos" valor={segmentos.length} />
        <MetricaMini rotulo="Categorias" valor={catsFiltradas.length} />
        <MetricaMini rotulo="Tipos" valor={tiposFiltrados.length} />
      </div>

      {/* Filtros */}
      <div className="rounded-lg border p-5 space-y-4"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: "var(--ink-tertiary)" }}>
          Navegar pelo catalogo
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Filtro label="Segmento" value={segId}
            onChange={(v) => { setSegId(v); setCatId(""); setTipId(""); }}
            options={segmentos.map((s) => ({
              value: s.id,
              label: `${s.codigo} · ${s.nome} (${contarInsumos("seg", s.id)})`,
            }))} />
          <Filtro label="Categoria" value={catId}
            onChange={(v) => { setCatId(v); setTipId(""); }}
            options={catsFiltradas.map((c) => ({
              value: c.id,
              label: `${c.codigo} · ${c.nome} (${contarInsumos("cat", c.id)})`,
            }))} />
          <Filtro label="Tipo" value={tipId} onChange={setTipId}
            options={tiposFiltrados.map((t) => ({
              value: t.id,
              label: `${t.codigo} · ${t.nome} (${contarInsumos("tip", t.id)})`,
            }))} />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex-1 flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em]"
              style={{ color: "var(--ink-tertiary)" }}>Buscar</span>
            <input value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, marca, codigo ou material..."
              className="h-[38px] rounded-md border px-3 text-[13px] outline-none"
              style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }} />
          </label>
          {(segId || catId || tipId || busca) && (
            <button onClick={() => { setSegId(""); setCatId(""); setTipId(""); setBusca(""); }}
              className="self-end h-[38px] px-3 rounded-md text-[12px] border transition-colors"
              style={{ borderColor: "var(--line)", color: "var(--ink-secondary)" }}>
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb + ações */}
      <div className="flex items-center justify-between">
        <div>
          {breadcrumb && (
            <p className="text-[12px] font-medium" style={{ color: "var(--ink-secondary)" }}>
              {breadcrumb}
            </p>
          )}
          <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
            {insumosFiltrados.length} insumo{insumosFiltrados.length !== 1 ? "s" : ""} encontrado{insumosFiltrados.length !== 1 ? "s" : ""}
          </p>
        </div>
        {podeEscrever && (
          <Link href={novoUrl}
            className="h-9 px-5 rounded-md text-[13px] font-semibold inline-flex items-center transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
            Novo insumo
          </Link>
        )}
      </div>

      {/* Estado vazio */}
      {!segId && !catId && !tipId && !busca && insumos.length === 0 && (
        <div className="rounded-lg border p-8 text-center"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <p className="text-[14px] font-medium mb-1" style={{ color: "var(--ink)" }}>
            Catalogo de materiais
          </p>
          <p className="text-[13px] mb-4" style={{ color: "var(--ink-muted)" }}>
            Use os filtros acima para navegar. Selecione segmento, categoria e tipo para ver e cadastrar insumos.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {segmentos.map((s) => (
              <button key={s.id} onClick={() => setSegId(s.id)}
                className="h-8 px-3 rounded-md text-[12px] font-medium border transition-colors hover:border-[var(--accent)]"
                style={{ borderColor: "var(--line)", color: "var(--ink-secondary)", background: "var(--surface-raised)" }}>
                {s.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabela de insumos */}
      {insumosFiltrados.length > 0 && (
        <section className="rounded-lg border overflow-x-auto" style={{ borderColor: "var(--line)" }}>
          <table className="w-full min-w-[760px] text-[13px] border-collapse">
            <thead>
              <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
                <Th>Codigo</Th>
                <Th>Nome</Th>
                <Th>Marca</Th>
                <Th>Material</Th>
                <Th>Apresentacao</Th>
                <Th align="right">Status</Th>
              </tr>
            </thead>
            <tbody>
              {insumosFiltrados.map((ins, i) => {
                const tipo = tipos.find((t) => t.id === ins.tipo_id);
                return (
                  <tr key={ins.id} style={{
                    background: i % 2 === 0 ? "var(--surface-raised)" : "var(--surface)",
                    borderBottom: "1px solid var(--line-soft)",
                  }}>
                    <td className="px-4 py-3">
                      <span className="tabular font-semibold" style={{ color: "var(--accent)" }}>{ins.codigo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ fontWeight: 600, color: "var(--ink)" }}>{ins.nome ?? ins.nome_gerado ?? "—"}</span>
                      {tipo && (
                        <span className="block text-[11px]" style={{ color: "var(--ink-muted)" }}>
                          {tipo.codigo} · {tipo.nome}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ color: "var(--ink-secondary)" }}>{ins.marca ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ color: "var(--ink-secondary)" }}>{ins.material_acabamento ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ color: "var(--ink-tertiary)" }}>{ins.apresentacao ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {ins.ficha_tecnica_id && (
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>CA</span>
                        )}
                        {ins.controla_estoque && (
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                            style={{ background: "var(--success-soft)", color: "var(--success)" }}>Estoque</span>
                        )}
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                          style={{
                            background: ins.validado ? "var(--success-soft)" : "var(--surface-2)",
                            color: ins.validado ? "var(--success)" : "var(--ink-tertiary)",
                          }}>
                          {ins.validado ? "Validado" : "Pendente"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {insumosFiltrados.length === 0 && (segId || catId || tipId || busca) && (
        <div className="rounded-lg border p-6 text-center"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
            Nenhum insumo encontrado para os filtros selecionados.
          </p>
          {podeEscrever && (
            <Link href={novoUrl}
              className="mt-3 h-8 px-4 rounded-md text-[12px] font-semibold inline-flex items-center transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
              Cadastrar primeiro insumo
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function MetricaMini({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-lg border p-3 text-center"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <p className="text-[20px] font-bold tabular leading-none mb-1" style={{ color: "var(--ink)" }}>
        {String(valor).padStart(2, "0")}
      </p>
      <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--ink-muted)" }}>{rotulo}</p>
    </div>
  );
}

function Filtro({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.08em]"
        style={{ color: "var(--ink-tertiary)" }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="h-[38px] rounded-md border px-3 text-[13px] outline-none"
        style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}>
        <option value="">Todos</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={"px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] " + (align === "right" ? "text-right" : "text-left")}
      style={{ color: "var(--ink-tertiary)" }}>{children}</th>
  );
}
