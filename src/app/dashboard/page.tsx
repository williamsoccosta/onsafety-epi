import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import { LABELS_PERFIL } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DIA_MS = 24 * 60 * 60 * 1000;

function fmtData(iso: string) {
  const [ano, mes, dia] = iso.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function Dashboard() {
  const supabase = await createClient();
  const perfil = await getPerfilAtual();

  const hoje = new Date();
  const limite60 = new Date(hoje.getTime() + 60 * DIA_MS).toISOString().split("T")[0];

  // obra_id e cross-schema — PostgREST nao resolve embedded join; juntar em memoria.
  const [
    { count: totalColabs },
    { count: totalEPIs },
    { count: totalMovs },
    { data: movRecentes },
    { data: estoqueAll },
    { data: casVencendo },
    { data: obrasData },
    { data: movsAnalise },
    { data: colabsAtivos },
  ] = await Promise.all([
    supabase.schema("epi").from("colaboradores").select("*", { count: "exact", head: true }).eq("ativo", true),
    supabase.schema("epi").from("itens").select("*", { count: "exact", head: true }).eq("ativo", true),
    supabase.schema("epi").from("movimentacoes").select("*", { count: "exact", head: true }),
    supabase.schema("epi").from("movimentacoes")
      .select("id,criado_em,motivo,quantidade,obra_id,epi_id(nome)")
      .order("criado_em", { ascending: false })
      .limit(6),
    supabase.schema("epi").from("estoque")
      .select("saldo,obra_id,epi_id(nome,complemento,estoque_minimo)"),
    supabase.schema("epi").from("itens")
      .select("id,nome,ca,ca_validade")
      .eq("ativo", true)
      .not("ca_validade", "is", null)
      .lte("ca_validade", limite60)
      .order("ca_validade", { ascending: true })
      .limit(8),
    supabase.schema("obras").from("obras").select("id,nome"),
    supabase.schema("epi").from("movimentacoes")
      .select("motivo,quantidade,criado_em,colaborador_id,epi_id(id,nome,vida_util_dias)")
      .order("criado_em", { ascending: false })
      .limit(1000),
    supabase.schema("epi").from("colaboradores").select("id,nome").eq("ativo", true),
  ]);

  const obraMap: Record<string, string> = Object.fromEntries(
    (obrasData ?? []).map((o) => [o.id, o.nome])
  );

  // Estoque baixo: usa o minimo do item (fallback 3)
  const estoqueBaixo = (estoqueAll ?? [])
    .filter((e) => {
      const epi = e.epi_id as unknown as { estoque_minimo: number | null } | null;
      const minimo = epi?.estoque_minimo ?? 3;
      return (e.saldo as number) > 0 && (e.saldo as number) < minimo;
    })
    .sort((a, b) => (a.saldo as number) - (b.saldo as number))
    .slice(0, 5);

  // Analises a partir das movimentacoes
  const entregas = (movsAnalise ?? []).filter((m) =>
    m.motivo === "Entrega" || m.motivo === "Substituicao"
  );

  // Top EPIs entregues (por quantidade)
  const porEpi = new Map<string, number>();
  for (const m of entregas) {
    const epi = m.epi_id as unknown as { nome: string } | null;
    if (!epi) continue;
    porEpi.set(epi.nome, (porEpi.get(epi.nome) ?? 0) + Math.abs(m.quantidade as number));
  }
  const topEpis = [...porEpi.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxEpi = topEpis[0]?.[1] ?? 1;

  // Movimentacoes por motivo
  const porMotivo = new Map<string, number>();
  for (const m of movsAnalise ?? []) {
    porMotivo.set(m.motivo as string, (porMotivo.get(m.motivo as string) ?? 0) + 1);
  }
  const motivos = [...porMotivo.entries()].sort((a, b) => b[1] - a[1]);
  const maxMotivo = motivos[0]?.[1] ?? 1;

  // Trabalhadores ativos que nunca receberam EPI
  const receberam = new Set(
    entregas.map((m) => m.colaborador_id as string).filter(Boolean)
  );
  const semEpi = (colabsAtivos ?? []).filter((col) => !receberam.has(col.id));

  // Trocas vencidas (ultima entrega por colaborador+EPI alem da vida util)
  const vistos = new Set<string>();
  let trocasVencidas = 0;
  for (const m of entregas) {
    const colabId = m.colaborador_id as string | null;
    const epi = m.epi_id as unknown as { id: string; vida_util_dias: number | null } | null;
    if (!colabId || !epi) continue;
    const chave = colabId + ":" + epi.id;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    if (!epi.vida_util_dias) continue;
    const prevista = new Date(new Date(m.criado_em).getTime() + epi.vida_util_dias * DIA_MS);
    if (prevista < hoje) trocasVencidas++;
  }

  return (
    <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl">
      {/* Saudacao */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1"
          style={{ color: "var(--accent)" }}>
          Painel de Controle
        </p>
        <h1 className="text-[28px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
          Bom dia, {perfil?.nome?.split(" ")[0] ?? "Usuario"}
        </h1>
        <p className="mt-1 text-[14px]" style={{ color: "var(--ink-secondary)" }}>
          {perfil ? LABELS_PERFIL[perfil.perfil] : ""} · FAAB Engenharia Ltda
        </p>
      </div>

      {/* Metricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <MetricCard rotulo="Colaboradores ativos" valor={totalColabs ?? 0} href="/colaboradores" cor="var(--accent)" />
        <MetricCard rotulo="EPIs cadastrados" valor={totalEPIs ?? 0} href="/epis" cor="var(--success)" />
        <MetricCard rotulo="Movimentacoes" valor={totalMovs ?? 0} href="/movimentacoes" cor="var(--ink-secondary)" />
        <MetricCard
          rotulo="Trocas vencidas"
          valor={trocasVencidas}
          href="/trocas?vencidas=1"
          cor={trocasVencidas > 0 ? "var(--danger)" : "var(--success)"}
        />
      </div>

      {/* CAs vencendo */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "var(--ink-tertiary)" }}>
            CAs vencendo nos proximos 60 dias
          </p>
          <Link href="/ca?vencidos=1" className="text-[11px]" style={{ color: "var(--accent)" }}>
            Consulta CA →
          </Link>
        </div>
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--line)" }}>
          {(casVencendo ?? []).length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-center" style={{ color: "var(--ink-muted)" }}>
              Nenhum CA vencendo no periodo.
            </p>
          ) : (casVencendo ?? []).map((item, i) => {
            const vencido = new Date(item.ca_validade as string) < hoje;
            return (
              <div key={item.id}
                className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-0"
                style={{
                  borderColor: "var(--line-soft)",
                  background: i % 2 === 0 ? "var(--surface)" : "var(--surface-raised)",
                }}>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium truncate" style={{ color: "var(--ink)" }}>
                    {item.nome}
                  </p>
                  <p className="text-[11px] tabular" style={{ color: "var(--ink-tertiary)" }}>
                    CA {item.ca}
                  </p>
                </div>
                <span className="tabular text-[12px] font-semibold shrink-0"
                  style={{ color: vencido ? "var(--danger)" : "var(--accent)" }}>
                  {vencido ? "Vencido em " : "Vence em "}{fmtData(item.ca_validade as string)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3"
            style={{ color: "var(--ink-tertiary)" }}>
            EPIs mais entregues
          </p>
          <div className="rounded-lg border p-4 space-y-3"
            style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            {topEpis.length === 0 ? (
              <p className="py-4 text-[13px] text-center" style={{ color: "var(--ink-muted)" }}>
                Nenhuma entrega registrada.
              </p>
            ) : topEpis.map(([nome, qtd]) => (
              <Barra key={nome} rotulo={nome} valor={qtd} max={maxEpi} cor="var(--accent)" />
            ))}
          </div>
        </section>

        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3"
            style={{ color: "var(--ink-tertiary)" }}>
            Movimentacoes por motivo
          </p>
          <div className="rounded-lg border p-4 space-y-3"
            style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            {motivos.length === 0 ? (
              <p className="py-4 text-[13px] text-center" style={{ color: "var(--ink-muted)" }}>
                Nenhuma movimentacao.
              </p>
            ) : motivos.map(([motivo, qtd]) => (
              <Barra key={motivo} rotulo={motivo} valor={qtd} max={maxMotivo} cor="var(--success)" />
            ))}
          </div>
        </section>
      </div>

      {/* Trabalhadores sem EPI */}
      <section className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3"
          style={{ color: "var(--ink-tertiary)" }}>
          Trabalhadores ativos sem nenhum EPI recebido
        </p>
        <div className="rounded-lg border p-4"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          {semEpi.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--success)" }}>
              Todos os colaboradores ativos ja receberam EPI.
            </p>
          ) : (
            <div className="flex items-start gap-4">
              <p className="text-[28px] font-bold tabular leading-none shrink-0"
                style={{ color: "var(--danger)" }}>
                {semEpi.length}
              </p>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--ink-secondary)" }}>
                {semEpi.slice(0, 8).map((col) => col.nome).join(", ")}
                {semEpi.length > 8 && ` e mais ${semEpi.length - 8}...`}
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Movimentacoes recentes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--ink-tertiary)" }}>
              Movimentacoes recentes
            </p>
            <Link href="/movimentacoes" className="text-[11px]" style={{ color: "var(--accent)" }}>
              Ver todas →
            </Link>
          </div>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--line)" }}>
            {(movRecentes ?? []).length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-center" style={{ color: "var(--ink-muted)" }}>
                Nenhuma movimentacao registrada.
              </p>
            ) : (movRecentes ?? []).map((m, i) => {
              const epi = m.epi_id as unknown as { nome: string } | null;
              const positivo = (m.quantidade as number) > 0;
              return (
                <div key={m.id}
                  className="flex items-center gap-3 px-4 py-3 border-b last:border-0"
                  style={{
                    borderColor: "var(--line-soft)",
                    background: i % 2 === 0 ? "var(--surface)" : "var(--surface-raised)",
                  }}>
                  <span className="shrink-0 w-1.5 h-1.5 rounded-full"
                    style={{ background: positivo ? "var(--success)" : "var(--danger)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate" style={{ color: "var(--ink)" }}>
                      {epi?.nome ?? "—"} · {obraMap[m.obra_id as string] ?? "—"}
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
              Estoque abaixo do minimo
            </p>
            <Link href="/movimentacoes" className="text-[11px]" style={{ color: "var(--accent)" }}>
              Registrar entrada →
            </Link>
          </div>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--line)" }}>
            {estoqueBaixo.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-center" style={{ color: "var(--ink-muted)" }}>
                Estoque normalizado.
              </p>
            ) : estoqueBaixo.map((e, i) => {
              const epi = e.epi_id as unknown as { nome: string; complemento: string | null; estoque_minimo: number | null } | null;
              return (
                <div key={i}
                  className="flex items-center justify-between px-4 py-3 border-b last:border-0"
                  style={{
                    borderColor: "var(--line-soft)",
                    background: i % 2 === 0 ? "var(--surface)" : "var(--surface-raised)",
                  }}>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium truncate" style={{ color: "var(--ink)" }}>
                      {epi?.nome ?? "—"}{epi?.complemento ? ` · ${epi.complemento}` : ""}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--ink-tertiary)" }}>
                      {obraMap[e.obra_id as string] ?? "—"} · minimo {epi?.estoque_minimo ?? 3}
                    </p>
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

function Barra({ rotulo, valor, max, cor }: {
  rotulo: string; valor: number; max: number; cor: string;
}) {
  const pct = Math.max(4, Math.round((valor / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
        <span className="text-[12px] truncate min-w-0" style={{ color: "var(--ink-secondary)" }}>
          {rotulo}
        </span>
        <span className="tabular text-[12px] font-semibold shrink-0" style={{ color: "var(--ink)" }}>
          {valor}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
        <div className="h-full rounded-full" style={{ width: pct + "%", background: cor, opacity: 0.75 }} />
      </div>
    </div>
  );
}
