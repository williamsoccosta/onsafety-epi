import { createClient } from "@/lib/supabase/server";
import { criarObra, alternarAtiva } from "./actions";
import { Selo, SeloBotao } from "@/components/selo";
import { CabecalhoPagina } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function ObrasPage() {
  const supabase = await createClient();
  const { data: obras, error } = await supabase
    .schema("obras")
    .from("obras")
    .select("*")
    .order("nome");

  async function action(formData: FormData) {
    "use server";
    await criarObra(formData);
  }

  const ativas = obras?.filter((o) => o.ativa).length ?? 0;

  return (
    <main>
      <CabecalhoPagina
        titulo="Obras"
        subtitulo="Canteiros ativos da empresa -- cada um com estoque proprio de EPI"
        contagem={obras?.length ?? 0}
        rotulo="cadastradas"
      />

      <div className="px-8 py-6 space-y-6">
        <section
          className="rounded-lg border p-5"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--ink-tertiary)" }}>
            Nova obra
          </p>
          <form action={action} className="grid grid-cols-4 gap-3">
            <Campo label="Nome da obra" name="nome" placeholder="Ex: SE Formoso" className="col-span-2" />
            <Campo label="Cliente" name="cliente" placeholder="Ex: CHESF" className="col-span-1" />
            <div className="col-span-1 flex items-end">
              <button
                type="submit"
                className="h-[38px] w-full px-5 rounded-md text-[13px] font-semibold transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                Cadastrar obra
              </button>
            </div>
          </form>
        </section>

        {error && (
          <p className="text-[13px]" style={{ color: "var(--danger)" }}>
            Erro ao carregar obras: {error.message}
          </p>
        )}

        <section className="grid grid-cols-2 gap-3">
          {obras?.map((o) => (
            <article
              key={o.id}
              className="rounded-lg border p-4 flex items-start justify-between gap-3"
              style={{ borderColor: "var(--line)", background: "var(--surface)" }}
            >
              <div className="min-w-0">
                <p className="text-[14px] font-semibold leading-snug truncate" style={{ color: "var(--ink)" }}>
                  {o.nome}
                </p>
                <p className="mt-1 text-[12px]" style={{ color: "var(--ink-tertiary)" }}>
                  {o.cliente ? <>Cliente <span style={{ color: "var(--ink-secondary)" }}>{o.cliente}</span></> : "Sem cliente vinculado"}
                </p>
              </div>
              <SeloBotao
                variant={o.ativa ? "ok" : "off"}
                action={async () => { "use server"; await alternarAtiva(o.id, o.ativa); }}
              >
                {o.ativa ? "Ativa" : "Inativa"}
              </SeloBotao>
            </article>
          ))}
          {obras?.length === 0 && (
            <p className="col-span-2 px-4 py-10 text-center text-[13px] rounded-lg border" style={{ color: "var(--ink-muted)", borderColor: "var(--line)" }}>
              Nenhuma obra cadastrada ainda.
            </p>
          )}
        </section>

        <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
          {ativas} de {obras?.length ?? 0} obras ativas no momento.
        </p>
      </div>
    </main>
  );
}

function Campo({
  label,
  name,
  placeholder,
  className = "",
}: {
  label: string;
  name: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--ink-tertiary)" }}>
        {label}
      </span>
      <input
        name={name}
        placeholder={placeholder}
        required={name === "nome"}
        className="h-[38px] rounded-md border px-3 text-[13px] outline-none transition-colors"
        style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}
      />
    </label>
  );
}
