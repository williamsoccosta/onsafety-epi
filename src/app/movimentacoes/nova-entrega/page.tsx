import { createClient } from "@/lib/supabase/server";
import { EntregaForm } from "./entrega-form";

export const dynamic = "force-dynamic";

export default async function EntregaEpiPage() {
  const supabase = await createClient();

  const [{ data: obras }, { data: epis }, { data: colabs }] = await Promise.all([
    supabase.schema("obras").from("obras").select("id,nome").eq("ativa", true).order("nome"),
    supabase.schema("epi").from("itens")
      .select("id,nome,complemento,ca").eq("ativo", true).order("nome"),
    supabase.schema("epi").from("colaboradores")
      .select("id,nome,matricula,funcao").eq("ativo", true).order("nome"),
  ]);

  return (
    <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl">
      <div className="mb-6">
        <a href="/movimentacoes" className="text-[12px]" style={{ color: "var(--ink-secondary)" }}>
          &#8592; Movimentacoes
        </a>
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
          Entrega de EPI
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: "var(--ink-secondary)" }}>
          Entrega ou substituicao no balcao: preencha os dados e colete a assinatura do colaborador.
        </p>
      </div>
      <EntregaForm
        obras={obras ?? []}
        epis={epis ?? []}
        colaboradores={colabs ?? []}
      />
    </main>
  );
}
