"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePerfil } from "@/lib/auth";
import { SAIDA, MOTIVOS_BALCAO } from "@/lib/constants";

const MAX_ASSINATURA_BYTES = 2 * 1024 * 1024; // 2 MB — assinatura real tem dezenas de KB

// Confirma que o buffer comeca com o magic number de PNG (89 50 4E 47).
function ehPng(buf: Buffer): boolean {
  return buf.length >= 4 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

export async function registrarMovimentacao(formData: FormData) {
  await requirePerfil("supervisor", "almoxarife");
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
  await requirePerfil("supervisor", "almoxarife");
  const supabase = await createClient();
  const admin    = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const colaborador_id = String(formData.get("colaborador_id") || "").trim();
  const obra_id        = String(formData.get("obra_id") || "").trim();
  const motivo         = String(formData.get("motivo") || "Entrega").trim();
  const observacao     = String(formData.get("observacao") || "").trim() || null;
  const assinaturaB64  = String(formData.get("assinatura_base64") || "").trim();
  const itensJson      = String(formData.get("itens_json") || "[]");

  if (!MOTIVOS_BALCAO.includes(motivo))
    return { error: "Motivo invalido para o fluxo de balcao." };
  if (!colaborador_id || !obra_id)
    return { error: "Preencha colaborador e obra." };
  // Entrega e Substituicao exigem assinatura (NR-06)
  if (!assinaturaB64)
    return { error: "Assinatura do colaborador e obrigatoria." };

  let itens: { epi_id: string; quantidade: number }[];
  try {
    const parsed = JSON.parse(itensJson);
    if (!Array.isArray(parsed)) {
      return { error: "Lista de itens invalida." };
    }
    itens = parsed;
  } catch {
    return { error: "Lista de itens invalida." };
  }
  itens = itens.filter((i) => i.epi_id && i.quantidade > 0);
  if (itens.length === 0)
    return { error: "Adicione pelo menos um EPI." };

  // Uma assinatura cobre a lista toda — upload unico, URL compartilhada
  let assinaturaUrl: string | null = null;
  const loteId = crypto.randomUUID();
  try {
    const b64 = assinaturaB64.replace(/^data:image\/png;base64,/, "");
    const buf = Buffer.from(b64, "base64");
    if (buf.length === 0 || buf.length > MAX_ASSINATURA_BYTES) {
      return { error: "Assinatura invalida ou muito grande." };
    }
    if (!ehPng(buf)) {
      return { error: "Assinatura em formato invalido." };
    }
    const storagePath = `${colaborador_id}/${loteId}.png`;
    await admin.storage.from("assinaturas").upload(storagePath, buf, {
      contentType: "image/png",
      upsert: true,
    });
    // URL publica — admin client retorna URL interna que browser nao acessa
    assinaturaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL +
      "/storage/v1/object/public/assinaturas/" + storagePath;
  } catch {
    return { error: "Falha ao salvar a assinatura. Tente novamente." };
  }

  const linhas = itens.map((i) => ({
    obra_id,
    epi_id: i.epi_id,
    colaborador_id,
    motivo,
    quantidade: -Math.abs(i.quantidade),
    observacao,
    criado_por: user?.id ?? null,
    assinatura_url: assinaturaUrl,
  }));

  const { error } = await supabase.schema("epi").from("movimentacoes").insert(linhas);
  if (error) return { error: error.message };

  revalidatePath("/movimentacoes");
  redirect("/colaboradores/" + colaborador_id);
}
