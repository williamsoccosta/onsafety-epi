import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/page-header";
import { CatalogoPicker } from "./picker";

export const dynamic = "force-dynamic";

export default async function MateriaisPage() {
  const perfil = await getPerfilAtual();
  const supabase = await createClient();

  const [
    { data: segmentos },
    { data: categorias },
    { data: tipos },
    { data: insumos },
  ] = await Promise.all([
    supabase.schema("catalogo").from("segmentos").select("id,codigo,nome").eq("ativo", true).order("codigo"),
    supabase.schema("catalogo").from("categorias").select("id,codigo,nome,segmento_id").eq("ativo", true).order("codigo"),
    supabase.schema("catalogo").from("tipos").select("id,codigo,nome,categoria_id").eq("ativo", true).order("codigo"),
    supabase.schema("core").from("insumos").select("id,codigo,nome,nome_gerado,marca,material_acabamento,info_adicional,apresentacao,grupo_insumo,controla_estoque,segmento_id,categoria_id,tipo_id,validado,ativo,ficha_tecnica_id").eq("ativo", true).order("codigo"),
  ]);

  const podeEscrever = perfil?.perfil === "supervisor" || perfil?.perfil === "tecnico_seguranca";

  return (
    <main>
      <CabecalhoPagina
        titulo="Catalogo de materiais"
        subtitulo="Insumos da FAAB organizados por segmento, categoria e tipo"
        contagem={insumos?.length ?? 0}
        rotulo="insumos"
      />
      <div className="px-4 sm:px-8 py-6">
        <CatalogoPicker
          segmentos={segmentos ?? []}
          categorias={categorias ?? []}
          tipos={tipos ?? []}
          insumos={insumos ?? []}
          podeEscrever={podeEscrever}
        />
      </div>
    </main>
  );
}
