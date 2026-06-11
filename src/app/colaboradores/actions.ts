"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePerfil } from "@/lib/auth";

export async function criarColaborador(formData: FormData) {
  await requirePerfil("supervisor", "administrativo");
  const supabase = await createClient();

  const nome = String(formData.get("nome") || "").trim();
  const funcao = String(formData.get("funcao") || "").trim();
  const matricula = String(formData.get("matricula") || "").trim();
  const data_admissao = String(formData.get("data_admissao") || "");

  if (!nome || !funcao || !matricula || !data_admissao) {
    return { error: "Preencha todos os campos." };
  }

  const { error } = await supabase
    .schema("epi")
    .from("colaboradores")
    .insert({ nome, funcao, matricula, data_admissao });

  if (error) return { error: error.message };

  revalidatePath("/colaboradores");
  return { error: null };
}

export async function alternarAtivo(id: string, ativo: boolean) {
  "use server";
  await requirePerfil("supervisor", "administrativo");
  const supabase = await createClient();
  await supabase.schema("epi").from("colaboradores").update({ ativo: !ativo }).eq("id", id);
  revalidatePath("/colaboradores");
}
