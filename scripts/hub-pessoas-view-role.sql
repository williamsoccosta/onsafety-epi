-- Hub de sincronizacao de Pessoas Fisicas — view restrita + role dedicada (rascunho)
-- Ver docs/regras-negocio-hub-pessoas-fisicas.md, regra 20 / duvida global 2.
-- NAO APLICADO ainda — pendente sign-off de seguranca antes de rodar em producao.
-- Executar como superusuario (postgres/supabase_admin, com BYPASSRLS) para que a view
-- herde o bypass do dono e nao exija grants diretos em rh.funcionarios para os adapters.

-- Trava de seguranca: sem BYPASSRLS, a view abaixo passaria a respeitar a RLS
-- de rh.funcionarios e svc_hub_pessoas leria 0 linhas silenciosamente (sem erro),
-- o que o adapter uau-pessoas interpretaria como "ninguem cadastrado".
DO $$
BEGIN
  IF NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'Execute este script como um papel com BYPASSRLS (ex.: postgres/supabase_admin) — % nao tem esse atributo', current_user;
  END IF;
END $$;

-- ── View: so os campos que os adapters de pessoa precisam pra reconciliar ───
-- Nunca expor "documentos" (CTPS/RG/CNH) nem "dados_bancarios" — os adapters
-- (uau-pessoas, kamino-pessoas, radar) so casam registro por CPF e comparam
-- nome/telefone/email, igual ao conjunto "basico" da regra 5 do PRD.
CREATE OR REPLACE VIEW rh.funcionarios_sync AS
SELECT
  id,
  cpf,
  nome,
  telefone,
  email
FROM rh.funcionarios;

COMMENT ON VIEW rh.funcionarios_sync IS
  'Projecao somente-leitura de rh.funcionarios para os adapters do hub de pessoas (uau-pessoas, kamino-pessoas, radar). Nao inclui documentos nem dados_bancarios.';

-- ── Role dedicada aos adapters de pessoa (nao usar service_role/anon) ───────
-- LOGIN/senha ou associacao ao "role" claim do JWT do PostgREST fica a cargo
-- de quem for configurar o adapter — aqui so criamos o papel e os grants.
-- Nao usar DROP ROLE + CREATE ROLE: assim que a role ganhar outros grants (ex.:
-- na tabela de mapa de IDs, ver TODO no fim do arquivo), o DROP passa a falhar
-- ("role cannot be dropped because some objects depend on it") e reaplicar este
-- script quebraria o deploy. Criar so se ainda nao existir.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'svc_hub_pessoas') THEN
    CREATE ROLE svc_hub_pessoas NOLOGIN NOINHERIT;
  END IF;
END $$;

-- Necessario para o PostgREST trocar de papel via "role" claim do JWT
-- (mesmo mecanismo usado por authenticated/service_role no Supabase).
GRANT svc_hub_pessoas TO authenticator;

GRANT USAGE ON SCHEMA rh TO svc_hub_pessoas;
GRANT SELECT ON rh.funcionarios_sync TO svc_hub_pessoas;

-- Garante um estado inicial limpo (sem grant residual de execucao anterior).
-- Isto NAO impede que um GRANT futuro em rh.funcionarios conceda acesso amplo —
-- e so uma revogacao pontual neste momento, nao uma protecao estrutural. Se
-- alguem replicar o padrao do hub-empresas aqui depois, precisa revisar de novo.
REVOKE ALL ON rh.funcionarios FROM svc_hub_pessoas;

-- ── Pendente ─────────────────────────────────────────────────────────────
-- Escrita da tabela de mapa de IDs (core/kamino/uau/radar por CPF, ver PRD) ainda
-- nao tem schema definido neste repo — adicionar GRANT INSERT/UPDATE especifico
-- para svc_hub_pessoas quando essa tabela for criada, sem tocar em rh.funcionarios.
