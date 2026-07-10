"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePerfil } from "@/lib/auth";

export async function criarObra(formData: FormData) {
  await requirePerfil("supervisor");
  const supabase = await createClient();

  const nome = String(formData.get("nome") || "").trim();
  const cliente = String(formData.get("cliente") || "").trim();
  const cnpj = String(formData.get("cnpj") || "").replace(/\D/g, "").trim();

  if (!nome) return { error: "Informe o nome da obra." };

  const payload: Record<string, unknown> = {
    nome,
    cliente: cliente || null,
  };

  if (cnpj.length === 14) {
    const { data: resultado } = await supabase
      .schema("core")
      .rpc("buscar_empresa", { p_cnpj: cnpj });

    if (resultado?.ok && resultado.data?.id) {
      payload.empresa_id = resultado.data.id;
      if (!cliente) {
        payload.cliente = resultado.data.nome_fantasia || resultado.data.razao_social;
      }
    }
  }

  const { error } = await supabase
    .schema("obras")
    .from("obras")
    .insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/obras");
  return { error: null };
}

export async function alternarAtiva(id: string, ativa: boolean) {
  "use server";
  await requirePerfil("supervisor");
  const supabase = await createClient();
  await supabase.schema("obras").from("obras").update({ ativa: !ativa }).eq("id", id);
  revalidatePath("/obras");
}
