"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePerfil } from "@/lib/auth";

export async function criarEPI(formData: FormData) {
  await requirePerfil("supervisor", "almoxarife");
  const supabase = await createClient();

  const nome = String(formData.get("nome") || "").trim();
  const complemento = String(formData.get("complemento") || "").trim() || null;
  const ca = String(formData.get("ca") || "").trim() || null;
  const ca_validade = String(formData.get("ca_validade") || "").trim() || null;
  const vida_util_dias = formData.get("vida_util_dias") ? parseInt(String(formData.get("vida_util_dias"))) : null;
  const limite_por_entrega = formData.get("limite_por_entrega") ? parseInt(String(formData.get("limite_por_entrega"))) : null;

  if (!nome) return { error: "Nome obrigatório." };

  const { error } = await supabase
    .schema("epi")
    .from("itens")
    .insert({ nome, complemento, ca, ca_validade, vida_util_dias, limite_por_entrega });

  if (error) return { error: error.message };
  revalidatePath("/epis");
  return { error: null };
}

export async function alternarAtivoEPI(id: string, ativo: boolean) {
  "use server";
  await requirePerfil("supervisor", "almoxarife");
  const supabase = await createClient();
  await supabase.schema("epi").from("itens").update({ ativo: !ativo }).eq("id", id);
  revalidatePath("/epis");
}

export async function atualizarParametrosEPI(id: string, formData: FormData) {
  await requirePerfil("supervisor", "almoxarife");
  const supabase = await createClient();

  const parse = (k: string) => {
    const v = String(formData.get(k) || "").trim();
    if (!v) return null;
    const n = parseInt(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const { error } = await supabase.schema("epi").from("itens").update({
    vida_util_dias: parse("vida_util_dias"),
    limite_por_entrega: parse("limite_por_entrega"),
    estoque_minimo: parse("estoque_minimo"),
  }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/epis");
  revalidatePath("/trocas");
  return { error: null };
}
