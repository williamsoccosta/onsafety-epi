# Regras de Negócio — Kit de EPI por Função

Detalhes operacionais e técnicos de suporte ao [PRD — Kit de EPI por Função](prd-kit-por-funcao.md). Decisão de produto fica no PRD; aqui ficam as regras que orientam a implementação.

## Modelo de dados

### Estado atual (confirmado por leitura de código)
- `epi.colaboradores.funcao` é **coluna texto livre**, sem FK, sem enum (`src/app/colaboradores/actions.ts:12`, `src/app/colaboradores/page.tsx:48`).
- Não existe tabela `funcoes`/`cargos` em nenhum schema (`epi`, `rh`, `catalogo`). Confirmado explicitamente como gap distinto no backlog (`CONTEXT.md:167`, item **"Funções (RH)"** — não confundir com esta feature).
- `epi.itens` sincroniza automaticamente do catálogo externo via trigger `trg_sync_itens` (`CONTEXT.md:126-127`). Qualquer referência a `epi_id` numa tabela nova precisa respeitar esse `id` sincronizado.
- PostgREST não resolve joins cross-schema (`CONTEXT.md`, regra já estabelecida) — `epi.kit_funcao` deve viver no mesmo schema `epi` para evitar o mesmo problema que motivou `movimentacoes.epi_id` apontar para `epi.itens` em vez do catálogo direto.
- Parâmetros configuráveis por item hoje seguem padrão de **coluna simples** em `epi.itens` (`vida_util_dias`, `limite_por_entrega`, `estoque_minimo` — confirmado em `scripts/estoque-minimo.sql`). Não há precedente de tabela de associação N:N no schema atual — esta feature introduz o primeiro caso.

### Proposta de schema (v1)
```sql
-- tabela nova, schema epi (evita problema de join cross-schema do PostgREST)
create table epi.kit_funcao (
  id uuid primary key default gen_random_uuid(),
  funcao text not null,          -- match por string exata contra epi.colaboradores.funcao
  epi_id uuid not null references epi.itens(id),
  criado_em timestamptz not null default now(),
  unique (funcao, epi_id)
);
```
`[VALIDAR]` — decisão de normalizar `funcao` (trim + case-fold antes de comparar) ou aceitar match estritamente exato na v1. Ver Regra 1 abaixo.

## Regra 1 — Casamento função↔kit
Match é feito por **string exata** entre `epi.colaboradores.funcao` e `epi.kit_funcao.funcao` na v1. Não há normalização (trim/lowercase) automática.

**Risco conhecido**: variação de grafia entre colaboradores existentes ("Pedreiro" vs "pedreiro" vs "Pedreiro ") faz o match falhar silenciosamente — colaborador não recebe sugestão de kit mesmo que a função "deveria" casar. Mitigação mínima recomendada: normalizar com `trim(lower(funcao))` na comparação (sem alterar o dado armazenado), reduzindo (não eliminando) o problema de espaço/capitalização — mas não resolve sinônimos ("Pedreiro" vs "Pedreiro Oficial").

**Decisão pendente** (ver PRD, Perguntas em aberto #1): limpar dados existentes antes do lançamento, ou aceitar taxa de match imperfeita na v1 e medir depois.

## Regra 2 — Cálculo de "kit incompleto"
Replica exatamente o padrão já usado em `trocas/page.tsx` (linhas 33-72) e no indicador "Trocas vencidas" do Dashboard (`dashboard/page.tsx:101-114`):

1. Para cada colaborador ativo com `funcao` que tem 1+ linha em `epi.kit_funcao`:
2. Buscar entregas ativas do colaborador (mesma dedução de "entrega ativa" usada em Trocas: motivo `Entrega`/`Substituicao`, pega a mais recente por `(colaborador_id, epi_id)` via `Set` de chaves, dado que a query já vem ordenada por `criado_em desc`).
3. Item do kit é "pendente" se `epi_id` do kit não aparecer no set de entregas ativas do colaborador.
4. Colaborador é "kit incompleto" se tiver 1+ item pendente.

Toda a agregação acontece **em memória no server component**, não via SQL agregado — mesmo padrão do resto do Dashboard (Supabase/PostgREST traz linhas cruas, JS agrega). Não introduzir uma exceção usando SQL agregado só nesta feature — quebra consistência com o resto do código.

## Regra 3 — Botão "Preencher com kit sugerido"
- Adiciona à lista de itens da entrega **apenas os itens pendentes** do kit (não duplica itens já presentes na lista, seja porque o almoxarife adicionou manualmente ou porque o colaborador já tem entrega ativa daquele item).
- Reaproveita o estado/handlers já existentes do componente de lista dinâmica em `entrega-form.tsx` (`setItem`/`addItem`) — não criar componente de lista paralelo.
- Ação é **aditiva e reversível**: almoxarife continua podendo remover/editar qualquer item depois de clicar no botão. Botão não trava nem substitui o fluxo manual existente.

## Regra 4 — Kit sugerido não bloqueia entrega
Função sem kit cadastrado, ou colaborador com kit incompleto, **não impede** o registro da entrega. O sistema só informa — decisão final de o que entregar continua com o almoxarife. (Ver PRD, Pergunta #5 — se compliance exigir bloqueio futuramente, esta regra muda e o fluxo de UI precisa de estado de confirmação adicional.)

## Regra 5 — Consistência visual com padrões existentes
- Estado "completo" usa `.selo--ok` (`globals.css:109-114`) — **não** replicar o badge verde hardcoded (`#dcfce7`/`#16a34a`) que `entrega-form.tsx:214-220` usa hoje fora da paleta de tokens. Essa é uma dívida técnica pré-existente, não um padrão a seguir.
- Estado "incompleto" usa `.selo--alert`, mesmo padrão visual do card "Trabalhadores sem EPI" no Dashboard.
- Card do Dashboard "Kits incompletos" usa o mesmo componente `MetricCard` já usado para os outros indicadores (`dashboard/page.tsx:137-142`), não um componente novo.

## Regra 6 — Permissões
Segue a tabela de perfis já estabelecida em `CONTEXT.md` (mesma linha de "Cadastrar/editar EPI"):

| Ação | Supervisor | Almoxarife | Administrativo | Tec. Segurança |
|---|---|---|---|---|
| Cadastrar/editar kit por função | sim | — | — | — |
| Ver/usar kit sugerido na entrega | sim | sim | — | — |
| Ver indicador de kits incompletos | sim | sim | — | sim (leitura) |

`[VALIDAR]` — confirmar com supervisor/dono do produto se este mapeamento de permissão está correto antes de implementar (segue o padrão de EPI por analogia, não foi confirmado explicitamente para esta feature nova).

## Riscos técnicos (detalhados)
1. **Migração futura para FK**: se o backlog "Funções (RH)" avançar e `funcao` virar tabela normalizada, `epi.kit_funcao.funcao` (string) vira dívida técnica imediata — precisa de migração de dados na hora. Recomendação: revisar ordem de prioridade entre as duas features antes de implementar esta.
2. **Sem histórico de mudança de função**: se um colaborador mudar de função (ex: promoção), o kit "antigo" não é rastreado — o sistema recalcula do zero contra a função atual, sem registro do que era exigido antes. Aceitável para v1 dado que não há histórico de função no sistema hoje.
3. **Volume de dados não verificado**: não foi possível confirmar via leitura de código quantas funções distintas existem hoje na base (exigiria query direta ao banco, fora do escopo de uma investigação somente-leitura via SSH/código). Necessário antes de estimar esforço de cadastro inicial.
