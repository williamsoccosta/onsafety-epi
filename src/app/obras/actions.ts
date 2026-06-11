"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePerfil } from "@/lib/auth";

export async function criarObra(formData: FormData) {
  await requirePerfil("supervisor");
  const supabase = await createClient();

  const nome = String(formData.get("nome") || "").trim();
  const cliente = String(formData.get("cliente") || "").trim();

  if (!nome) return { error: "Informe o nome da obra." };

  const { error } = await supabase
    .schema("obras")
    .from("obras")
    .insert({ nome, cliente: cliente || null });

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
