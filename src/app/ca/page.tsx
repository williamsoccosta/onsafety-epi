import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/page-header";
import { Selo } from "@/components/selo";

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
  return `${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5,8)}/${n.slice(8,12)}-${n.slice(12)}`;
}

export default async function ConsultaCAPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let fichas: FichaTecnica[] = [];
  let total = 0;
  let erro: string | null = null;

  if (q && q.trim()) {
    const termo = q.trim().replace(/\D/g, "");
    const { data, error, count } = await supabase
      .schema("catalogo")
      .from("fichas_tecnicas")
      .select("ca,nome_equipamento,data_validade,situacao,natureza,cnpj_fabricante,nrprocesso", { count: "exact" })
      .ilike("ca::text", `%${termo}%`)
      .order("ca")
      .limit(50);

    if (error) erro = error.message;
    fichas = (data as FichaTecnica[]) ?? [];
    total = count ?? 0;
  } else {
    const { data, error, count } = await supabase
      .schema("catalogo")
      .from("fichas_tecnicas")
      .select("ca,nome_equipamento,data_validade,situacao,natureza,cnpj_fabricante,nrprocesso", { count: "exact" })
      .order("ca")
      .limit(50);

    if (error) erro = error.message;
    fichas = (data as FichaTecnica[]) ?? [];
    total = count ?? 0;
  }

  const vencidos = fichas.filter((f) => f.situacao === "VENCIDO").length;

  return (
    <main>
      <CabecalhoPagina
        titulo="Consulta de CA"
        subtitulo="Certificados de Aprovacao disponíveis no catálogo da empresa"
        contagem={total}
        rotulo="certificados"
      />

      <div className="px-8 py-6 space-y-6">
        <form method="GET" className="flex gap-3">
          <div className="flex-1 relative">
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
          {q && (
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

        {vencidos > 0 && (
          <div
            className="flex items-center gap-2 rounded-md border px-4 py-3 text-[13px]"
            style={{ borderColor: "rgba(163,50,31,0.3)", background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            <span className="font-semibold">{vencidos} CA{vencidos > 1 ? "s" : ""} vencido{vencidos > 1 ? "s" : ""}</span>
            <span style={{ color: "var(--danger)" }}>nos resultados exibidos.</span>
          </div>
        )}

        <section className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--line)" }}>
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
                <Th>CA</Th>
                <Th>Equipamento</Th>
                <Th>Validade</Th>
                <Th>Natureza</Th>
                <Th>CNPJ Fabricante</Th>
                <Th align="right">Situacao</Th>
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
                      <span className="tabular" style={{ color: vencido ? "var(--danger)" : "var(--ink-secondary)" }}>
                        {f.data_validade ? formatarData(f.data_validade) : "—"}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ color: "var(--ink-tertiary)" }}>{f.natureza ?? "—"}</span>
                    </Td>
                    <Td>
                      <span className="tabular" style={{ color: "var(--ink-muted)", fontSize: "11px" }}>
                        {f.cnpj_fabricante ? formatarCNPJ(f.cnpj_fabricante) : "—"}
                      </span>
                    </Td>
                    <Td align="right">
                      <Selo variant={vencido ? "alert" : "ok"}>
                        {f.situacao ?? "—"}
                      </Selo>
                    </Td>
                  </tr>
                );
              })}
              {fichas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[13px]" style={{ color: "var(--ink-muted)" }}>
                    {q ? `Nenhum CA encontrado para "${q}".` : "Nenhum certificado disponível."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td className={"px-4 py-3 " + (align === "right" ? "text-right" : "text-left")}>{children}</td>;
}
