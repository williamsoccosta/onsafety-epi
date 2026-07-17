# PRD — Kit de EPI por Função

## Objetivo
Hoje o almoxarife decide manualmente quais EPIs entregar a um colaborador, consultando um documento externo (programa de certificação) que relaciona função→EPIs obrigatórios. O sistema não sabe disso — não sugere, não valida, não alerta quando falta item. A feature modela essa relação dentro do sistema e conecta ao fluxo de entrega existente, reduzindo dependência de julgamento manual e permitindo detectar colaboradores com kit incompleto.

`[VALIDAR]` Dor confirmada pelo discovery como gap conhecido (`CONTEXT.md:165`), mas sem dado de quantos erros/incidentes de "EPI errado entregue" isso já causou. Ver Perguntas em aberto.

## Usuários
- **Supervisor** — cadastra/edita o kit por função (mesmo padrão de permissão que EPI/Catálogo — CONTEXT.md tabela de perfis).
- **Almoxarife** — usa o kit sugerido na tela de nova entrega, decide se segue a sugestão ou ajusta manualmente.
- **Técnico de Segurança** — consulta (leitura) kits incompletos, sem editar.
- **Administrativo** — sem acesso direto a este módulo (fora do escopo de permissão hoje, alinhado à tabela de perfis existente).

## Escopo
1. Tabela nova `epi.kit_funcao` (função → lista de EPIs obrigatórios), casada por **string exata** de `colaboradores.funcao` na v1 (ver Regras de Negócio para o porquê de não normalizar para FK agora).
2. Tela de cadastro/edição de kit por função (novo módulo ou sub-página em Materiais/EPI — `[VALIDAR]` local exato no grid de módulos).
3. Na tela de nova entrega (`movimentacoes/nova-entrega`): ao selecionar colaborador, buscar `funcao` e exibir bloco "Kit sugerido" com os itens da função, e botão "Preencher com kit sugerido" que popula a lista de itens (sem travar edição manual).
4. Indicador novo no Dashboard: "Kits incompletos" (mesmo padrão visual de `MetricCard` que já existe para "Trocas vencidas"), com link pra listagem filtrável.
5. Cálculo de "kit incompleto": função com kit definido + colaborador sem entrega ativa de 1+ item do kit.

## Fora de escopo (nesta versão)
- Migrar `colaboradores.funcao` de texto livre para tabela normalizada de funções/cargos — isso é o item de backlog separado **"Funções (RH)"** (`CONTEXT.md:167`), distinto deste.
- Riscos ocupacionais por função — outro item de backlog separado (`CONTEXT.md:168`).
- Auditoria/histórico de mudança de função do colaborador.
- Bloqueio de entrega quando kit incompleto (a v1 é sugestão/alerta, não trava o fluxo).
- App mobile ou uso offline.

## Fluxo principal
1. Supervisor cadastra kit para a função "Pedreiro": associa N itens de `epi.itens` à string `"Pedreiro"`.
2. Almoxarife abre "Nova entrega", seleciona colaborador (cuja `funcao` = "Pedreiro").
3. Sistema busca `epi.kit_funcao` por match exato de string com a `funcao` do colaborador.
   - Se achar kit: exibe bloco com os N itens, situação de cada um (já entregue / pendente), botão "Preencher com kit sugerido".
   - Se não achar kit pra essa função: exibe mensagem explícita "Função sem kit cadastrado" (nunca omite o bloco silenciosamente).
4. Almoxarife clica "Preencher com kit sugerido" → itens pendentes entram na lista de itens da entrega (reaproveitando o componente já existente de lista dinâmica).
5. Almoxarife pode remover/adicionar itens livremente antes de confirmar — kit é sugestão, não obrigação.
6. Segue fluxo de assinatura já existente, sem mudança.
7. Dashboard passa a contar "kits incompletos" (colaboradores com função-kit definida e 1+ item nunca entregue).

## Requisitos funcionais
- RF1. CRUD de `epi.kit_funcao`: supervisor associa/remove itens de EPI a uma string de função.
- RF2. Busca de kit por função exata (case-sensitive ou não — `[VALIDAR]`, ver riscos de normalização) ao carregar tela de nova entrega.
- RF3. Botão "Preencher com kit sugerido" popula somente itens **ainda não entregues** ao colaborador (mesma lógica de dedup por `colaborador_id + epi_id` usada em Agenda de Trocas).
- RF4. Card "Kits incompletos" no Dashboard, mesmo componente visual dos indicadores existentes, linkando para listagem.
- RF5. Listagem de colaboradores com kit incompleto, mostrando quais itens faltam por colaborador.
- RF6. Função sem kit cadastrado nunca trava a entrega — always-editable manual fallback.

## Estados de UI
Ancorados nos padrões já usados no projeto (`design.md`, `entrega-form.tsx`, `trocas/page.tsx`):

| Estado | Comportamento | Referência de padrão existente |
|---|---|---|
| Loading (buscando kit) | Texto trocando no controle + `disabled`, sem spinner novo | `entrega-form.tsx` "Registrando..." |
| Vazio (função sem kit) | Mensagem explícita centralizada, `--ink-muted` | `dashboard/page.tsx` mensagens vazias |
| Sucesso (kit completo) | Selo `.selo--ok` | `globals.css` `.selo` (substituindo badge verde hardcoded que o form usa hoje — ver nota de dívida técnica abaixo) |
| Parcial (itens faltando) | Selo `.selo--alert` + contagem, mesmo padrão de "Trabalhadores sem EPI" | `dashboard/page.tsx:238-247` |
| Erro (falha ao buscar kit) | Parágrafo `--danger`, mesmo padrão já usado | `entrega-form.tsx:282-286` |

**Nota de dívida técnica identificada durante a pesquisa** (não é escopo desta feature, mas não deve ser repetida): `entrega-form.tsx` usa um badge verde com cor hardcoded (`#dcfce7`/`#16a34a`) fora da paleta de tokens, quando deveria usar `.selo--ok`. A feature nova usa o padrão correto; o form antigo fica como possível fix futuro separado.

## Acessibilidade WCAG AA
- Contraste mínimo AA em todos os textos/selos novos (seguir tokens `--danger`/`--accent` já validados no design system).
- Nunca comunicar completo/incompleto só por cor — sempre texto + selo (`.selo--ok`/`.selo--alert`), princípio já adotado no projeto.
- `aria-live="polite"` no bloco de sugestão de kit (conteúdo muda sem interação direta de foco — loading→resultado).
- `role="status"` no selo de resultado do kit.
- Aplicar classe `.campo-foco` no botão "Preencher com kit sugerido" e em qualquer novo input do CRUD de kit — **não repetir** o gap existente onde `entrega-form.tsx` usa `outline-none` sem substituto de foco.
- Alvo de toque ≥44px em todos os novos controles interativos (form atual tem botões de 36-40px, abaixo do mínimo — não repetir na feature nova).
- Labels associados (`<label htmlFor>` ou `aria-label`) em todo input do CRUD de kit.

## Métricas de sucesso
1. **% de funções distintas com kit definido** — `count(distinct funcao) com kit / count(distinct funcao) total em colaboradores ativos`.
2. **Nº de colaboradores com kit incompleto** (tendência de queda esperada após adoção) — visível no card do Dashboard.
3. **Adoção do botão "Preencher com kit sugerido"** — `[VALIDAR]` precisa de evento/log não existente hoje (ver Perguntas em aberto — não há analytics no projeto atualmente).

## Critérios de aceite (verificáveis)
1. Dado função "Pedreiro" com kit de 3 itens cadastrados e colaborador com 0 entregas desses itens, a tela de nova entrega exibe os 3 itens como pendentes.
2. Dado o mesmo colaborador com 2 dos 3 itens já entregues (entrega ativa, não substituída/vencida), a tela mostra 1 item pendente.
3. Dado colaborador com os 3 itens entregues, o indicador de "kit incompleto" não lista mais esse colaborador.
4. Dado função sem kit cadastrado, a tela exibe "Função sem kit cadastrado" — nunca lista vazia sem explicação, nunca omite o bloco.
5. Botão "Preencher com kit sugerido" adiciona apenas itens pendentes à lista de itens da entrega, sem duplicar itens já adicionados manualmente.
6. Card "Kits incompletos" no Dashboard soma corretamente via mesma lógica de dedup `colaborador_id+epi_id` usada em Agenda de Trocas — validável por query direta comparando os dois cálculos.
7. Todos os novos elementos interativos passam em auditoria WCAG AA (contraste, foco visível, `aria-label`/`role`, alvo de toque ≥44px) — validável via revisão manual + checklist deste PRD.

## Dúvidas que ainda impedem implementação segura
1. **Casamento função↔kit por string exata**: `colaboradores.funcao` é texto livre sem normalização hoje — variações de grafia ("Pedreiro" vs "pedreiro " vs "Pedreiro Oficial") vão fazer o match falhar silenciosamente. Precisa decidir: normalizar dados existentes antes de lançar, ou aceitar match frágil na v1? Quem faz a limpeza de dados?
2. **Quantas funções distintas existem hoje na base?** Não verificado (agente de dados não conseguiu consultar sem acesso direto ao banco). Sem esse número, não dá pra estimar esforço de cadastro inicial dos kits.
3. **Quem cadastra os primeiros kits?** O supervisor tem o "programa de certificação" (documento externo) — vai digitar manualmente, ou existe uma planilha/PDF que pode ser importado?
4. **Sobreposição com o backlog "Funções (RH)"** (`CONTEXT.md:167`, tabela de funções/cargos com riscos ocupacionais — projeto distinto, ainda não modelado): se esse outro projeto avançar em paralelo, a string livre desta feature vira dívida técnica imediata. Alguém está decidindo a ordem entre os dois?
5. **Bloqueio ou só alerta?** Confirmado nesta v1 como "não bloqueia entrega" — mas isso é decisão de produto ou só suposição minha por falta de informação? Se compliance exigir bloqueio, o fluxo muda.
6. **Onde o CRUD de kit vive na navegação?** Módulo novo no grid da home, ou sub-página dentro de EPI/Materiais? Não decidido.
7. **Sem analytics no projeto hoje** — a métrica de adoção do botão "kit sugerido" não é medível sem instrumentação nova. Vale o custo de adicionar logging só pra essa métrica, ou ela fica de fora da v1?
