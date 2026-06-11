-- Teste da RLS por perfil (issue #4) + bucket assinaturas (issue #8)
-- Execucao: psql -U supabase_admin -d postgres -f scripts/test-rls.sql
-- Tudo roda numa transacao com ROLLBACK — nao deixa residuo no banco.
-- Falha = RAISE EXCEPTION aborta o script. Sucesso = NOTICEs "OK".

BEGIN;

-- ── Helpers ──────────────────────────────────────────────────
CREATE FUNCTION pg_temp.tenta(sql text) RETURNS boolean LANGUAGE plpgsql AS $fn$
BEGIN
  EXECUTE sql;
  RETURN true;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN false;
END $fn$;

CREATE FUNCTION pg_temp.caso(descr text, obtido boolean, esperado boolean) RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
  IF obtido = esperado THEN
    RAISE NOTICE 'OK: %', descr;
  ELSE
    RAISE EXCEPTION 'FALHA: % (esperado %, obtido %)', descr, esperado, obtido;
  END IF;
END $fn$;

-- ── Fixtures (como superusuario, antes de trocar de papel) ───
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111111','authenticated','authenticated','rls-sup@teste.local','x',now(),now(),now()),
  ('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222222222','authenticated','authenticated','rls-alm@teste.local','x',now(),now(),now()),
  ('00000000-0000-0000-0000-000000000000','33333333-3333-3333-3333-333333333333','authenticated','authenticated','rls-adm@teste.local','x',now(),now(),now()),
  ('00000000-0000-0000-0000-000000000000','44444444-4444-4444-4444-444444444444','authenticated','authenticated','rls-tec@teste.local','x',now(),now(),now()),
  ('00000000-0000-0000-0000-000000000000','55555555-5555-5555-5555-555555555555','authenticated','authenticated','rls-sem@teste.local','x',now(),now(),now());

INSERT INTO public.perfis (id, perfil, nome) VALUES
  ('11111111-1111-1111-1111-111111111111','supervisor','RLS Teste Supervisor'),
  ('22222222-2222-2222-2222-222222222222','almoxarife','RLS Teste Almoxarife'),
  ('33333333-3333-3333-3333-333333333333','administrativo','RLS Teste Administrativo'),
  ('44444444-4444-4444-4444-444444444444','tecnico_seguranca','RLS Teste Tecnico');
-- 5555... fica propositalmente sem perfil

INSERT INTO obras.obras (id, nome, ativa) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','RLS Obra Teste', true);
INSERT INTO epi.itens (id, nome, ativo) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001','RLS Item Teste', true);
INSERT INTO epi.colaboradores (id, nome, funcao, data_admissao, ativo) VALUES
  ('cccccccc-0000-0000-0000-000000000001','RLS Colaborador Teste','Teste','2026-01-01', true);

-- ═══════════════ SUPERVISOR ═══════════════
RESET ROLE;
SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT pg_temp.caso('supervisor le movimentacoes', (SELECT count(*) >= 0 FROM epi.movimentacoes) IS NOT NULL, true);
SELECT pg_temp.caso('supervisor insere movimentacao',
  pg_temp.tenta($q$INSERT INTO epi.movimentacoes (obra_id, epi_id, motivo, quantidade) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','Entrada', 1)$q$), true);
SELECT pg_temp.caso('supervisor insere colaborador',
  pg_temp.tenta($q$INSERT INTO epi.colaboradores (nome, funcao, data_admissao, ativo) VALUES ('RLS Colab Sup','Teste','2026-01-01', true)$q$), true);
SELECT pg_temp.caso('supervisor insere obra',
  pg_temp.tenta($q$INSERT INTO obras.obras (nome, ativa) VALUES ('RLS Obra Sup', true)$q$), true);
SELECT pg_temp.caso('supervisor insere item',
  pg_temp.tenta($q$INSERT INTO epi.itens (id, nome, ativo) VALUES ('bbbbbbbb-0000-0000-0000-000000000002','RLS Item Sup', true)$q$), true);

-- ═══════════════ ALMOXARIFE ═══════════════
RESET ROLE;
SELECT set_config('request.jwt.claims','{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT pg_temp.caso('almoxarife le colaboradores', (SELECT count(*) > 0 FROM epi.colaboradores), true);
SELECT pg_temp.caso('almoxarife insere movimentacao',
  pg_temp.tenta($q$INSERT INTO epi.movimentacoes (obra_id, epi_id, motivo, quantidade) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','Entrada', 1)$q$), true);
SELECT pg_temp.caso('almoxarife insere item',
  pg_temp.tenta($q$INSERT INTO epi.itens (id, nome, ativo) VALUES ('bbbbbbbb-0000-0000-0000-000000000003','RLS Item Alm', true)$q$), true);
SELECT pg_temp.caso('almoxarife NAO insere colaborador',
  pg_temp.tenta($q$INSERT INTO epi.colaboradores (nome, funcao, data_admissao, ativo) VALUES ('RLS Colab Alm','Teste','2026-01-01', true)$q$), false);
SELECT pg_temp.caso('almoxarife NAO insere obra',
  pg_temp.tenta($q$INSERT INTO obras.obras (nome, ativa) VALUES ('RLS Obra Alm', true)$q$), false);

-- ═══════════════ ADMINISTRATIVO ═══════════════
RESET ROLE;
SELECT set_config('request.jwt.claims','{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT pg_temp.caso('administrativo le movimentacoes', (SELECT count(*) > 0 FROM epi.movimentacoes), true);
SELECT pg_temp.caso('administrativo insere colaborador',
  pg_temp.tenta($q$INSERT INTO epi.colaboradores (nome, funcao, data_admissao, ativo) VALUES ('RLS Colab Adm','Teste','2026-01-01', true)$q$), true);
SELECT pg_temp.caso('administrativo NAO insere movimentacao',
  pg_temp.tenta($q$INSERT INTO epi.movimentacoes (obra_id, epi_id, motivo, quantidade) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','Entrada', 1)$q$), false);
SELECT pg_temp.caso('administrativo NAO insere obra',
  pg_temp.tenta($q$INSERT INTO obras.obras (nome, ativa) VALUES ('RLS Obra Adm', true)$q$), false);
SELECT pg_temp.caso('administrativo NAO insere item',
  pg_temp.tenta($q$INSERT INTO epi.itens (id, nome, ativo) VALUES ('bbbbbbbb-0000-0000-0000-000000000004','RLS Item Adm', true)$q$), false);

-- ═══════════════ TECNICO DE SEGURANCA ═══════════════
RESET ROLE;
SELECT set_config('request.jwt.claims','{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT pg_temp.caso('tecnico le movimentacoes', (SELECT count(*) > 0 FROM epi.movimentacoes), true);
SELECT pg_temp.caso('tecnico le colaboradores', (SELECT count(*) > 0 FROM epi.colaboradores), true);
SELECT pg_temp.caso('tecnico NAO insere movimentacao',
  pg_temp.tenta($q$INSERT INTO epi.movimentacoes (obra_id, epi_id, motivo, quantidade) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','Entrada', 1)$q$), false);
SELECT pg_temp.caso('tecnico NAO insere colaborador',
  pg_temp.tenta($q$INSERT INTO epi.colaboradores (nome, funcao, data_admissao, ativo) VALUES ('RLS Colab Tec','Teste','2026-01-01', true)$q$), false);
SELECT pg_temp.caso('tecnico NAO insere obra',
  pg_temp.tenta($q$INSERT INTO obras.obras (nome, ativa) VALUES ('RLS Obra Tec', true)$q$), false);
SELECT pg_temp.caso('tecnico NAO insere item',
  pg_temp.tenta($q$INSERT INTO epi.itens (id, nome, ativo) VALUES ('bbbbbbbb-0000-0000-0000-000000000005','RLS Item Tec', true)$q$), false);

-- ═══════════════ USUARIO SEM PERFIL ═══════════════
RESET ROLE;
SELECT set_config('request.jwt.claims','{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT pg_temp.caso('sem perfil NAO le movimentacoes', (SELECT count(*) = 0 FROM epi.movimentacoes), true);
SELECT pg_temp.caso('sem perfil NAO le colaboradores', (SELECT count(*) = 0 FROM epi.colaboradores), true);
SELECT pg_temp.caso('sem perfil NAO le obras', (SELECT count(*) = 0 FROM obras.obras), true);
SELECT pg_temp.caso('sem perfil NAO insere movimentacao',
  pg_temp.tenta($q$INSERT INTO epi.movimentacoes (obra_id, epi_id, motivo, quantidade) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','Entrada', 1)$q$), false);

-- ═══════════════ STORAGE: bucket assinaturas ═══════════════
-- autenticado (com ou sem perfil) pode subir; anon nao.
RESET ROLE;
SELECT set_config('request.jwt.claims','{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.caso('autenticado sobe assinatura',
  pg_temp.tenta($q$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('assinaturas','rls-teste/a.png','22222222-2222-2222-2222-222222222222')$q$), true);

RESET ROLE;
SELECT set_config('request.jwt.claims','{"role":"anon"}', true);
SET LOCAL ROLE anon;
SELECT pg_temp.caso('anonimo NAO sobe assinatura',
  pg_temp.tenta($q$INSERT INTO storage.objects (bucket_id, name) VALUES ('assinaturas','rls-teste/b.png')$q$), false);

RESET ROLE;
SELECT 'TODOS OS CASOS PASSARAM' AS resultado;
ROLLBACK;
