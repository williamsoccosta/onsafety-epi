import { requirePerfil } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CabecalhoPagina } from "@/components/page-header";
import { CriarUsuarioForm } from "./criar-form";
import { LABELS_PERFIL } from "@/lib/types";
import type { Perfil } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  await requirePerfil("supervisor");

  const admin = createAdminClient();
  const { data: perfis } = await admin
    .from("perfis")
    .select("id, perfil, nome, colaborador_id, criado_em")
    .order("criado_em");

  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(users.map((u) => [u.id, u.email ?? ""]));

  const lista = (perfis ?? []).map((p) => ({
    ...p,
    email: emailMap.get(p.id) ?? "",
  }));

  return (
    <main>
      <CabecalhoPagina
        titulo="Usuarios"
        subtitulo="Gestao de acessos ao sistema"
        contagem={lista.length}
        rotulo="usuarios"
      />
      <div className="px-4 sm:px-8 py-6 space-y-6">
        <CriarUsuarioForm />

        <section className="rounded-lg border overflow-x-auto" style={{ borderColor: "var(--line)" }}>
          <table className="w-full min-w-[640px] text-[13px] border-collapse">
            <thead>
              <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
                {["Nome", "E-mail", "Perfil", "Criado em"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-left"
                    style={{ color: "var(--ink-tertiary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((u, i) => (
                <tr key={u.id}
                  style={{ background: i % 2 === 0 ? "var(--surface-raised)" : "var(--surface)", borderBottom: "1px solid var(--line-soft)" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>{u.nome ?? "—"}</td>
                  <td className="px-4 py-3" style={{ color: "var(--ink-secondary)" }}>{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                      {LABELS_PERFIL[u.perfil as Perfil]}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular text-[12px]" style={{ color: "var(--ink-tertiary)" }}>
                    {new Date(u.criado_em).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-[13px]"
                  style={{ color: "var(--ink-muted)" }}>Nenhum usuario cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
