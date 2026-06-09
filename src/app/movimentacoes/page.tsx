import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/page-header";
import { Selo } from "@/components/selo";
import { MovForm } from "./form";

export const dynamic = "force-dynamic";

function formatarDataHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const MOTIVO_COR: Record<string, "ok" | "off" | "alert"> = {
  Entrada: "ok",
  "Quantidade Inicial": "ok",
  Entrega: "alert",
  Substituicao: "alert",
  Devolucao: "off",
};

export default async function MovimentacoesPage() {
  const supabase = await createClient();

  const [
    { data: obras },
    { data: epis },
    { data: colaboradores },
    { data: movs },
    { data: estoque },
  ] = await Promise.all([
    supabase.schema("obras").from("obras").select("id,nome").eq("ativa", true).order("nome"),
    supabase.schema("epi").from("itens").select("id,nome,complemento,ca").eq("ativo", true).order("nome"),
    supabase.schema("epi").from("colaboradores").select("id,nome,matricula").eq("ativo", true).order("nome"),
    supabase.schema("epi").from("movimentacoes").select("id,motivo,quantidade,observacao,criado_em,epi_id(nome,complemento),obra_id(nome),colaborador_id(nome,matricula)").order("criado_em", { ascending: false }).limit(60),
    supabase.schema("epi").from("estoque").select("saldo,epi_id(id,nome,complemento,ca),obra_id(id,nome)").order("saldo", { ascending: false }),
  ]);

  const totalMovs = movs?.length ?? 0;

  // group estoque by obra
  const estoqueByObra = (estoque ?? []).reduce<Record<string, { obraNome: string; itens: typeof estoque }>>((acc, row) => {
    const obra = row.obra_id as unknown as { id: string; nome: string };
    if (!acc[obra.id]) acc[obra.id] = { obraNome: obra.nome, itens: [] };
    acc[obra.id].itens!.push(row);
    return acc;
  }, {});

  return (
    <main>
      <CabecalhoPagina
        titulo="Movimentacoes"
        subtitulo="Entradas, entregas e devolucoes de EPI por obra"
        contagem={totalMovs}
        rotulo="registros"
      />

      <div className="px-8 py-6 space-y-8">
        <MovForm
          obras={obras ?? []}
          epis={epis ?? []}
          colaboradores={colaboradores ?? []}
        />

        {/* Estoque atual */}
        {Object.keys(estoqueByObra).length > 0 && (
          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--ink-tertiary)" }}>
              Estoque atual por obra
            </p>
            {Object.values(estoqueByObra).map((grupo) => (
              <div key={grupo.obraNome} className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--line)" }}>
                <div
                  className="px-4 py-2 border-b"
                  style={{ background: "var(--surface-2)", borderColor: "var(--line)", color: "var(--ink-secondary)" }}
                >
                  <span className="text-[12px] font-semibold">{grupo.obraNome}</span>
                </div>
                <table className="w-full text-[13px] border-collapse">
                  <tbody>
                    {(grupo.itens ?? []).map((row, i) => {
                      const epi = row.epi_id as unknown as { nome: string; complemento: string | null; ca: string | null };
                      const saldo = row.saldo as number;
                      return (
                        <tr
                          key={i}
                          style={{
                            background: i % 2 === 0 ? "var(--surface-raised)" : "var(--surface)",
                            borderBottom: "1px solid var(--line-soft)",
                          }}
                        >
                          <td className="px-4 py-2.5">
                            <span style={{ color: "var(--ink)", fontWeight: 500 }}>{epi.nome}</span>
                            {epi.complemento && (
                              <span className="ml-2 text-[12px]" style={{ color: "var(--ink-tertiary)" }}>{epi.complemento}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {epi.ca && (
                              <span className="tabular text-[12px]" style={{ color: "var(--ink-muted)" }}>CA {epi.ca}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span
                              className="tabular text-[15px] font-semibold"
                              style={{ color: saldo <= 0 ? "var(--danger)" : saldo <= 3 ? "var(--accent)" : "var(--ink)" }}
                            >
                              {saldo}
                            </span>
                            <span className="ml-1 text-[11px]" style={{ color: "var(--ink-muted)" }}>un</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </section>
        )}

        {/* Historico */}
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--ink-tertiary)" }}>
            Historico recente
          </p>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--line)" }}>
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
                  <Th>Data/hora</Th>
                  <Th>Obra</Th>
                  <Th>EPI</Th>
                  <Th>Colaborador</Th>
                  <Th align="right">Qtd</Th>
                  <Th align="right">Motivo</Th>
                </tr>
              </thead>
              <tbody>
                {(movs ?? []).map((m, i) => {
                  const epi = m.epi_id as unknown as { nome: string; complemento: string | null };
                  const obra = m.obra_id as unknown as { nome: string };
                  const colab = m.colaborador_id as unknown as { nome: string; matricula: string | null } | null;
                  const qty = m.quantidade as number;
                  return (
                    <tr
                      key={m.id}
                      style={{
                        background: i % 2 === 0 ? "var(--surface-raised)" : "var(--surface)",
                        borderBottom: "1px solid var(--line-soft)",
                      }}
                    >
                      <td className="px-4 py-2.5">
                        <span className="tabular text-[12px]" style={{ color: "var(--ink-tertiary)" }}>
                          {formatarDataHora(m.criado_em)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span style={{ color: "var(--ink-secondary)" }}>{obra?.nome ?? "—"}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span style={{ color: "var(--ink)", fontWeight: 500 }}>{epi?.nome ?? "—"}</span>
                        {epi?.complemento && (
                          <span className="ml-1 text-[12px]" style={{ color: "var(--ink-tertiary)" }}>{epi.complemento}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {colab ? (
                          <span style={{ color: "var(--ink-secondary)" }}>
                            {colab.nome}
                            {colab.matricula && (
                              <span className="ml-1 tabular text-[11px]" style={{ color: "var(--ink-muted)" }}>{colab.matricula}</span>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: "var(--ink-muted)" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span
                          className="tabular font-semibold"
                          style={{ color: qty < 0 ? "var(--danger)" : "var(--success)" }}
                        >
                          {qty > 0 ? "+" : ""}{qty}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Selo variant={MOTIVO_COR[m.motivo] ?? "off"}>{m.motivo}</Selo>
                      </td>
                    </tr>
                  );
                })}
                {(movs ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[13px]" style={{ color: "var(--ink-muted)" }}>
                      Nenhuma movimentacao registrada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={"px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] " + (align === "right" ? "text-right" : "text-left")}
      style={{ color: "var(--ink-tertiary)" }}
    >
      {children}
    </th>
  );
}
