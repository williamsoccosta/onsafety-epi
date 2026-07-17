-- Diagnostico read-only: distribuicao de epi.colaboradores.funcao
-- Rodar ANTES de aplicar kit-funcao-schema.sql. Nao altera dados.

-- 1. Contagem de colaboradores por valor exato de funcao (revela variacao de grafia)
select funcao, count(*) as colaboradores
from epi.colaboradores
where ativo is true  -- ajustar nome da coluna de status se diferente; confirmar em colaboradores/actions.ts
group by funcao
order by colaboradores desc;

-- 2. Quantos valores distintos colapsariam sob trim+lower (candidatos a variacao de grafia)
select lower(trim(funcao)) as funcao_normalizada, count(distinct funcao) as variantes_grafia, count(*) as colaboradores
from epi.colaboradores
where ativo is true
group by lower(trim(funcao))
having count(distinct funcao) > 1
order by colaboradores desc;

-- 3. Totais gerais
select
  count(distinct funcao) as funcoes_distintas_exatas,
  count(distinct lower(trim(funcao))) as funcoes_distintas_normalizadas,
  count(*) filter (where funcao is null or trim(funcao) = '') as colaboradores_sem_funcao
from epi.colaboradores
where ativo is true;
