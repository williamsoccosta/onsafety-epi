"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePerfil } from "@/lib/auth";
import { cpfValido, limparCpf } from "@/lib/cpf";

export async function criarFuncionario(formData: FormData) {
  await requirePerfil("supervisor", "administrativo");
  const supabase = await createClient();

  const nome = String(formData.get("nome") || "").trim();
  const cpf = limparCpf(String(formData.get("cpf") || ""));

  if (!nome || !cpf) return { error: "Nome e CPF sao obrigatorios." };
  if (!cpfValido(cpf)) return { error: "CPF invalido — confira os digitos." };

  const documentos: Record<string, unknown> = {};
  const ctpsNumero = String(formData.get("ctps_numero") || "").trim();
  if (ctpsNumero) {
    documentos.ctps = {
      numero: ctpsNumero,
      serie: String(formData.get("ctps_serie") || "").trim(),
      uf: String(formData.get("ctps_uf") || "").trim(),
      pis_pasep: String(formData.get("pis_pasep") || "").trim(),
    };
  }
  const rgNumero = String(formData.get("rg_numero") || "").trim();
  if (rgNumero) {
    documentos.rg = {
      numero: rgNumero,
      orgao_emissor: String(formData.get("rg_orgao") || "").trim(),
      uf: String(formData.get("rg_uf") || "").trim(),
      data_expedicao: String(formData.get("rg_expedicao") || "").trim() || null,
    };
  }

  const endereco: Record<string, string> = {};
  const cep = String(formData.get("cep") || "").trim();
  if (cep) {
    endereco.cep = cep;
    endereco.logradouro = String(formData.get("logradouro") || "").trim();
    endereco.numero = String(formData.get("numero") || "").trim();
    endereco.complemento = String(formData.get("complemento") || "").trim();
    endereco.bairro = String(formData.get("bairro") || "").trim();
    endereco.municipio = String(formData.get("municipio") || "").trim();
    endereco.uf = String(formData.get("endereco_uf") || "").trim();
  }

  const dadosBancarios: Record<string, unknown> = {};
  const banco = String(formData.get("banco") || "").trim();
  if (banco) {
    dadosBancarios.principal = {
      banco,
      agencia: String(formData.get("agencia") || "").trim(),
      agencia_digito: String(formData.get("agencia_digito") || "").trim(),
      conta: String(formData.get("conta") || "").trim(),
      conta_digito: String(formData.get("conta_digito") || "").trim(),
      tipo: String(formData.get("conta_tipo") || "corrente").trim(),
      pix: String(formData.get("pix") || "").trim(),
    };
    dadosBancarios.outras_contas = [];
    dadosBancarios.outros_pix = [];
  }

  const payload = {
    cpf,
    nome,
    sexo: formData.get("sexo") || null,
    data_nascimento: formData.get("data_nascimento") || null,
    raca: formData.get("raca") || null,
    nacionalidade: String(formData.get("nacionalidade") || "Brasileira").trim(),
    naturalidade: String(formData.get("naturalidade") || "").trim() || null,
    grau_instrucao: formData.get("grau_instrucao") || null,
    nome_pai: String(formData.get("nome_pai") || "").trim() || null,
    nome_mae: String(formData.get("nome_mae") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    telefone: String(formData.get("telefone") || "").trim() || null,
    estado_civil: formData.get("estado_civil") || null,
    regime_casamento: String(formData.get("regime_casamento") || "").trim() || null,
    data_casamento: formData.get("data_casamento") || null,
    documentos: Object.keys(documentos).length > 0 ? documentos : {},
    endereco: Object.keys(endereco).length > 0 ? endereco : {},
    dados_bancarios: Object.keys(dadosBancarios).length > 0 ? dadosBancarios : {},
  };

  const { error } = await supabase.schema("rh").from("funcionarios").insert(payload);

  if (error) {
    if (error.code === "23505") return { error: "CPF ja cadastrado." };
    return { error: error.message };
  }

  const colaboradorId = formData.get("colaborador_id");
  if (colaboradorId) {
    const { data: inserted } = await supabase
      .schema("rh")
      .from("funcionarios")
      .select("id")
      .eq("cpf", cpf)
      .single();
    if (inserted) {
      await supabase
        .schema("epi")
        .from("colaboradores")
        .update({ pessoa_id: inserted.id })
        .eq("id", String(colaboradorId));
      revalidatePath("/colaboradores/" + colaboradorId);
    }
  }

  revalidatePath("/rh");
  return { error: null };
}

export async function vincularFuncionario(colaboradorId: string, funcionarioId: string) {
  await requirePerfil("supervisor", "administrativo");
  const supabase = await createClient();

  const { error } = await supabase
    .schema("epi")
    .from("colaboradores")
    .update({ pessoa_id: funcionarioId })
    .eq("id", colaboradorId);

  if (error) return { error: error.message };

  revalidatePath("/colaboradores/" + colaboradorId);
  revalidatePath("/rh");
  return { error: null };
}

export async function desvincularFuncionario(colaboradorId: string) {
  await requirePerfil("supervisor", "administrativo");
  const supabase = await createClient();

  const { error } = await supabase
    .schema("epi")
    .from("colaboradores")
    .update({ pessoa_id: null })
    .eq("id", colaboradorId);

  if (error) return { error: error.message };

  revalidatePath("/colaboradores/" + colaboradorId);
  return { error: null };
}
