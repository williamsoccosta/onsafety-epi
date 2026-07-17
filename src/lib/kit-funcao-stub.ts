// TODO(dev-master): substituir por query real de epi.kit_funcao quando a
// tabela existir (ver plans/006-kit-funcao-schema.md)

export type KitItemStatus = "pendente" | "entregue";

export type KitItem = {
  epi_id: string;
  nome: string; // rótulo já resolvido, formato igual a epiLabel() em entrega-form.tsx
  status: KitItemStatus;
};

export type KitFuncaoResultado =
  | { estado: "sem-kit" }
  | { estado: "erro"; mensagem: string }
  | { estado: "encontrado"; itens: KitItem[] };

/**
 * Busca o kit sugerido para uma função. Assinatura async porque a
 * implementação real (plan 006) faz uma chamada Supabase; o stub resolve
 * de forma síncrona embrulhada em Promise para já forçar os call sites a
 * tratar loading corretamente.
 */
export async function buscarKitPorFuncao(
  funcao: string | null,
  colaboradorId: string
): Promise<KitFuncaoResultado> {
  // Stub determinístico — sem chamada de rede, sem tabela real.
  // Troca de estado feita manualmente durante o desenvolvimento visual;
  // plan 006 substitui o corpo inteiro por uma query real mantendo a
  // assinatura acima.
  if (!funcao) return { estado: "sem-kit" };
  return { estado: "sem-kit" };
}
