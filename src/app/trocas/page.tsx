import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/page-header";
import { Selo } from "@/components/selo";

export const dynamic = "force-dynamic";

const DIA_MS = 24 * 60 * 60 * 1000;

function fmtData(d: Date) {
  return d.toLocaleDateString("pt-BR");
}

type Pendencia = {
  colaboradorNome: string;
  matricula: string | null;
  epiNome: string;
  complemento: string | null;
  entregueEm: Date;
  vidaUtil: number;
  prevista: Date;
  diasRestantes: number;
};

export default async function TrocasPage({
  searchParams,
}: {
  searchParams: Promise<{ vencidas?: string }>;
}) {
  const { vencidas } = await searchParams;
  const soVencidas = vencidas === "1";

  const supabase = await createClient();
  const { data: movs } = await supabase
    .schema("epi").from("movimentacoes")
    .select("criado_em,colaborador_id(id,nome,matricula),epi_id(id,nome,complemento,vida_util_dias)")
    .in("motivo", ["Entrega", "Substituicao"])
    .not("colaborador_id", "is", null)
    .order("criado_em", { ascending: false });

  // Ultima entrega ativa por colaborador+EPI; so itens com vida util definida
  const hoje = new Date();
  const vistos = new Set<string>();
  const pendencias: Pendencia[] = [];
  let semVidaUtil = 0;

  for (const m of movs ?? []) {
    const colab = m.colaborador_id as unknown as { id: string; nome: string; matricula: string | null } | null;
    const epi = m.epi_id as unknown as { id: string; nome: string; complemento: string | null; vida_util_dias: number | null } | null;
    if (!colab || !epi) continue;
    const chave = colab.id + ":" + epi.id;
    if (vistos.has(chave)) continue; // ja vimos a entrega mais recente (ordem desc)
    vistos.add(chave);
    if (!epi.vida_util_dias) { semVidaUtil++; continue; }

    const entregueEm = new Date(m.criado_em);
    const prevista = new Date(entregueEm.getTime() + epi.vida_util_dias * DIA_MS);
    pendencias.push({
      colaboradorNome: colab.nome,
      matricula: colab.matricula,
      epiNome: epi.nome,
      complemento: epi.complemento,
      entregueEm,
      vidaUtil: epi.vida_util_dias,
      prevista,
      diasRestantes: Math.ceil((prevista.getTime() - hoje.getTime()) / DIA_MS),
    });
  }

  pendencias.sort((a, b) => a.prevista.getTime() - b.prevista.getTime());

  const totalVencidas = pendencias.filter((p) => p.diasRestantes < 0).length;
  const visiveis = soVencidas ? pendencias.filter((p) => p.diasRestantes < 0) : pendencias;

  return (
    <main>
      <CabecalhoPagina
        titulo="Agenda de Trocas"
        subtitulo="Previsao de substituicao com base na vida util de cada EPI"
        contagem={visiveis.length}
        rotulo="itens em campo"
      />

      <div className="px-4 sm:px-8 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[12px]" style={{ color: totalVencidas > 0 ? "var(--danger)" : "var(--ink-muted)" }}>
            {totalVencidas > 0
              ? `${totalVencidas} EPI(s) em campo com vida util vencida.`
              : "Nenhuma troca vencida."}
            {semVidaUtil > 0 && (
              <span style={{ color: "var(--ink-muted)" }}>
                {" "}({semVidaUtil} entrega(s) de EPIs sem vida util definida — configure no Catalogo.)
              </span>
            )}
          </p>
          <a
            href={soVencidas ? "/trocas" : "/trocas?vencidas=1"}
            className="h-[30px] px-3 flex items-center rounded-md text-[12px] border transition-colors"
            style={{ borderColor: "var(--line)", color: "var(--ink-secondary)" }}
          >
            {soVencidas ? "Mostrar todas" : "Somente vencidas"}
          </a>
        </div>

        <section className="rounded-lg border overflow-x-auto" style={{ borderColor: "var(--line)" }}>
          <table className="w-full min-w-[720px] text-[13px] border-collapse">
            <thead>
              <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
                <Th>Colaborador</Th>
                <Th>EPI</Th>
                <Th>Entregue em</Th>
                <Th>Vida util</Th>
                <Th>Troca prevista</Th>
                <Th align="right">Situacao</Th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((p, i) => {
                const vencida = p.diasRestantes < 0;
                const proxima = !vencida && p.diasRestantes <= 15;
                return (
                  <tr key={i}
                    style={{
                      background: i % 2 === 0 ? "var(--surface-raised)" : "var(--surface)",
                      borderBottom: "1px solid var(--line-soft)",
                    }}>
                    <td className="px-4 py-3">
                      <span style={{ fontWeight: 500, color: "var(--ink)" }}>{p.colaboradorNome}</span>
                      {p.matricula && (
                        <span className="ml-1.5 tabular text-[11px]" style={{ color: "var(--ink-muted)" }}>
                          {p.matricula}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ color: "var(--ink-secondary)" }}>{p.epiNome}</span>
                      {p.complemento && (
                        <span className="ml-1 text-[11px]" style={{ color: "var(--ink-tertiary)" }}>
                          {p.complemento}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="tabular text-[12px]" style={{ color: "var(--ink-tertiary)" }}>
                        {fmtData(p.entregueEm)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="tabular text-[12px]" style={{ color: "var(--ink-tertiary)" }}>
                        {p.vidaUtil}d
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="tabular font-medium"
                        style={{ color: vencida ? "var(--danger)" : proxima ? "var(--accent)" : "var(--ink-secondary)" }}>
                        {fmtData(p.prevista)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Selo variant={vencida ? "alert" : proxima ? "alert" : "ok"}>
                        {vencida
                          ? `Vencida ha ${Math.abs(p.diasRestantes)}d`
                          : proxima
                          ? `Vence em ${p.diasRestantes}d`
                          : `${p.diasRestantes}d restantes`}
                      </Selo>
                    </td>
                  </tr>
                );
              })}
              {visiveis.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[13px]" style={{ color: "var(--ink-muted)" }}>
                    {soVencidas
                      ? "Nenhuma troca vencida."
                      : "Nenhuma entrega de EPI com vida util definida ainda."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
