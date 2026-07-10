import { requirePerfil } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/page-header";
import { EmpresaForm } from "./form";

export const dynamic = "force-dynamic";

export default async function EmpresasPage() {
  // Cadastro de empresa e acao cadastral — so supervisor e administrativo.
  // requirePerfil redireciona para "/" quem nao tiver o perfil (defesa
  // server-side, alem do filtro do menu na home).
  await requirePerfil("supervisor", "administrativo");

  return (
    <main>
      <CabecalhoPagina
        titulo="Empresas"
        subtitulo="Cadastro de CNPJ via consulta a Receita Federal"
      />
      <div className="px-4 sm:px-8 py-6 max-w-3xl">
        <EmpresaForm />
      </div>
    </main>
  );
}
