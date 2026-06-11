"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePerfil } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function criarUsuario(formData: FormData) {
  await requirePerfil("supervisor");

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const nome = String(formData.get("nome") || "").trim() || null;
  const perfil = String(formData.get("perfil") || "").trim();
  const colaborador_id = String(formData.get("colaborador_id") || "").trim() || null;

  if (!email || !password || !perfil) return { error: "Preencha e-mail, senha e perfil." };

  const admin = createAdminClient();

  const { data: { user }, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authErr || !user) return { error: authErr?.message ?? "Erro ao criar usuario GoTrue." };

  const { error: perfilErr } = await admin.from("perfis").insert({
    id: user.id,
    perfil,
    nome,
    colaborador_id,
  });

  if (perfilErr) {
    await admin.auth.admin.deleteUser(user.id);
    return { error: perfilErr.message };
  }

  revalidatePath("/usuarios");
  return { error: null };
}
