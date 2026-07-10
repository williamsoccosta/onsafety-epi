"use server";

import { getPerfilAtual } from "@/lib/auth";

// Base do adapter services/empresas (faab-data-engineering). Alcancado por
// loopback interno na VPS (a porta 8080 e publicada so em 127.0.0.1 — ADR 0006),
// nunca pelo navegador. Toda a operacao (BrasilAPI, fila de aprovacao, gravacao
// futura em core.empresas) continua no adapter — aqui so consumimos a interface.
const EMPRESAS_SERVICE_URL =
  process.env.EMPRESAS_SERVICE_URL ?? "http://127.0.0.1:8080";

// Espelha os campos que consulta_cnpj.py retorna da BrasilAPI (subconjunto exibido).
export type DadosEmpresa = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  cnae_fiscal_descricao?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
};

export type ResultadoConsulta =
  | { ok: false; erro: string }
  | {
      ok: true;
      // Mesmos estados do formulario publico (services/empresas/main.py):
      status:
        | "ja_cadastrada"
        | "aprovacao_pendente"
        | "aguardando_processamento"
        | "solicitacao_registrada";
      resultado?: DadosEmpresa;
    };

export async function consultarCnpj(cnpj: string): Promise<ResultadoConsulta> {
  // Defesa server-side: mesma regra do card/menu (supervisor + administrativo).
  const perfil = await getPerfilAtual();
  if (!perfil || !["supervisor", "administrativo"].includes(perfil.perfil)) {
    return { ok: false, erro: "Sem permissao para cadastrar empresas." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const resp = await fetch(`${EMPRESAS_SERVICE_URL}/api/cnpj`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ cnpj }),
      signal: controller.signal,
      cache: "no-store",
    });

    const data = await resp.json().catch(() => null);

    // 422 (CNPJ invalido ou nao encontrado na Receita) → { erro }
    if (!resp.ok) {
      const msg =
        (data && typeof data.erro === "string" && data.erro) ||
        `Falha ao consultar (HTTP ${resp.status}).`;
      return { ok: false, erro: msg };
    }

    if (!data || typeof data.status !== "string") {
      return { ok: false, erro: "Resposta inesperada do servico de empresas." };
    }

    return { ok: true, status: data.status, resultado: data.resultado };
  } catch {
    return {
      ok: false,
      erro: "Nao foi possivel contatar o servico de empresas. Tente novamente.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
