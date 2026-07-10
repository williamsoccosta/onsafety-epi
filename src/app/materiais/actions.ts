"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePerfil } from "@/lib/auth";

export async function cadastrarInsumo(formData: FormData) {
  await requirePerfil("supervisor", "tecnico_seguranca");
  const supabase = await createClient();

  const segmento_id = String(formData.get("segmento_id") || "").trim();
  const categoria_id = String(formData.get("categoria_id") || "").trim();
  const tipo_id = String(formData.get("tipo_id") || "").trim();
  const nome = String(formData.get("nome") || "").trim();

  if (!segmento_id || !categoria_id || !tipo_id) {
    return { error: "Selecione segmento, categoria e tipo." };
  }
  if (!nome) {
    return { error: "Nome do insumo e obrigatorio." };
  }

  const caracteristicas: Record<string, unknown> = {};
  const diametro = String(formData.get("diametro") || "").trim();
  if (diametro && diametro !== "0" && diametro !== "0,00") {
    caracteristicas.diametro = { valor: parseFloat(diametro) || diametro, unidade: String(formData.get("unidade_diametro") || "-") };
  }
  const espessura = String(formData.get("espessura") || "").trim();
  if (espessura && espessura !== "0" && espessura !== "0,00") {
    caracteristicas.espessura = { valor: parseFloat(espessura) || espessura, unidade: String(formData.get("unidade_espessura") || "-") };
  }
  const largura = String(formData.get("largura") || "").trim();
  if (largura && largura !== "0" && largura !== "0,00") {
    caracteristicas.largura = { valor: parseFloat(largura) || largura, unidade: String(formData.get("unidade_largura") || "-") };
  }
  const comprimento = String(formData.get("comprimento") || "").trim();
  if (comprimento && comprimento !== "0" && comprimento !== "0,00") {
    caracteristicas.comprimento = { valor: parseFloat(comprimento) || comprimento, unidade: String(formData.get("unidade_comprimento") || "-") };
  }
  const capacidade = String(formData.get("capacidade") || "").trim();
  if (capacidade && capacidade !== "0" && capacidade !== "0,00") {
    caracteristicas.capacidade = { valor: parseFloat(capacidade) || capacidade, unidade: String(formData.get("unidade_capacidade") || "-") };
  }
  const outras = String(formData.get("outras_caracteristicas") || "").trim();
  if (outras) caracteristicas.outras = outras;
  const preview_erp = String(formData.get("preview_erp") || "").trim();
  if (preview_erp) caracteristicas.preview_erp = preview_erp;

  const payload: Record<string, unknown> = {
    segmento_id,
    categoria_id,
    tipo_id,
    nome,
    nome_gerado: preview_erp || null,
    marca: String(formData.get("marca") || "").trim() || null,
    material_acabamento: String(formData.get("material_acabamento") || "").trim() || null,
    info_adicional: String(formData.get("info_adicional") || "").trim() || null,
    caracteristicas_tecnicas: Object.keys(caracteristicas).length > 0 ? caracteristicas : {},
    apresentacao: String(formData.get("apresentacao") || "UNIDADE").trim(),
    grupo_insumo: String(formData.get("grupo_insumo") || "").trim() || null,
    unidade_erp: String(formData.get("unidade_erp") || "un").trim(),
    valor: formData.get("valor") ? parseFloat(String(formData.get("valor"))) : null,
    controla_estoque: formData.get("controla_estoque") === "1",
    tipo_controle: String(formData.get("tipo_controle") || "").trim() || null,
    tipo_pagamento: String(formData.get("tipo_pagamento") || "").trim() || null,
  };

  const subtipo_id = String(formData.get("subtipo_id") || "").trim();
  if (subtipo_id) payload.subtipo_id = subtipo_id;

  const ficha_tecnica_id = String(formData.get("ficha_tecnica_id") || "").trim();
  if (ficha_tecnica_id) payload.ficha_tecnica_id = ficha_tecnica_id;

  const { error } = await supabase.schema("core").from("insumos").insert(payload);
  if (error) return { error: error.message };

  revalidatePath("/materiais");
  return { error: null };
}

export async function cadastrarItemHierarquia(formData: FormData) {
  await requirePerfil("supervisor");
  const supabase = await createClient();

  const nivel = String(formData.get("nivel") || "").trim();
  const nome = String(formData.get("nome") || "").trim();

  if (!nome) return { error: "Nome e obrigatorio." };

  const slug = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  let error;

  if (nivel === "segmentos") {
    ({ error } = await supabase.schema("catalogo").from("segmentos").insert({ nome, slug }));
  } else if (nivel === "categorias") {
    const segmento_id = String(formData.get("parent_id") || "").trim();
    if (!segmento_id) return { error: "Selecione o segmento." };
    ({ error } = await supabase.schema("catalogo").from("categorias").insert({ nome, slug, segmento_id }));
  } else if (nivel === "tipos") {
    const categoria_id = String(formData.get("parent_id") || "").trim();
    if (!categoria_id) return { error: "Selecione a categoria." };
    ({ error } = await supabase.schema("catalogo").from("tipos").insert({ nome, categoria_id }));
  } else {
    return { error: "Nivel invalido." };
  }

  if (error) {
    if (error.code === "23505") return { error: "Ja existe um item com este nome." };
    return { error: error.message };
  }

  revalidatePath("/materiais/hierarquia");
  revalidatePath("/materiais");
  return { error: null };
}

export async function toggleAtivoHierarquia(nivel: string, id: string, ativo: boolean) {
  await requirePerfil("supervisor");
  const supabase = await createClient();
  const table = nivel === "segmentos" ? "segmentos" : nivel === "categorias" ? "categorias" : "tipos";
  await supabase.schema("catalogo").from(table).update({ ativo: !ativo }).eq("id", id);
  revalidatePath("/materiais/hierarquia");
  revalidatePath("/materiais");
}

export async function toggleValidadoHierarquia(nivel: string, id: string, validado: boolean) {
  await requirePerfil("supervisor");
  const supabase = await createClient();
  const table = nivel === "segmentos" ? "segmentos" : nivel === "categorias" ? "categorias" : "tipos";
  await supabase.schema("catalogo").from(table).update({ validado: !validado }).eq("id", id);
  revalidatePath("/materiais/hierarquia");
}
