-- RLS por perfil — matriz de permissoes do PRD (issue #4)
-- Supervisor: tudo. Almoxarife: movimentacoes + itens. Administrativo: colaboradores.
-- Tecnico de seguranca: somente leitura. Sem perfil: nada.

-- ── epi.movimentacoes ────────────────────────────────────────
DROP POLICY IF EXISTS allow_all_movimentacoes ON epi.movimentacoes;
CREATE POLICY mov_select ON epi.movimentacoes FOR SELECT
  USING (public.perfil_atual() IS NOT NULL);
CREATE POLICY mov_insert ON epi.movimentacoes FOR INSERT
  WITH CHECK (public.perfil_atual() IN ('supervisor','almoxarife'));
CREATE POLICY mov_update ON epi.movimentacoes FOR UPDATE
  USING (public.perfil_atual() IN ('supervisor','almoxarife'))
  WITH CHECK (public.perfil_atual() IN ('supervisor','almoxarife'));
CREATE POLICY mov_delete ON epi.movimentacoes FOR DELETE
  USING (public.perfil_atual() IN ('supervisor','almoxarife'));

-- ── epi.colaboradores ────────────────────────────────────────
DROP POLICY IF EXISTS allow_all_colaboradores ON epi.colaboradores;
CREATE POLICY colab_select ON epi.colaboradores FOR SELECT
  USING (public.perfil_atual() IS NOT NULL);
CREATE POLICY colab_insert ON epi.colaboradores FOR INSERT
  WITH CHECK (public.perfil_atual() IN ('supervisor','administrativo'));
CREATE POLICY colab_update ON epi.colaboradores FOR UPDATE
  USING (public.perfil_atual() IN ('supervisor','administrativo'))
  WITH CHECK (public.perfil_atual() IN ('supervisor','administrativo'));
CREATE POLICY colab_delete ON epi.colaboradores FOR DELETE
  USING (public.perfil_atual() IN ('supervisor','administrativo'));

-- ── epi.itens ────────────────────────────────────────────────
DROP POLICY IF EXISTS allow_all_itens ON epi.itens;
CREATE POLICY itens_select ON epi.itens FOR SELECT
  USING (public.perfil_atual() IS NOT NULL);
CREATE POLICY itens_insert ON epi.itens FOR INSERT
  WITH CHECK (public.perfil_atual() IN ('supervisor','almoxarife'));
CREATE POLICY itens_update ON epi.itens FOR UPDATE
  USING (public.perfil_atual() IN ('supervisor','almoxarife'))
  WITH CHECK (public.perfil_atual() IN ('supervisor','almoxarife'));
CREATE POLICY itens_delete ON epi.itens FOR DELETE
  USING (public.perfil_atual() IN ('supervisor','almoxarife'));

-- ── epi.estoque (escrito pelo trigger de movimentacoes) ──────
DROP POLICY IF EXISTS allow_all_estoque ON epi.estoque;
CREATE POLICY estoque_select ON epi.estoque FOR SELECT
  USING (public.perfil_atual() IS NOT NULL);
CREATE POLICY estoque_write ON epi.estoque FOR ALL
  USING (public.perfil_atual() IN ('supervisor','almoxarife'))
  WITH CHECK (public.perfil_atual() IN ('supervisor','almoxarife'));

-- ── obras.obras ──────────────────────────────────────────────
DROP POLICY IF EXISTS allow_all_obras ON obras.obras;
CREATE POLICY obras_select ON obras.obras FOR SELECT
  USING (public.perfil_atual() IS NOT NULL);
CREATE POLICY obras_insert ON obras.obras FOR INSERT
  WITH CHECK (public.perfil_atual() = 'supervisor');
CREATE POLICY obras_update ON obras.obras FOR UPDATE
  USING (public.perfil_atual() = 'supervisor')
  WITH CHECK (public.perfil_atual() = 'supervisor');
CREATE POLICY obras_delete ON obras.obras FOR DELETE
  USING (public.perfil_atual() = 'supervisor');

-- ── public.perfis: leitura geral para resolver nome do autor ─
DROP POLICY IF EXISTS perfis_leitura_geral ON public.perfis;
CREATE POLICY perfis_leitura_geral ON public.perfis FOR SELECT
  USING (public.perfil_atual() IS NOT NULL);

-- ── Sync do catalogo roda como definer (servico pode nao ter perfil) ─
ALTER FUNCTION epi.sync_itens_from_catalogo() SECURITY DEFINER;
