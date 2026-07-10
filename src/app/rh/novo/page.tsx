import { requirePerfil } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/page-header";
import { NovoFuncionarioForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NovoFuncionarioPage({
  searchParams,
}: {
  searchParams: Promise<{ nome?: string; colaborador_id?: string }>;
}) {
  await requirePerfil("supervisor", "administrativo");
  const params = await searchParams;

  return (
    <main>
      <CabecalhoPagina
        titulo="Novo Funcionario"
        subtitulo="Preencha a ficha cadastral completa do funcionario"
      />
      <div className="px-4 sm:px-8 py-6 max-w-3xl">
        <NovoFuncionarioForm
          nomeInicial={params.nome ?? ""}
          colaboradorId={params.colaborador_id ?? ""}
        />
      </div>
    </main>
  );
}
