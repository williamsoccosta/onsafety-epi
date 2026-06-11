"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SAIDA = ["Entrega", "Devolucao", "Substituicao"];
// Motivos do fluxo de balcao — exigem assinatura do colaborador
const MOTIVOS_BALCAO = ["Entrega", "Substituicao"];

export async function registrarMovimentacao(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const obra_id        = String(formData.get("obra_id") || "").trim();
  const epi_id         = String(formData.get("epi_id") || "").trim();
  const motivo         = String(formData.get("motivo") || "").trim();
  const colaborador_id = String(formData.get("colaborador_id") || "").trim() || null;
  const qtd_raw        = parseInt(String(formData.get("quantidade") || "0"));
  const observacao     = String(formData.get("observacao") || "").trim() || null;

  if (!obra_id || !epi_id || !motivo || !qtd_raw || qtd_raw <= 0)
    return { error: "Preencha obra, EPI, motivo e quantidade." };
  if (motivo === "Entrega" && !colaborador_id)
    return { error: "Entrega requer colaborador." };

  const quantidade = SAIDA.includes(motivo) ? -qtd_raw : qtd_raw;

  const { error } = await supabase.schema("epi").from("movimentacoes").insert({
    obra_id, epi_id, colaborador_id, motivo, quantidade, observacao,
    criado_por: user?.id ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath("/movimentacoes");
  return { error: null };
}

export async function registrarEntregaComAssinatura(formData: FormData) {
  const supabase = await createClient();
  const admin    = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const colaborador_id = String(formData.get("colaborador_id") || "").trim();
  const epi_id         = String(formData.get("epi_id") || "").trim();
  const obra_id        = String(formData.get("obra_id") || "").trim();
  const motivo         = String(formData.get("motivo") || "Entrega").trim();
  const qtd            = parseInt(String(formData.get("quantidade") || "1"));
  const observacao     = String(formData.get("observacao") || "").trim() || null;
  const assinaturaB64  = String(formData.get("assinatura_base64") || "").trim();

  if (!MOTIVOS_BALCAO.includes(motivo))
    return { error: "Motivo invalido para o fluxo de balcao." };
  if (!colaborador_id || !epi_id || !obra_id || !qtd || qtd <= 0)
    return { error: "Preencha todos os campos obrigatorios." };
  // Entrega e Substituicao exigem assinatura (NR-06)
  if (!assinaturaB64)
    return { error: "Assinatura do colaborador e obrigatoria." };

  const { data: mov, error } = await supabase
    .schema("epi").from("movimentacoes")
    .insert({
      obra_id, epi_id, colaborador_id, motivo, quantidade: -qtd, observacao,
      criado_por: user?.id ?? null,
    })
    .select("id").single();

  if (error) return { error: error.message };

  if (mov?.id) {
    try {
      const b64 = assinaturaB64.replace(/^data:image\/png;base64,/, "");
      const buf = Buffer.from(b64, "base64");
      const storagePath = `${colaborador_id}/${mov.id}.png`;

      await admin.storage.from("assinaturas").upload(storagePath, buf, {
        contentType: "image/png",
        upsert: true,
      });

      // URL publica — admin client retorna URL interna que browser nao acessa
      const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL +
        "/storage/v1/object/public/assinaturas/" + storagePath;

      await supabase.schema("epi").from("movimentacoes")
        .update({ assinatura_url: publicUrl })
        .eq("id", mov.id);
    } catch (_) {
      // assinatura falhou mas movimentacao foi registrada
    }
  }

  revalidatePath("/movimentacoes");
  redirect("/colaboradores/" + colaborador_id);
}
