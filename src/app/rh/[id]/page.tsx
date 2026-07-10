import { createClient } from "@/lib/supabase/server";
import { requirePerfil, getPerfilAtual } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

function fmtCPF(cpf: string) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
function fmtData(iso: string | null) {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function FichaFuncionario({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = await getPerfilAtual();
  if (!perfil || !["supervisor", "administrativo", "tecnico_seguranca"].includes(perfil.perfil)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: func } = await supabase
    .schema("rh").from("funcionarios")
    .select("*")
    .eq("id", id)
    .single();

  if (!func) notFound();

  const docs = (func.documentos ?? {}) as Record<string, Record<string, string>>;
  const end = (func.endereco ?? {}) as Record<string, string>;
  const banco = (func.dados_bancarios ?? {}) as Record<string, unknown>;
  const principal = (banco.principal ?? {}) as Record<string, string>;
  const outrasContas = (banco.outras_contas ?? []) as Record<string, string>[];
  const outrosPix = (banco.outros_pix ?? []) as string[];

  const podVerBanco = perfil.perfil === "supervisor" || perfil.perfil === "administrativo";

  return (
    <main>
      <div className="flex items-center justify-between px-4 sm:px-8 py-4 border-b"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <Link href="/rh" className="flex items-center gap-1.5 text-[13px]"
          style={{ color: "var(--ink-secondary)" }}>
          &#8592; Fichas de RH
        </Link>
      </div>

      <div className="px-4 sm:px-8 py-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-lg border p-6" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1"
            style={{ color: "var(--accent)" }}>
            Ficha de RH · FAAB Engenharia Ltda
          </p>
          <h1 className="text-[24px] font-semibold tracking-tight mb-3" style={{ color: "var(--ink)" }}>
            {func.nome}
          </h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <Campo rotulo="CPF" valor={fmtCPF(func.cpf)} mono />
            <Campo rotulo="Sexo" valor={func.sexo ?? "—"} />
            <Campo rotulo="Nascimento" valor={fmtData(func.data_nascimento)} mono />
            <Campo rotulo="Raca" valor={(func.raca ?? "—").replace(/_/g, " ")} />
            <Campo rotulo="Estado civil" valor={(func.estado_civil ?? "—").replace(/_/g, " ")} />
            <Campo rotulo="Escolaridade" valor={(func.grau_instrucao ?? "—").replace(/_/g, " ")} />
          </div>
        </div>

        {/* Dados pessoais */}
        <Secao titulo="Dados pessoais">
          <Grid>
            <Campo rotulo="Nacionalidade" valor={func.nacionalidade ?? "—"} />
            <Campo rotulo="Naturalidade" valor={func.naturalidade ?? "—"} />
            <Campo rotulo="Nome do pai" valor={func.nome_pai ?? "—"} />
            <Campo rotulo="Nome da mae" valor={func.nome_mae ?? "—"} />
            <Campo rotulo="E-mail" valor={func.email ?? "—"} />
            <Campo rotulo="Telefone" valor={func.telefone ?? "—"} />
            {func.estado_civil === "casado" && (
              <>
                <Campo rotulo="Regime casamento" valor={func.regime_casamento ?? "—"} />
                <Campo rotulo="Data casamento" valor={fmtData(func.data_casamento)} mono />
              </>
            )}
          </Grid>
        </Secao>

        {/* Documentos */}
        <Secao titulo="Documentos">
          <Grid>
            {docs.ctps?.numero && (
              <>
                <Campo rotulo="CTPS" valor={docs.ctps.numero} mono />
                <Campo rotulo="Serie" valor={docs.ctps.serie ?? "—"} mono />
                <Campo rotulo="UF" valor={docs.ctps.uf ?? "—"} />
                <Campo rotulo="PIS/PASEP" valor={docs.ctps.pis_pasep ?? "—"} mono />
              </>
            )}
            {docs.rg?.numero && (
              <>
                <Campo rotulo="RG" valor={docs.rg.numero} mono />
                <Campo rotulo="Orgao emissor" valor={docs.rg.orgao_emissor ?? "—"} />
                <Campo rotulo="UF" valor={docs.rg.uf ?? "—"} />
                <Campo rotulo="Expedicao" valor={fmtData(docs.rg.data_expedicao)} mono />
              </>
            )}
            {docs.titulo_eleitor?.numero && (
              <>
                <Campo rotulo="Titulo eleitor" valor={docs.titulo_eleitor.numero} mono />
                <Campo rotulo="Zona" valor={docs.titulo_eleitor.zona ?? "—"} mono />
                <Campo rotulo="Secao" valor={docs.titulo_eleitor.secao ?? "—"} mono />
              </>
            )}
            {docs.reservista?.numero && (
              <Campo rotulo="Reservista" valor={docs.reservista.numero} mono />
            )}
            {docs.cnh?.numero && (
              <>
                <Campo rotulo="CNH" valor={docs.cnh.numero} mono />
                <Campo rotulo="Categoria" valor={docs.cnh.categoria ?? "—"} />
                <Campo rotulo="Orgao" valor={docs.cnh.orgao_emissor ?? "—"} />
                <Campo rotulo="UF" valor={docs.cnh.uf ?? "—"} />
                <Campo rotulo="Expedicao" valor={fmtData(docs.cnh.data_expedicao)} mono />
                <Campo rotulo="Validade" valor={fmtData(docs.cnh.data_validade)} mono />
              </>
            )}
            {!docs.ctps?.numero && !docs.rg?.numero && !docs.cnh?.numero && (
              <p className="text-[13px] col-span-full" style={{ color: "var(--ink-muted)" }}>Nenhum documento registrado.</p>
            )}
          </Grid>
        </Secao>

        {/* Endereco */}
        <Secao titulo="Endereco">
          {end.cep ? (
            <Grid>
              <Campo rotulo="CEP" valor={end.cep} mono />
              <Campo rotulo="Logradouro" valor={end.logradouro ?? "—"} />
              <Campo rotulo="Numero" valor={end.numero ?? "—"} />
              <Campo rotulo="Complemento" valor={end.complemento || "—"} />
              <Campo rotulo="Bairro" valor={end.bairro ?? "—"} />
              <Campo rotulo="Municipio" valor={end.municipio ?? "—"} />
              <Campo rotulo="UF" valor={end.uf ?? "—"} />
            </Grid>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>Endereco nao registrado.</p>
          )}
        </Secao>

        {/* Dados bancarios — só supervisor/administrativo */}
        {podVerBanco && (
          <Secao titulo="Dados bancarios">
            {principal.banco ? (
              <Grid>
                <Campo rotulo="Banco" valor={principal.banco} />
                <Campo rotulo="Agencia" valor={`${principal.agencia ?? ""}${principal.agencia_digito ? "-" + principal.agencia_digito : ""}`} mono />
                <Campo rotulo="Conta" valor={`${principal.conta ?? ""}${principal.conta_digito ? "-" + principal.conta_digito : ""}`} mono />
                <Campo rotulo="Tipo" valor={principal.tipo ?? "—"} />
                <Campo rotulo="PIX" valor={principal.pix || "—"} />
                {outrasContas.length > 0 && (
                  <div className="col-span-full">
                    <p className="text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: "var(--ink-muted)" }}>Outras contas</p>
                    {outrasContas.map((c, i) => (
                      <p key={i} className="text-[12px] tabular" style={{ color: "var(--ink-secondary)" }}>
                        Ag {c.agencia}{c.agencia_digito ? "-" + c.agencia_digito : ""} · Conta {c.conta}{c.conta_digito ? "-" + c.conta_digito : ""} · {c.tipo}
                      </p>
                    ))}
                  </div>
                )}
                {outrosPix.length > 0 && (
                  <div className="col-span-full">
                    <p className="text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: "var(--ink-muted)" }}>Outros PIX</p>
                    {outrosPix.map((p, i) => (
                      <p key={i} className="text-[12px]" style={{ color: "var(--ink-secondary)" }}>{p}</p>
                    ))}
                  </div>
                )}
              </Grid>
            ) : (
              <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>Dados bancarios nao registrados.</p>
            )}
          </Secao>
        )}

        {/* Footer */}
        <p className="text-[10px] pt-4" style={{ color: "var(--ink-muted)" }}>
          Cadastrado em {fmtData(func.criado_em)} · Atualizado em {fmtData(func.atualizado_em)}
        </p>
      </div>
    </main>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border p-5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-4" style={{ color: "var(--ink-tertiary)" }}>
        {titulo}
      </p>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">{children}</div>;
}

function Campo({ rotulo, valor, mono }: { rotulo: string; valor: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--ink-muted)" }}>{rotulo} </span>
      <p className={"text-[13px] font-medium " + (mono ? "tabular" : "")} style={{ color: "var(--ink-secondary)" }}>
        {valor}
      </p>
    </div>
  );
}
