import { createClient } from "@/lib/supabase/server";
import { criarObra, alternarAtiva } from "./actions";
import { SeloBotao } from "@/components/selo";
import { CabecalhoPagina } from "@/components/page-header";

export const dynamic = "force-dynamic";

type Obra = { id: string; nome: string; cliente: string | null; ativa: boolean };

type Grupo = {
  cliente: string | null;
  obras: Obra[];
  total: number;
  ativas: number;
};

export default async function ObrasPage({
  searchParams,
}: {
  searchParams: Promise<{ inativas?: string }>;
}) {
  const { inativas } = await searchParams;
  const mostrarInativas = inativas === "1";

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

  const todasObras: Obra[] = obras ?? [];

  // Agrupar por cliente (stats sempre sobre todas as obras)
  const grupoMap = new Map<string, Grupo>();
  for (const o of todasObras) {
    const chave = o.cliente ?? "__sem_cliente__";
    if (!grupoMap.has(chave)) {
      grupoMap.set(chave, { cliente: o.cliente, obras: [], total: 0, ativas: 0 });
    }
    const g = grupoMap.get(chave)!;
    g.obras.push(o);
    g.total++;
    if (o.ativa) g.ativas++;
  }

  const grupos = [...grupoMap.entries()]
    .sort(([a], [b]) => {
      if (a === "__sem_cliente__") return 1;
      if (b === "__sem_cliente__") return -1;
      return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
    })
    .map(([, g]) => g);

  const clientesExistentes = [
    ...new Set(todasObras.filter((o) => o.cliente).map((o) => o.cliente as string)),
  ].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

  const totalAtivas = todasObras.filter((o) => o.ativa).length;

  return (
    <main>
      <CabecalhoPagina
        titulo="Obras"
        subtitulo="Canteiros ativos da empresa — cada um com estoque próprio de EPI"
        contagem={todasObras.length}
        rotulo="cadastradas"
      />

      <div className="px-4 sm:px-8 py-6 space-y-6">
        <section
          className="rounded-lg border p-5"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <p
            className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            Nova obra
          </p>
          <datalist id="clientes-list">
            {clientesExistentes.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <form action={action} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Campo
              label="Nome da obra"
              name="nome"
              placeholder="Ex: SE Formoso"
              className="col-span-2"
            />
            <Campo
              label="Cliente"
              name="cliente"
              placeholder="Ex: CHESF"
              list="clientes-list"
              className="col-span-1"
            />
            <Campo
              label="CNPJ (opcional)"
              name="cnpj"
              placeholder="00.000.000/0000-00"
              className="col-span-1"
            />
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

        <div className="flex items-center justify-between">
          <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
            {totalAtivas} de {todasObras.length} obras ativas no momento.
          </p>
          <a
            href={mostrarInativas ? "/obras" : "/obras?inativas=1"}
            className="h-[30px] px-3 flex items-center rounded-md text-[12px] border transition-colors"
            style={{ borderColor: "var(--line)", color: "var(--ink-secondary)" }}
          >
            {mostrarInativas ? "Ocultar inativas" : "Mostrar inativas"}
          </a>
        </div>

        <div className="space-y-8">
          {grupos.map((grupo) => {
            const obrasVisiveis = mostrarInativas
              ? grupo.obras
              : grupo.obras.filter((o) => o.ativa);
            if (obrasVisiveis.length === 0) return null;

            const nomeCliente = grupo.cliente ?? "Sem cliente";
            const semCliente = grupo.cliente === null;

            return (
              <section key={nomeCliente}>
                <div
                  className="flex items-center justify-between mb-3 pb-2 border-b"
                  style={{ borderColor: "var(--line)" }}
                >
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: semCliente ? "var(--ink-muted)" : "var(--ink)" }}
                  >
                    {nomeCliente}
                  </p>
                  <p className="text-[11px] tabular" style={{ color: "var(--ink-tertiary)" }}>
                    {grupo.total} obra{grupo.total !== 1 ? "s" : ""} &middot;{" "}
                    {grupo.ativas} ativa{grupo.ativas !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {obrasVisiveis.map((o) => (
                    <article
                      key={o.id}
                      className="rounded-lg border p-4 flex items-start justify-between gap-3 transition-opacity"
                      style={{
                        borderColor: "var(--line)",
                        background: "var(--surface)",
                        opacity: o.ativa ? 1 : 0.5,
                      }}
                    >
                      <div className="min-w-0">
                        <p
                          className="text-[14px] font-semibold leading-snug truncate"
                          style={{ color: "var(--ink)" }}
                        >
                          {o.nome}
                        </p>
                        <p className="mt-1 text-[12px]" style={{ color: "var(--ink-tertiary)" }}>
                          {o.cliente ? (
                            <>
                              Cliente{" "}
                              <span style={{ color: "var(--ink-secondary)" }}>{o.cliente}</span>
                            </>
                          ) : (
                            "Sem cliente vinculado"
                          )}
                        </p>
                      </div>
                      <SeloBotao
                        variant={o.ativa ? "ok" : "off"}
                        action={async () => {
                          "use server";
                          await alternarAtiva(o.id, o.ativa);
                        }}
                      >
                        {o.ativa ? "Ativa" : "Inativa"}
                      </SeloBotao>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}

          {todasObras.length === 0 && (
            <p
              className="px-4 py-10 text-center text-[13px] rounded-lg border"
              style={{ color: "var(--ink-muted)", borderColor: "var(--line)" }}
            >
              Nenhuma obra cadastrada ainda.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function Campo({
  label,
  name,
  placeholder,
  list,
  className = "",
}: {
  label: string;
  name: string;
  placeholder?: string;
  list?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span
        className="text-[11px] font-medium uppercase tracking-[0.08em]"
        style={{ color: "var(--ink-tertiary)" }}
      >
        {label}
      </span>
      <input
        name={name}
        placeholder={placeholder}
        list={list}
        required={name === "nome"}
        className="h-[38px] rounded-md border px-3 text-[13px] outline-none transition-colors"
        style={{
          background: "var(--control-bg)",
          borderColor: "var(--control-border)",
          color: "var(--ink)",
        }}
      />
    </label>
  );
}
