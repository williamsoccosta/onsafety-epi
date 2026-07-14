-- Hub de sincronizacao de Pessoas Fisicas — tabela de mapa de IDs
-- Ver docs/prd-hub-pessoas-fisicas.md (escopo) e docs/regras-negocio-hub-pessoas-fisicas.md (regra 9).
-- APLICADO em producao em 2026-07-14 (via psql -U supabase_admin, dono do schema core —
-- "postgres" NAO tem CREATE em core, so em rh; ver nota abaixo antes de reaplicar).
-- Continua sendo uma PROPOSTA de schema: quando o adapter uau-pessoas for de fato codado
-- no repo ExternalAdapter (fora deste repositorio, nao consultado ao desenhar isto), revisar
-- contra o uso real, especialmente a semantica de "radar_id" (ver comentario na coluna).
--
-- Precedente verificado (2026-07-14): o hub de empresas NAO usa uma tabela de mapa —
-- core.empresas tem so a coluna "codigo_erp" (1 sistema externo, o UAU). Pessoas precisa
-- rastrear 3 sistemas (kamino, uau, radar) simultaneamente, entao uma tabela dedicada e
-- mais adequada aqui — mas isso e desenho novo, nao copia de um padrao existente.
--
-- IMPORTANTE para reaplicar: rodar como "supabase_admin" (dono do schema core), nao
-- "postgres" (dono so do schema rh) — "postgres -U postgres" da "permission denied for
-- schema core" mesmo sendo superusuario nomeado, porque nao e dono nem tem grant explicito.

CREATE TABLE IF NOT EXISTS core.pessoas_ids_mapa (
  cpf          text PRIMARY KEY,
  core_id      uuid NOT NULL REFERENCES rh.funcionarios(id),
  kamino_id    text,             -- fica NULL enquanto o adapter kamino-pessoas for stub dormente (regra 8)
  uau_id       text,
  radar_id     text,             -- semantica a confirmar com quem codar o adapter radar: ID interno do Radar
                                  -- apos import manual do .csv, ou so um marcador de "ja exportado"?
  criado_em    timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE core.pessoas_ids_mapa IS
  'Mapa de IDs por pessoa fisica entre core (rh.funcionarios), Kamino, UAU e Radar, chaveado por CPF. Sincronizacao parcial (alguns IDs NULL) e estado normal, nao erro — ver regra 9 de docs/regras-negocio-hub-pessoas-fisicas.md.';

CREATE OR REPLACE FUNCTION core.pessoas_ids_mapa_atualizado_em() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pessoas_ids_mapa_atualizado_em ON core.pessoas_ids_mapa;
CREATE TRIGGER trg_pessoas_ids_mapa_atualizado_em
  BEFORE UPDATE ON core.pessoas_ids_mapa
  FOR EACH ROW EXECUTE FUNCTION core.pessoas_ids_mapa_atualizado_em();

-- Acesso: mesma role dedicada aos adapters de pessoa criada em hub-pessoas-view-role.sql
-- (svc_hub_pessoas) — sem grant a service_role/anon, mesmo racional da dúvida global 2.
GRANT USAGE ON SCHEMA core TO svc_hub_pessoas;
GRANT SELECT, INSERT, UPDATE ON core.pessoas_ids_mapa TO svc_hub_pessoas;
