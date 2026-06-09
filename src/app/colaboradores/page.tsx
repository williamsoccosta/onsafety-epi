import { createClient } from "@/lib/supabase/server";
import { criarColaborador, alternarAtivo } from "./actions";
import { Selo, SeloBotao } from "@/components/selo";
import { CabecalhoPagina } from "@/components/page-header";

export const dynamic = "force-dynamic";

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function ColaboradoresPage() {
  const supabase = await createClient();
  const { data: colaboradores, error } = await supabase
    .schema("epi")
    .from("colaboradores")
    .select("*")
    .order("nome");

  async function action(formData: FormData) {
    "use server";
    await criarColaborador(formData);
  }

  const ativos = colaboradores?.filter((c) => c.ativo).length ?? 0;

  return (
    <main>
      <CabecalhoPagina
        titulo="Colaboradores"
        subtitulo="Trabalhadores da empresa, vinculados a obra ao serem alocados"
        contagem={colaboradores?.length ?? 0}
        rotulo="cadastrados"
      />

      <div className="px-8 py-6 space-y-6">
        <section
          className="rounded-lg border p-5"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--ink-tertiary)" }}>
            Novo cadastro
          </p>
          <form action={action} className="grid grid-cols-4 gap-3">
            <Campo label="Nome completo" name="nome" placeholder="Ex: Joao da Silva" className="col-span-2" />
            <Campo label="Funcao" name="funcao" placeholder="Ex: Pedreiro" />
            <Campo label="Matricula" name="matricula" placeholder="Ex: 0231" mono />
            <Campo label="Admissao" name="data_admissao" type="date" />
            <div className="col-span-3 flex items-end">
              <button
                type="submit"
                className="h-[38px] px-5 rounded-md text-[13px] font-semibold transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                Cadastrar colaborador
              </button>
            </div>
          </form>
        </section>

        {error && (
          <p className="text-[13px]" style={{ color: "var(--danger)" }}>
            Erro ao carregar colaboradores: {error.message}
          </p>
        )}

        <section className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--line)" }}>
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
                <Th>Nome</Th>
                <Th>Funcao</Th>
                <Th>Matricula</Th>
                <Th>Admissao</Th>
                <Th align="right">Status</Th>
              </tr>
            </thead>
            <tbody>
              {colaboradores?.map((c, i) => (
                <tr
                  key={c.id}
                  style={{
                    background: i % 2 === 0 ? "var(--surface-raised)" : "var(--surface)",
                    borderBottom: "1px solid var(--line-soft)",
                  }}
                >
                  <Td><span style={{ fontWeight: 600, color: "var(--ink)" }}>{c.nome}</span></Td>
                  <Td><span style={{ color: "var(--ink-secondary)" }}>{c.funcao}</span></Td>
                  <Td><span className="tabular" style={{ color: "var(--ink-secondary)" }}>{c.matricula}</span></Td>
                  <Td><span className="tabular" style={{ color: "var(--ink-tertiary)" }}>{formatarData(c.data_admissao)}</span></Td>
                  <Td align="right">
                    <SeloBotao
                      variant={c.ativo ? "ok" : "off"}
                      action={async () => { "use server"; await alternarAtivo(c.id, c.ativo); }}
                    >
                      {c.ativo ? "Ativo" : "Inativo"}
                    </SeloBotao>
                  </Td>
                </tr>
              ))}
              {colaboradores?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[13px]" style={{ color: "var(--ink-muted)" }}>
                    Nenhum colaborador cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
          {ativos} de {colaboradores?.length ?? 0} colaboradores ativos no momento.
        </p>
      </div>
    </main>
  );
}

function Campo({
  label,
  name,
  placeholder,
  type = "text",
  mono = false,
  className = "",
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--ink-tertiary)" }}>
        {label}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required
        className={`h-[38px] rounded-md border px-3 text-[13px] outline-none transition-colors ${mono ? "tabular" : ""}`}
        style={{
          background: "var(--control-bg)",
          borderColor: "var(--control-border)",
          color: "var(--ink)",
        }}
      />
    </label>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] ${align === "right" ? "text-right" : "text-left"}`}
      style={{ color: "var(--ink-tertiary)" }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}>{children}</td>;
}
