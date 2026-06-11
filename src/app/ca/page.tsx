import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/page-header";
import { Selo } from "@/components/selo";
import { FiltroColuna } from "@/components/filtro-coluna";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type FichaTecnica = {
  ca: number;
  nome_equipamento: string | null;
  data_validade: string | null;
  situacao: string | null;
  natureza: string | null;
  cnpj_fabricante: string | null;
  nrprocesso: string | null;
};

function formatarData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

function formatarCNPJ(cnpj: string) {
  const n = cnpj.replace(/\D/g, "").padStart(14, "0");
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`;
}

export default async function ConsultaCAPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    equipamento?: string;
    natureza?: string;
    cnpj?: string;
    situacao?: string;
    validade?: string;
  }>;
}) {
  const { q, equipamento, natureza, cnpj, situacao, validade } = await searchParams;

  const supabase = await createClient();

  let query = supabase
    .schema("catalogo")
    .from("fichas_tecnicas")
    .select(
      "ca,nome_equipamento,data_validade,situacao,natureza,cnpj_fabricante,nrprocesso",
      { count: "exact" }
    );

  if (q && q.trim()) {
    const termo = parseInt(q.trim().replace(/\D/g, ""), 10);
    if (!isNaN(termo)) query = query.eq("ca", termo);
  }

  if (equipamento?.trim()) query = query.ilike("nome_equipamento", `%${equipamento.trim()}%`);
  if (natureza?.trim())    query = query.eq("natureza", natureza.trim());
  if (cnpj?.trim())        query = query.ilike("cnpj_fabricante", `%${cnpj.trim()}%`);
  if (situacao?.trim())    query = query.eq("situacao", situacao.trim());
  if (validade?.trim()) {
    query = query
      .gte("data_validade", `${validade.trim()}-01-01`)
      .lte("data_validade", `${validade.trim()}-12-31`);
  }

  const [{ data, error, count }, { data: naturezaData }, { data: validadeData }] = await Promise.all([
    query.order("ca").limit(50),
    supabase
      .schema("catalogo")
      .from("fichas_tecnicas")
      .select("natureza")
      .not("natureza", "is", null)
      .order("natureza"),
    supabase
      .schema("catalogo")
      .from("fichas_tecnicas")
      .select("data_validade")
      .not("data_validade", "is", null),
  ]);

  const fichas: FichaTecnica[] = (data as FichaTecnica[]) ?? [];
  const total = count ?? 0;
  const erro = error?.message ?? null;

  const naturezaOpcoes = [
    ...new Set(
      (naturezaData ?? []).map((r) => (r as { natureza: string }).natureza).filter(Boolean)
    ),
  ];

  const validadeOpcoes = [
    ...new Set(
      (validadeData ?? [])
        .map((r) => (r as { data_validade: string }).data_validade?.substring(0, 4))
        .filter(Boolean)
    ),
  ].sort() as string[];

  const temFiltroAtivo = (q && q.trim()) || equipamento || natureza || cnpj || situacao || validade;

  return (
    <main>
      <CabecalhoPagina
        titulo="Consulta de CA"
        subtitulo="Certificados de Aprovação disponíveis no catálogo da empresa"
        contagem={total}
        rotulo="certificados"
      />

      <div className="px-4 sm:px-8 py-6 space-y-6">
        <form method="GET" className="flex gap-3 items-center flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold tabular"
              style={{ color: "var(--ink-muted)" }}
            >
              CA
            </span>
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Digite o número do CA (ex: 365)"
              className="w-full h-[38px] rounded-md border pl-10 pr-3 text-[13px] tabular outline-none transition-colors"
              style={{
                background: "var(--control-bg)",
                borderColor: "var(--control-border)",
                color: "var(--ink)",
              }}
            />
          </div>

          <button
            type="submit"
            className="h-[38px] px-5 rounded-md text-[13px] font-semibold transition-opacity hover:opacity-90 shrink-0"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Buscar
          </button>
          {temFiltroAtivo && (
            <a
              href="/ca"
              className="h-[38px] px-4 flex items-center rounded-md text-[13px] border transition-colors"
              style={{ borderColor: "var(--line)", color: "var(--ink-secondary)" }}
            >
              Limpar
            </a>
          )}
        </form>

        {erro && (
          <p className="text-[13px]" style={{ color: "var(--danger)" }}>
            Erro: {erro}
          </p>
        )}

        <section className="rounded-lg border" style={{ borderColor: "var(--line)" }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-[13px] border-collapse" style={{ borderRadius: 8 }}>
            <thead>
              <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)", overflow: "visible" }}>
                <Th>CA</Th>
                <Suspense fallback={<Th>Equipamento</Th>}>
                  <FiltroColuna
                    rotulo="Equipamento"
                    parametro="equipamento"
                    modo="texto"
                    placeholder="ex: capacete"
                  />
                </Suspense>
                <Suspense fallback={<Th>Validade</Th>}>
                  <FiltroColuna
                    rotulo="Validade"
                    parametro="validade"
                    modo="opcoes"
                    opcoes={validadeOpcoes}
                    placeholder="ex: 2027"
                  />
                </Suspense>
                <Suspense fallback={<Th>Natureza</Th>}>
                  <FiltroColuna
                    rotulo="Natureza"
                    parametro="natureza"
                    modo="opcoes"
                    opcoes={naturezaOpcoes}
                  />
                </Suspense>
                <Suspense fallback={<Th>CNPJ Fabricante</Th>}>
                  <FiltroColuna
                    rotulo="CNPJ Fabricante"
                    parametro="cnpj"
                    modo="texto"
                    placeholder="ex: 12.345"
                  />
                </Suspense>
                <Suspense fallback={<Th align="right">Situação</Th>}>
                  <FiltroColuna
                    rotulo="Situação"
                    parametro="situacao"
                    modo="opcoes"
                    opcoes={["VALIDO", "VENCIDO"]}
                    align="right"
                  />
                </Suspense>
              </tr>
            </thead>
            <tbody>
              {fichas.map((f, i) => {
                const vencido = f.situacao === "VENCIDO";
                return (
                  <tr
                    key={f.ca}
                    style={{
                      background: i % 2 === 0 ? "var(--surface-raised)" : "var(--surface)",
                      borderBottom: "1px solid var(--line-soft)",
                    }}
                  >
                    <Td>
                      <span className="tabular font-semibold" style={{ color: "var(--accent)" }}>
                        {String(f.ca).padStart(5, "0")}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ color: "var(--ink)", fontWeight: 500 }}>
                        {f.nome_equipamento ?? "—"}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className="tabular"
                        style={{ color: vencido ? "var(--danger)" : "var(--ink-secondary)" }}
                      >
                        {f.data_validade ? formatarData(f.data_validade) : "—"}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ color: "var(--ink-tertiary)" }}>{f.natureza ?? "—"}</span>
                    </Td>
                    <Td>
                      <span
                        className="tabular"
                        style={{ color: "var(--ink-muted)", fontSize: "11px" }}
                      >
                        {f.cnpj_fabricante ? formatarCNPJ(f.cnpj_fabricante) : "—"}
                      </span>
                    </Td>
                    <Td align="right">
                      <Selo variant={vencido ? "alert" : "ok"}>{f.situacao ?? "—"}</Selo>
                    </Td>
                  </tr>
                );
              })}
              {fichas.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-[13px]"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    {temFiltroAtivo
                      ? "Nenhum CA encontrado para os filtros aplicados."
                      : "Nenhum certificado disponível."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </section>

        {fichas.length === 50 && (
          <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
            Exibindo 50 primeiros resultados. Refine a busca pelo número do CA.
          </p>
        )}
      </div>
    </main>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={
        "px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] " +
        (align === "right" ? "text-right" : "text-left")
      }
      style={{ color: "var(--ink-tertiary)" }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td className={"px-4 py-3 " + (align === "right" ? "text-right" : "text-left")}>
      {children}
    </td>
  );
}
