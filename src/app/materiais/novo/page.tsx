import { createClient } from "@/lib/supabase/server";
import { requirePerfil } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/page-header";
import { NovoInsumoForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NovoInsumoPage({
  searchParams,
}: {
  searchParams: Promise<{ segmento_id?: string; categoria_id?: string; tipo_id?: string }>;
}) {
  await requirePerfil("supervisor", "tecnico_seguranca");
  const params = await searchParams;
  const supabase = await createClient();

  const [
    { data: segmentos },
    { data: categorias },
    { data: tipos },
  ] = await Promise.all([
    supabase.schema("catalogo").from("segmentos").select("id,codigo,nome").eq("ativo", true).order("codigo"),
    supabase.schema("catalogo").from("categorias").select("id,codigo,nome,segmento_id").eq("ativo", true).order("codigo"),
    supabase.schema("catalogo").from("tipos").select("id,codigo,nome,categoria_id").eq("ativo", true).order("codigo"),
  ]);

  return (
    <main>
      <CabecalhoPagina
        titulo="Novo insumo"
        subtitulo="Cadastre um novo material no catalogo"
      />
      <div className="px-4 sm:px-8 py-6 max-w-3xl">
        <NovoInsumoForm
          segmentos={segmentos ?? []}
          categorias={categorias ?? []}
          tipos={tipos ?? []}
          segmentoInicial={params.segmento_id ?? ""}
          categoriaInicial={params.categoria_id ?? ""}
          tipoInicial={params.tipo_id ?? ""}
        />
      </div>
    </main>
  );
}
