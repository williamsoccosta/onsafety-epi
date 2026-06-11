// Motivos de movimentacao de EPI.
// IMPORTANTE: sem acentos — alinhado a um CHECK constraint no Postgres
// (ver scripts/ e CONTEXT.md). Nao altere a grafia sem mudar a constraint.
export const MOTIVOS = [
  "Entrada",
  "Quantidade Inicial",
  "Entrega",
  "Substituicao",
  "Devolucao",
] as const;

// Motivos que reduzem o estoque (quantidade negativa).
export const SAIDA = ["Entrega", "Devolucao", "Substituicao"] as const;

// Motivos do fluxo de balcao que exigem assinatura do colaborador (NR-06).
export const MOTIVOS_BALCAO = ["Entrega", "Substituicao"] as const;
