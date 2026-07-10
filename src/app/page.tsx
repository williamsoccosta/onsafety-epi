import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import { LABELS_PERFIL } from "@/lib/types";
import type { Perfil } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DIA_MS = 24 * 60 * 60 * 1000;

type Modulo = {
  href: string;
  label: string;
  marca: string;
  descricao: string;
  perfis: Perfil[];
};

const MODULOS: Modulo[] = [
  { href: "/dashboard", label: "Dashboard", marca: "DB", descricao: "Indicadores e graficos", perfis: ["supervisor", "almoxarife", "administrativo", "tecnico_seguranca"] },
  { href: "/epis", label: "EPI", marca: "EP", descricao: "Catalogo, entregas e estoque", perfis: ["supervisor", "almoxarife", "administrativo", "tecnico_seguranca"] },
  { href: "/colaboradores", label: "Colaboradores", marca: "CO", descricao: "Fichas e historico de entregas", perfis: ["supervisor", "almoxarife", "administrativo", "tecnico_seguranca"] },
  { href: "/obras", label: "Obras", marca: "OB", descricao: "Canteiros e clientes", perfis: ["supervisor", "almoxarife", "administrativo", "tecnico_seguranca"] },
  { href: "/empresas", label: "Empresas", marca: "EM", descricao: "Cadastro de CNPJ", perfis: ["supervisor", "administrativo"] },
  { href: "/rh", label: "RH", marca: "RH", descricao: "Fichas de funcionarios", perfis: ["supervisor", "administrativo", "tecnico_seguranca"] },
  { href: "/materiais", label: "Materiais", marca: "MT", descricao: "Catalogo de insumos", perfis: ["supervisor", "almoxarife", "administrativo", "tecnico_seguranca"] },
  { href: "/ca", label: "Consulta CA", marca: "CA", descricao: "Busca de certificados", perfis: ["supervisor", "almoxarife", "administrativo", "tecnico_seguranca"] },
  { href: "/usuarios", label: "Usuarios", marca: "US", descricao: "Perfis e acessos", perfis: ["supervisor"] },
];

export default async function Home() {
  const supabase = await createClient();
  const perfil = await getPerfilAtual();

  if (!perfil) return null;

  const hoje = new Date();
  const limite60 = new Date(hoje.getTime() + 60 * DIA_MS).toISOString().split("T")[0];

  const [
    { data: casVencendo },
    { data: estoqueAll },
    { data: movsAnalise },
    { data: colabsAtivos },
  ] = await Promise.all([
    supabase.schema("epi").from("itens")
      .select("id", { count: "exact" })
      .eq("ativo", true)
      .not("ca_validade", "is", null)
      .lte("ca_validade", limite60),
    supabase.schema("epi").from("estoque")
      .select("saldo,epi_id(estoque_minimo)"),
    supabase.schema("epi").from("movimentacoes")
      .select("motivo,colaborador_id,criado_em,epi_id(id,vida_util_dias)")
      .in("motivo", ["Entrega", "Substituicao"])
      .order("criado_em", { ascending: false })
      .limit(1000),
    supabase.schema("epi").from("colaboradores")
      .select("id", { count: "exact" })
      .eq("ativo", true),
  ]);

  const totalCAsVencendo = casVencendo?.length ?? 0;

  const estoqueBaixo = (estoqueAll ?? []).filter((e) => {
    const epi = e.epi_id as unknown as { estoque_minimo: number | null } | null;
    const minimo = epi?.estoque_minimo ?? 3;
    return (e.saldo as number) > 0 && (e.saldo as number) < minimo;
  }).length;

  const entregas = movsAnalise ?? [];
  const receberam = new Set(entregas.map((m) => m.colaborador_id as string).filter(Boolean));
  const totalColabs = colabsAtivos?.length ?? 0;
  const semEpi = totalColabs - receberam.size;

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

  const modulosVisiveis = MODULOS.filter((m) => m.perfis.includes(perfil.perfil));

  const alertas = [
    { rotulo: "Trocas vencidas", valor: trocasVencidas, href: "/trocas?vencidas=1", cor: trocasVencidas > 0 ? "var(--danger)" : "var(--success)" },
    { rotulo: "CAs vencendo (60d)", valor: totalCAsVencendo, href: "/ca?vencidos=1", cor: totalCAsVencendo > 0 ? "var(--accent)" : "var(--success)" },
    { rotulo: "Estoque baixo", valor: estoqueBaixo, href: "/movimentacoes", cor: estoqueBaixo > 0 ? "var(--accent)" : "var(--success)" },
    { rotulo: "Sem EPI recebido", valor: semEpi > 0 ? semEpi : 0, href: "/colaboradores", cor: semEpi > 0 ? "var(--danger)" : "var(--success)" },
  ];

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--canvas)" }}>
      <div className="flex-1 px-4 sm:px-8 py-6 sm:py-10 max-w-4xl mx-auto w-full">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[16px] font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
            CA
          </span>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
              Onsafety EPI
            </h1>
            <p className="text-[13px]" style={{ color: "var(--ink-tertiary)" }}>
              {perfil.nome?.split(" ")[0] ?? "Usuario"} · {LABELS_PERFIL[perfil.perfil]} · FAAB Engenharia
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {modulosVisiveis.map((mod) => (
            <Link key={mod.href} href={mod.href}
              className="group rounded-lg border p-5 transition-all hover:border-[var(--accent)]"
              style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
              <span className="flex h-10 w-10 items-center justify-center rounded-md text-[13px] font-bold mb-3"
                style={{ background: "var(--surface-2)", color: "var(--ink-secondary)" }}>
                {mod.marca}
              </span>
              <p className="text-[14px] font-semibold" style={{ color: "var(--ink)" }}>
                {mod.label}
              </p>
              <p className="text-[11px] mt-1" style={{ color: "var(--ink-muted)" }}>
                {mod.descricao}
              </p>
            </Link>
          ))}
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3"
            style={{ color: "var(--ink-tertiary)" }}>
            Alertas
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {alertas.map((a) => (
              <Link key={a.rotulo} href={a.href}
                className="rounded-lg border p-4 transition-opacity hover:opacity-80"
                style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2"
                  style={{ color: "var(--ink-muted)" }}>
                  {a.rotulo}
                </p>
                <p className="text-[28px] font-bold tabular leading-none" style={{ color: a.cor }}>
                  {String(a.valor).padStart(2, "0")}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
          <form action={async () => { "use server"; const { logoutAction } = await import("@/app/auth/actions"); await logoutAction(); }}>
            <button type="submit" className="text-[12px] font-medium transition-colors hover:opacity-70"
              style={{ color: "var(--ink-muted)" }}>
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
