import { createClient } from "@/lib/supabase/server";
import { requirePerfil } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/page-header";
import Link from "next/link";

export const dynamic = "force-dynamic";

function fmtCPF(cpf: string) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export default async function RHPage() {
  await requirePerfil("supervisor", "administrativo", "tecnico_seguranca");
  const supabase = await createClient();

  const { data: funcionarios, error } = await supabase
    .schema("rh")
    .from("funcionarios")
    .select("id,cpf,nome,sexo,telefone,email,estado_civil,grau_instrucao,ativo,criado_em")
    .order("nome");

  const ativos = funcionarios?.filter((f) => f.ativo).length ?? 0;

  return (
    <main>
      <CabecalhoPagina
        titulo="Fichas de RH"
        subtitulo="Cadastro de funcionarios com documentos, endereco e dados bancarios"
        contagem={funcionarios?.length ?? 0}
        rotulo="funcionarios"
      />

      <div className="px-4 sm:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
            {ativos} de {funcionarios?.length ?? 0} funcionarios ativos.
          </p>
          <Link
            href="/rh/novo"
            className="h-9 px-5 rounded-md text-[13px] font-semibold inline-flex items-center transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Novo funcionario
          </Link>
        </div>

        {error && (
          <p className="text-[13px]" style={{ color: "var(--danger)" }}>
            Erro ao carregar: {error.message}
          </p>
        )}

        <section className="rounded-lg border overflow-x-auto" style={{ borderColor: "var(--line)" }}>
          <table className="w-full min-w-[700px] text-[13px] border-collapse">
            <thead>
              <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
                <Th>Nome</Th>
                <Th>CPF</Th>
                <Th>Telefone</Th>
                <Th>E-mail</Th>
                <Th>Escolaridade</Th>
                <Th align="right">Ficha</Th>
              </tr>
            </thead>
            <tbody>
              {funcionarios?.map((f, i) => (
                <tr
                  key={f.id}
                  style={{
                    background: i % 2 === 0 ? "var(--surface-raised)" : "var(--surface)",
                    borderBottom: "1px solid var(--line-soft)",
                  }}
                >
                  <Td>
                    <span style={{ fontWeight: 600, color: "var(--ink)" }}>{f.nome}</span>
                  </Td>
                  <Td>
                    <span className="tabular" style={{ color: "var(--ink-secondary)" }}>
                      {fmtCPF(f.cpf)}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ color: "var(--ink-secondary)" }}>{f.telefone ?? "—"}</span>
                  </Td>
                  <Td>
                    <span style={{ color: "var(--ink-secondary)" }}>{f.email ?? "—"}</span>
                  </Td>
                  <Td>
                    <span style={{ color: "var(--ink-tertiary)" }}>
                      {f.grau_instrucao?.replace(/_/g, " ") ?? "—"}
                    </span>
                  </Td>
                  <Td align="right">
                    <Link
                      href={"/rh/" + f.id}
                      className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-[11px] font-medium transition-colors hover:opacity-80"
                      style={{ borderColor: "var(--line)", background: "var(--surface-2)", color: "var(--ink-secondary)" }}
                    >
                      Ver ficha
                    </Link>
                  </Td>
                </tr>
              ))}
              {funcionarios?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[13px]" style={{ color: "var(--ink-muted)" }}>
                    Nenhum funcionario cadastrado ainda.
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

function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td className={"px-4 py-3 " + (align === "right" ? "text-right" : "text-left")}>{children}</td>;
}
