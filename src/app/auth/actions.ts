"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();
  if (!email || !password) return { error: "Preencha e-mail e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "E-mail ou senha incorretos." };

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function salvarAssinatura(
  movimentacaoId: string,
  colaboradorId: string,
  assinaturaUrl: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .schema("epi")
    .from("movimentacoes")
    .update({ assinatura_url: assinaturaUrl })
    .eq("id", movimentacaoId)
    .eq("colaborador_id", colaboradorId);
  if (error) return { error: error.message };
  revalidatePath("/colaboradores/" + colaboradorId);
  return { error: null };
}

export async function apagarAssinatura(movimentacaoId: string, colaboradorId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .schema("epi")
    .from("movimentacoes")
    .update({ assinatura_url: null })
    .eq("id", movimentacaoId)
    .eq("colaborador_id", colaboradorId);
  if (error) return { error: error.message };
  revalidatePath("/colaboradores/" + colaboradorId);
  return { error: null };
}
