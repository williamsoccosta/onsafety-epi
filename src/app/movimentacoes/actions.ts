"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// motivos que reduzem estoque (sinal negativo)
const SAIDA = ["Entrega", "Devolucao", "Substituicao"];

export async function registrarMovimentacao(formData: FormData) {
  const supabase = await createClient();

  const obra_id = String(formData.get("obra_id") || "").trim();
  const epi_id = String(formData.get("epi_id") || "").trim();
  const motivo = String(formData.get("motivo") || "").trim();
  const colaborador_id = String(formData.get("colaborador_id") || "").trim() || null;
  const qtd_raw = parseInt(String(formData.get("quantidade") || "0"));
  const observacao = String(formData.get("observacao") || "").trim() || null;

  if (!obra_id || !epi_id || !motivo || !qtd_raw || qtd_raw <= 0) {
    return { error: "Preencha obra, EPI, motivo e quantidade." };
  }
  if (motivo === "Entrega" && !colaborador_id) {
    return { error: "Entrega requer colaborador." };
  }

  // sinal: saidas sao negativas, entradas positivas
  const quantidade = SAIDA.includes(motivo) ? -qtd_raw : qtd_raw;

  const { error } = await supabase.schema("epi").from("movimentacoes").insert({
    obra_id,
    epi_id,
    colaborador_id,
    motivo,
    quantidade,
    observacao,
  });

  if (error) return { error: error.message };
  revalidatePath("/movimentacoes");
  return { error: null };
}
