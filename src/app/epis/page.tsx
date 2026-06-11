import { createClient } from "@/lib/supabase/server";
import { alternarAtivoEPI, atualizarParametrosEPI } from "./actions";
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

      <div className="px-4 sm:px-8 py-6 space-y-6">
        <NovoEPIForm />

        {error && (
          <p className="text-[13px]" style={{ color: "var(--danger)" }}>
            Erro ao carregar: {error.message}
          </p>
        )}

        <section className="rounded-lg border overflow-x-auto" style={{ borderColor: "var(--line)" }}>
          <table className="w-full min-w-[760px] text-[13px] border-collapse">
            <thead>
              <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
                <Th>Equipamento</Th>
                <Th>CA</Th>
                <Th>Validade CA</Th>
                <Th>Vida util (d)</Th>
                <Th>Lim./entrega</Th>
                <Th>Est. minimo</Th>
                <Th align="right">Status</Th>
              </tr>
            </thead>
            <tbody>
              {itens?.map((item, i) => {
                const vencido = caVencido(item.ca_validade);
                const fid = "params-" + item.id;
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
                      {item.complemento && (
                        <span className="block text-[11px]" style={{ color: "var(--ink-tertiary)" }}>
                          {item.complemento}
                        </span>
                      )}
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
                      <CampoNum form={fid} name="vida_util_dias" defaultValue={item.vida_util_dias} />
                    </Td>
                    <Td>
                      <CampoNum form={fid} name="limite_por_entrega" defaultValue={item.limite_por_entrega} />
                    </Td>
                    <Td>
                      <CampoNum form={fid} name="estoque_minimo" defaultValue={item.estoque_minimo} />
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-2">
                        <form
                          id={fid}
                          action={async (formData: FormData) => {
                            "use server";
                            await atualizarParametrosEPI(item.id, formData);
                          }}
                        >
                          <button
                            type="submit"
                            className="h-6 px-2 rounded text-[11px] font-medium border transition-colors"
                            style={{ borderColor: "var(--line)", color: "var(--ink-secondary)" }}
                            title="Salvar parametros"
                          >
                            Salvar
                          </button>
                        </form>
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
          {ativos} de {itens?.length ?? 0} itens ativos. Vida util define a previsao de troca na
          Agenda de Trocas; estoque minimo alimenta o alerta do painel.
        </p>
      </div>
    </main>
  );
}

function CampoNum({ form, name, defaultValue }: {
  form: string; name: string; defaultValue: number | null;
}) {
  return (
    <input
      type="number"
      min={1}
      name={name}
      form={form}
      defaultValue={defaultValue ?? ""}
      placeholder="—"
      className="w-16 h-7 rounded border px-2 text-[12px] tabular outline-none"
      style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}
    />
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
