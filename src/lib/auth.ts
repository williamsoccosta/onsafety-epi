import { createClient } from "./supabase/server";
import { redirect } from "next/navigation";
import type { Perfil, PerfilUsuario } from "./types";
export type { Perfil, PerfilUsuario };
export { LABELS_PERFIL } from "./types";

export async function getPerfilAtual(): Promise<PerfilUsuario | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("perfis")
      .select("perfil, colaborador_id, nome")
      .eq("id", user.id)
      .single();

    if (!data) return null;

    return {
      user_id: user.id,
      email: user.email ?? "",
      nome: data.nome,
      perfil: data.perfil as Perfil,
      colaborador_id: data.colaborador_id,
    };
  } catch {
    return null;
  }
}

export async function requirePerfil(...perfis: Perfil[]): Promise<PerfilUsuario> {
  const p = await getPerfilAtual();
  if (!p || !perfis.includes(p.perfil)) redirect("/");
  return p;
}

export function podeRegistrarMovimentacao(p: Perfil) {
  return ["supervisor", "almoxarife", "tecnico_seguranca"].includes(p);
}
export function podeCadastrarColaborador(p: Perfil) {
  return ["supervisor", "administrativo"].includes(p);
}
export function podeCadastrarObra(p: Perfil) { return p === "supervisor"; }
export function podeGerenciarUsuarios(p: Perfil) { return p === "supervisor"; }
