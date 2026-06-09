import { createClient } from "@/lib/supabase/server";
import { alternarAtivoEPI } from "./actions";
import { Selo, SeloBotao } from "@/components/selo";
import { CabecalhoPagina } from "@/components/page-header";
import { NovoEPIForm } from "./novo-form";

export const dynamic = "force-dynamic";

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function caVencido(validade: string | null) {
  if (!validade) return false;
  return new Date(validade) < new Date();
}

export default async function EPIsPage() {
  const supabase = await createClient();
  const { data: itens, error } = await supabase
    .schema("epi")
    .from("itens")
    .select("*")
    .order("nome");

  const ativos = itens?.filter((i) => i.ativo).length ?? 0;

  return (
    <main>
      <CabecalhoPagina
        titulo="Catalogo de EPI"
        subtitulo="Equipamentos de protecao individual cadastrados para uso nas obras"
        contagem={itens?.length ?? 0}
        rotulo="itens"
      />

      <div className="px-8 py-6 space-y-6">
        <NovoEPIForm />

        {error && (
          <p className="text-[13px]" style={{ color: "var(--danger)" }}>
            Erro ao carregar: {error.message}
          </p>
        )}

        <section className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--line)" }}>
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
                <Th>Equipamento</Th>
                <Th>Complemento</Th>
                <Th>CA</Th>
                <Th>Validade CA</Th>
                <Th>Vida util</Th>
                <Th>Lim./entrega</Th>
                <Th align="right">Status</Th>
              </tr>
            </thead>
            <tbody>
              {itens?.map((item, i) => {
                const vencido = caVencido(item.ca_validade);
                return (
                  <tr
                    key={item.id}
                    style={{
                      background: i % 2 === 0 ? "var(--surface-raised)" : "var(--surface)",
                      borderBottom: "1px solid var(--line-soft)",
                    }}
                  >
                    <Td>
                      <span style={{ fontWeight: 600, color: "var(--ink)" }}>{item.nome}</span>
                    </Td>
                    <Td>
                      <span style={{ color: "var(--ink-secondary)" }}>{item.complemento ?? "—"}</span>
                    </Td>
                    <Td>
                      {item.ca ? (
                        <span className="tabular font-semibold" style={{ color: "var(--accent)" }}>
                          {String(item.ca).padStart(5, "0")}
                        </span>
                      ) : (
                        <span style={{ color: "var(--ink-muted)" }}>—</span>
                      )}
                    </Td>
                    <Td>
                      {item.ca_validade ? (
                        <span className="tabular" style={{ color: vencido ? "var(--danger)" : "var(--ink-secondary)" }}>
                          {formatarData(item.ca_validade)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--ink-muted)" }}>—</span>
                      )}
                    </Td>
                    <Td>
                      <span className="tabular" style={{ color: "var(--ink-tertiary)" }}>
                        {item.vida_util_dias ? `${item.vida_util_dias}d` : "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className="tabular" style={{ color: "var(--ink-tertiary)" }}>
                        {item.limite_por_entrega ?? "—"}
                      </span>
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-2">
                        {item.ca && (
                          <Selo variant={vencido ? "alert" : "ok"}>
                            {vencido ? "CA Vencido" : "CA Valido"}
                          </Selo>
                        )}
                        <SeloBotao
                          variant={item.ativo ? "ok" : "off"}
                          action={async () => { "use server"; await alternarAtivoEPI(item.id, item.ativo); }}
                        >
                          {item.ativo ? "Ativo" : "Inativo"}
                        </SeloBotao>
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {itens?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px]" style={{ color: "var(--ink-muted)" }}>
                    Nenhum EPI cadastrado. Use o formulario acima para comecar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
          {ativos} de {itens?.length ?? 0} itens ativos. Digite o numero do CA no formulario para auto-preencher dados do certificado.
        </p>
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
