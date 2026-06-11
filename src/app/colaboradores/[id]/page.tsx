import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Selo } from "@/components/selo";
import { BotaoImprimir } from "./print-btn";
import { ColunaAssinatura } from "./entrega-row";

export const dynamic = "force-dynamic";

function fmt(iso: string) {
  const [ano, mes, dia] = iso.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
}
function fmtHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function FichaColaborador({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: colab } = await supabase
    .schema("epi").from("colaboradores")
    .select("*").eq("id", id).single();

  if (!colab) notFound();

  // obra_id e cross-schema (obras.obras) — PostgREST nao resolve embedded join.
  // Buscar separado e montar mapa.
  const [
    { data: entregas },
    { data: obrasData },
    { data: perfisData },
  ] = await Promise.all([
    supabase
      .schema("epi").from("movimentacoes")
      .select("id,criado_em,quantidade,observacao,assinatura_url,obra_id,motivo,criado_por,epi_id(nome,complemento,ca,ca_validade)")
      .eq("colaborador_id", id)
      .in("motivo", ["Entrega", "Substituicao"])
      .order("criado_em", { ascending: false }),
    supabase
      .schema("obras").from("obras")
      .select("id,nome"),
    supabase.from("perfis").select("id,nome"),
  ]);

  const obraMap: Record<string, string> = Object.fromEntries(
    (obrasData ?? []).map((o) => [o.id, o.nome])
  );
  const autorMap: Record<string, string> = Object.fromEntries(
    (perfisData ?? []).map((p) => [p.id, p.nome ?? "—"])
  );

  const totalItens = (entregas ?? []).reduce((s, e) => s + Math.abs(e.quantidade as number), 0);

  return (
    <>
      <div className="flex items-center justify-between px-8 py-4 border-b print:hidden"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <a href="/colaboradores" className="flex items-center gap-1.5 text-[13px]"
          style={{ color: "var(--ink-secondary)" }}>
          &#8592; Colaboradores
        </a>
        <div className="flex items-center gap-2">
          <a href={`/colaboradores/${id}/pdf`}
            className="h-9 px-4 flex items-center rounded-md text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
            Baixar PDF
          </a>
          <BotaoImprimir />
        </div>
      </div>

      <main className="px-8 py-8 max-w-5xl mx-auto print:px-0 print:py-0 print:max-w-none">
        <header className="mb-8 print:mb-6">
          <div className="rounded-lg border p-6 print:rounded-none print:border-0 print:border-b print:pb-6"
            style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1"
                  style={{ color: "var(--accent)" }}>
                  Ficha de EPI · FAAB Engenharia Ltda
                </p>
                <h1 className="text-[24px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
                  {colab.nome}
                </h1>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                  <Campo rotulo="Funcao" valor={colab.funcao} />
                  <Campo rotulo="Matricula" valor={colab.matricula ?? "—"} mono />
                  <Campo rotulo="Admissao" valor={fmt(colab.data_admissao)} mono />
                  <Campo rotulo="Situacao" valor={colab.ativo ? "Ativo" : "Inativo"}
                    destaque={colab.ativo ? "ok" : "off"} />
                </div>
              </div>
              <div className="shrink-0 rounded-md border px-4 py-3 text-center"
                style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
                <p className="text-[22px] font-semibold tabular leading-none" style={{ color: "var(--ink)" }}>
                  {String(totalItens).padStart(2, "0")}
                </p>
                <p className="text-[10px] uppercase tracking-[0.1em] mt-1" style={{ color: "var(--ink-tertiary)" }}>
                  itens entregues
                </p>
              </div>
            </div>
          </div>
        </header>

        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "var(--ink-tertiary)" }}>
            Registro de entregas
          </p>
          <div className="rounded-lg border overflow-hidden print:rounded-none" style={{ borderColor: "var(--line)" }}>
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
                  <Th>Data / Hora</Th>
                  <Th>Equipamento</Th>
                  <Th>CA</Th>
                  <Th>Obra</Th>
                  <Th align="center">Qtd</Th>
                  <Th>Observacao</Th>
                  <Th align="center">Assinatura</Th>
                </tr>
              </thead>
              <tbody>
                {(entregas ?? []).map((e, i) => {
                  const epi = e.epi_id as unknown as {
                    nome: string; complemento: string | null;
                    ca: string | null; ca_validade: string | null;
                  };
                  const obraNome = obraMap[e.obra_id as string] ?? "—";
                  const vencido = epi?.ca_validade ? new Date(epi.ca_validade) < new Date() : false;
                  return (
                    <tr key={e.id}
                      style={{
                        background: i % 2 === 0 ? "var(--surface-raised)" : "var(--surface)",
                        borderBottom: "1px solid var(--line-soft)",
                      }}>
                      <td className="px-4 py-3">
                        <span className="tabular text-[12px]" style={{ color: "var(--ink-tertiary)" }}>
                          {fmtHora(e.criado_em)}
                        </span>
                        <span className="block text-[11px]" style={{ color: "var(--ink-muted)" }}>
                          por {e.criado_por ? (autorMap[e.criado_por as string] ?? "—") : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ fontWeight: 600, color: "var(--ink)" }}>{epi?.nome ?? "—"}</span>
                        {e.motivo === "Substituicao" && (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                            style={{ background: "var(--surface-2)", color: "var(--ink-tertiary)" }}>
                            Substituicao
                          </span>
                        )}
                        {epi?.complemento && (
                          <span className="block text-[11px]" style={{ color: "var(--ink-tertiary)" }}>
                            {epi.complemento}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {epi?.ca ? (
                          <div className="flex items-center gap-1.5">
                            <span className="tabular font-semibold text-[12px]" style={{ color: "var(--accent)" }}>
                              {String(epi.ca).padStart(5, "0")}
                            </span>
                            {vencido ? (
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-label="Vencido"
                                style={{ color: "var(--danger, #dc2626)", flexShrink: 0 }}>
                                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-label="Valido"
                                style={{ color: "var(--success, #16a34a)", flexShrink: 0 }}>
                                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M5 8.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "var(--ink-muted)" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ color: "var(--ink-secondary)" }}>{obraNome}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="tabular font-semibold" style={{ color: "var(--ink)" }}>
                          {Math.abs(e.quantidade as number)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ color: "var(--ink-tertiary)" }}>{e.observacao ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ColunaAssinatura
                          movimentacaoId={e.id}
                          colaboradorId={id}
                          assinaturaUrl={e.assinatura_url ?? null}
                        />
                      </td>
                    </tr>
                  );
                })}
                {(entregas ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[13px]"
                      style={{ color: "var(--ink-muted)" }}>
                      Nenhuma entrega registrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="mt-10 pt-6 border-t space-y-3" style={{ borderColor: "var(--line)" }}>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--ink-tertiary)" }}>
            Declaro ter recebido os Equipamentos de Protecao Individual (EPIs) listados acima em perfeito estado de conservacao,
            comprometendo-me a utiliza-los sempre que necessario, conserva-los adequadamente e devolver quando solicitado,
            conforme determina a NR-06, item 6.6.1, alinea h) da Portaria MTb n 3.214/78 e suas alteracoes.
          </p>
          <p className="text-[10px] pt-2" style={{ color: "var(--ink-muted)" }}>
            Documento gerado em {new Date().toLocaleString("pt-BR")} · Onsafety EPI / FAAB Engenharia Ltda
          </p>
        </footer>
      </main>
    </>
  );
}

function Campo({ rotulo, valor, mono = false, destaque }: {
  rotulo: string; valor: string; mono?: boolean; destaque?: "ok" | "off";
}) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--ink-muted)" }}>{rotulo} </span>
      <span className={"text-[13px] font-medium " + (mono ? "tabular" : "")}
        style={{
          color: destaque === "ok" ? "var(--success)"
               : destaque === "off" ? "var(--ink-tertiary)"
               : "var(--ink-secondary)",
        }}>
        {valor}
      </span>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  return (
    <th className={"px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] " + (align === "center" ? "text-center" : "text-left")}
      style={{ color: "var(--ink-tertiary)" }}>
      {children}
    </th>
  );
}
