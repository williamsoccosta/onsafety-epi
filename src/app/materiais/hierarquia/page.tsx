import { createClient } from "@/lib/supabase/server";
import { requirePerfil } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/page-header";
import { cadastrarItemHierarquia, toggleAtivoHierarquia, toggleValidadoHierarquia } from "../actions";

export const dynamic = "force-dynamic";

export default async function HierarquiaPage() {
  await requirePerfil("supervisor");
  const supabase = await createClient();

  const [
    { data: segmentos },
    { data: categorias },
    { data: tipos },
  ] = await Promise.all([
    supabase.schema("catalogo").from("segmentos").select("id,codigo,nome,slug,validado,ativo").order("codigo"),
    supabase.schema("catalogo").from("categorias").select("id,codigo,nome,slug,segmento_id,validado,ativo").order("codigo"),
    supabase.schema("catalogo").from("tipos").select("id,codigo,nome,categoria_id,validado,ativo").order("codigo"),
  ]);

  async function criarAction(formData: FormData) {
    "use server";
    await cadastrarItemHierarquia(formData);
  }

  return (
    <main>
      <CabecalhoPagina
        titulo="Hierarquia de materiais"
        subtitulo="Gerencie segmentos, categorias e tipos do catalogo"
      />
      <div className="px-4 sm:px-8 py-6 space-y-6 max-w-4xl">
        {(segmentos ?? []).map((seg) => {
          const cats = (categorias ?? []).filter((c) => c.segmento_id === seg.id);
          return (
            <section key={seg.id} className="rounded-lg border" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
                <div className="flex items-center gap-3">
                  <span className="tabular text-[11px] font-semibold px-2 py-0.5 rounded"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                    {seg.codigo}
                  </span>
                  <span className="text-[14px] font-semibold" style={{ color: "var(--ink)" }}>{seg.nome}</span>
                  <StatusBadge validado={seg.validado} ativo={seg.ativo} />
                </div>
                <div className="flex items-center gap-2">
                  <ToggleBtn label={seg.ativo ? "Desativar" : "Ativar"}
                    action={async () => { "use server"; await toggleAtivoHierarquia("segmentos", seg.id, seg.ativo); }} />
                  <ToggleBtn label={seg.validado ? "Invalidar" : "Validar"}
                    action={async () => { "use server"; await toggleValidadoHierarquia("segmentos", seg.id, seg.validado); }} />
                </div>
              </div>

              <div className="px-5 py-3 space-y-2" style={{ background: "var(--surface-raised)" }}>
                {cats.map((cat) => {
                  const tps = (tipos ?? []).filter((t) => t.categoria_id === cat.id);
                  return (
                    <div key={cat.id} className="rounded-md border px-4 py-3" style={{ borderColor: "var(--line-soft)", background: "var(--surface)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="tabular text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: "var(--surface-2)", color: "var(--ink-tertiary)" }}>
                            {cat.codigo}
                          </span>
                          <span className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>{cat.nome}</span>
                          <StatusBadge validado={cat.validado} ativo={cat.ativo} />
                        </div>
                        <div className="flex items-center gap-1">
                          <ToggleBtn label={cat.ativo ? "Desativar" : "Ativar"} small
                            action={async () => { "use server"; await toggleAtivoHierarquia("categorias", cat.id, cat.ativo); }} />
                        </div>
                      </div>
                      {tps.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 ml-6">
                          {tps.map((t) => (
                            <span key={t.id} className="text-[11px] px-2 py-1 rounded-md border"
                              style={{
                                borderColor: t.ativo ? "var(--line)" : "var(--line-soft)",
                                color: t.ativo ? "var(--ink-secondary)" : "var(--ink-muted)",
                                background: t.ativo ? "var(--surface)" : "var(--surface-2)",
                                textDecoration: t.ativo ? "none" : "line-through",
                              }}>
                              <span className="tabular font-medium" style={{ color: "var(--ink-tertiary)" }}>{t.codigo}</span> {t.nome}
                            </span>
                          ))}
                        </div>
                      )}
                      {tps.length === 0 && (
                        <p className="text-[11px] ml-6" style={{ color: "var(--ink-muted)" }}>Nenhum tipo cadastrado.</p>
                      )}
                    </div>
                  );
                })}

                {cats.length === 0 && (
                  <p className="text-[12px] py-2" style={{ color: "var(--ink-muted)" }}>Nenhuma categoria neste segmento.</p>
                )}
              </div>

              <div className="px-5 py-3 border-t flex gap-2" style={{ borderColor: "var(--line-soft)" }}>
                <InlineForm nivel="categorias" parentId={seg.id} placeholder="Nova categoria" action={criarAction} />
                {cats.length > 0 && (
                  <InlineForm nivel="tipos" parentId={cats[0]?.id} placeholder="Novo tipo" action={criarAction}
                    selectOptions={cats.map((c) => ({ value: c.id, label: c.nome }))} />
                )}
              </div>
            </section>
          );
        })}

        <section className="rounded-lg border p-5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: "var(--ink-tertiary)" }}>
            Novo segmento
          </p>
          <InlineForm nivel="segmentos" placeholder="Nome do segmento" action={criarAction} />
        </section>

        <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
          {segmentos?.length ?? 0} segmentos · {categorias?.length ?? 0} categorias · {tipos?.length ?? 0} tipos
        </p>
      </div>
    </main>
  );
}

function StatusBadge({ validado, ativo }: { validado: boolean; ativo: boolean }) {
  if (!ativo) return (
    <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded"
      style={{ background: "var(--surface-2)", color: "var(--ink-muted)" }}>Inativo</span>
  );
  if (validado) return (
    <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded"
      style={{ background: "var(--success-soft)", color: "var(--success)" }}>Validado</span>
  );
  return null;
}

function ToggleBtn({ label, action, small }: { label: string; action: () => Promise<void>; small?: boolean }) {
  return (
    <form action={action}>
      <button type="submit"
        className={`rounded border font-medium transition-colors ${small ? "h-6 px-2 text-[10px]" : "h-7 px-3 text-[11px]"}`}
        style={{ borderColor: "var(--line)", color: "var(--ink-secondary)" }}>
        {label}
      </button>
    </form>
  );
}

function InlineForm({ nivel, parentId, placeholder, action, selectOptions }: {
  nivel: string; parentId?: string; placeholder: string;
  action: (fd: FormData) => void | Promise<void>;
  selectOptions?: { value: string; label: string }[];
}) {
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="nivel" value={nivel} />
      {selectOptions ? (
        <select name="parent_id"
          className="h-8 rounded-md border px-2 text-[12px] outline-none"
          style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}>
          {selectOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type="hidden" name="parent_id" value={parentId ?? ""} />
      )}
      <input name="nome" placeholder={placeholder} required
        className="h-8 flex-1 rounded-md border px-3 text-[12px] outline-none"
        style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }} />
      <button type="submit"
        className="h-8 px-3 rounded-md text-[11px] font-semibold border transition-colors"
        style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
        Criar
      </button>
    </form>
  );
}
