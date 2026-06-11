import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual, LABELS_PERFIL } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();
  const perfil = await getPerfilAtual();

  const [
    { count: totalColabs },
    { count: totalEPIs },
    { count: totalMovs },
    { data: movRecentes },
    { data: estoqueBaixo },
  ] = await Promise.all([
    supabase.schema("epi").from("colaboradores").select("*", { count: "exact", head: true }).eq("ativo", true),
    supabase.schema("epi").from("itens").select("*", { count: "exact", head: true }).eq("ativo", true),
    supabase.schema("epi").from("movimentacoes").select("*", { count: "exact", head: true }),
    supabase.schema("epi").from("movimentacoes")
      .select("id,criado_em,motivo,quantidade,epi_id(nome),obra_id(nome)")
      .order("criado_em", { ascending: false })
      .limit(6),
    supabase.schema("epi").from("estoque")
      .select("saldo,epi_id(nome,complemento),obra_id(nome)")
      .lt("saldo", 3)
      .gt("saldo", 0)
      .limit(5),
  ]);

  return (
    <main className="px-8 py-8 max-w-5xl">
      {/* Saudação */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1"
          style={{ color: "var(--accent)" }}>
          Painel de Controle
        </p>
        <h1 className="text-[28px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
          Bom dia, {perfil?.nome?.split(" ")[0] ?? "Usuário"}
        </h1>
        <p className="mt-1 text-[14px]" style={{ color: "var(--ink-secondary)" }}>
          {LABELS_PERFIL[perfil?.perfil ?? "colaborador"]} · FAAB Engenharia Ltda
        </p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <MetricCard
          rotulo="Colaboradores ativos"
          valor={totalColabs ?? 0}
          href="/colaboradores"
          cor="var(--accent)"
        />
        <MetricCard
          rotulo="EPIs cadastrados"
          valor={totalEPIs ?? 0}
          href="/epis"
          cor="var(--success)"
        />
        <MetricCard
          rotulo="Movimentações"
          valor={totalMovs ?? 0}
          href="/movimentacoes"
          cor="var(--ink-secondary)"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Movimentações recentes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--ink-tertiary)" }}>
              Movimentações recentes
            </p>
            <Link href="/movimentacoes" className="text-[11px]" style={{ color: "var(--accent)" }}>
              Ver todas →
            </Link>
          </div>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--line)" }}>
            {(movRecentes ?? []).length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-center" style={{ color: "var(--ink-muted)" }}>
                Nenhuma movimentação registrada.
              </p>
            ) : (movRecentes ?? []).map((m, i) => {
              const epi = m.epi_id as unknown as { nome: string } | null;
              const obra = m.obra_id as unknown as { nome: string } | null;
              const positivo = (m.quantidade as number) > 0;
              return (
                <div key={m.id}
                  className="flex items-center gap-3 px-4 py-3 border-b last:border-0"
                  style={{ borderColor: "var(--line-soft)", background: i % 2 === 0 ? "var(--surface)" : "var(--surface-raised)" }}>
                  <span
                    className="shrink-0 w-1.5 h-1.5 rounded-full"
                    style={{ background: positivo ? "var(--success)" : "var(--danger)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate" style={{ color: "var(--ink)" }}>
                      {epi?.nome ?? "—"} · {obra?.nome ?? "—"}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--ink-tertiary)" }}>
                      {m.motivo} · {new Date(m.criado_em).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span className="tabular text-[12px] font-semibold shrink-0"
                    style={{ color: positivo ? "var(--success)" : "var(--danger)" }}>
                    {positivo ? "+" : ""}{m.quantidade as number}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Estoque baixo */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--ink-tertiary)" }}>
              Estoque baixo
            </p>
            <Link href="/movimentacoes" className="text-[11px]" style={{ color: "var(--accent)" }}>
              Registrar entrada →
            </Link>
          </div>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--line)" }}>
            {(estoqueBaixo ?? []).length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-center" style={{ color: "var(--ink-muted)" }}>
                Estoque normalizado.
              </p>
            ) : (estoqueBaixo ?? []).map((e, i) => {
              const epi = e.epi_id as unknown as { nome: string; complemento: string | null } | null;
              const obra = e.obra_id as unknown as { nome: string } | null;
              return (
                <div key={i} className="flex items-center justify-between px-4 py-3 border-b last:border-0"
                  style={{ borderColor: "var(--line-soft)", background: i % 2 === 0 ? "var(--surface)" : "var(--surface-raised)" }}>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium truncate" style={{ color: "var(--ink)" }}>
                      {epi?.nome ?? "—"}{epi?.complemento ? ` · ${epi.complemento}` : ""}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--ink-tertiary)" }}>{obra?.nome ?? "—"}</p>
                  </div>
                  <span className="tabular text-[13px] font-bold ml-4"
                    style={{ color: (e.saldo as number) <= 1 ? "var(--danger)" : "var(--accent)" }}>
                    {e.saldo as number}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ rotulo, valor, href, cor }: {
  rotulo: string; valor: number; href: string; cor: string;
}) {
  return (
    <Link href={href}
      className="block rounded-lg border p-5 transition-opacity hover:opacity-80"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-3"
        style={{ color: "var(--ink-muted)" }}>{rotulo}</p>
      <p className="text-[36px] font-bold tabular leading-none" style={{ color: cor }}>
        {String(valor).padStart(2, "0")}
      </p>
    </Link>
  );
}
