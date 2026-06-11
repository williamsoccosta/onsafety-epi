export type Perfil =
  | "supervisor"
  | "almoxarife"
  | "administrativo"
  | "tecnico_seguranca"
  | "colaborador";

export type PerfilUsuario = {
  user_id: string;
  email: string;
  nome: string | null;
  perfil: Perfil;
  colaborador_id: string | null;
};

export const LABELS_PERFIL: Record<Perfil, string> = {
  supervisor: "Supervisor",
  almoxarife: "Almoxarife",
  administrativo: "Administrativo",
  tecnico_seguranca: "Tec. Seguranca",
  colaborador: "Colaborador",
};
