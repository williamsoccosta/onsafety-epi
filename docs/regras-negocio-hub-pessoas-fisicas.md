# Regras de negócio — Hub de sincronização de Pessoas Físicas

Detalhamento operacional do [PRD](prd-hub-pessoas-fisicas.md). Mapeamento feito antes do desenho de interface — cobre permissões, estados, limites, exceções, mensagens ao usuário, dependências técnicas e impactos na UI.

## Tabela de regras

| # | Categoria | Regra | Quando acontece | Comportamento esperado | Estado/mensagem de interface | Dúvidas |
|---|---|---|---|---|---|---|
| 1 | Permissão | Cadastrar/editar funcionário em `/rh/novo` | Usuário autenticado acessa o formulário | Só supervisor e administrativo têm acesso; demais perfis são bloqueados no server, não só escondidos no menu | Redirect para `/` (padrão já usado em `requirePerfil`) para quem não tem permissão | — |
| 2 | Permissão | Aprovar proposta em `/aprovacoes` (domínio pessoas) | Gestor abre a tela e clica "Aprovar" | Exige a credencial `GESTOR` (Basic Auth), mesma usada hoje para empresas/insumos | Prompt de Basic Auth do navegador; sem sessão própria do onsafety-epi | Perfil deve ser o mesmo `GESTOR` compartilhado ou um perfil próprio para pessoas? (ver dúvida global 4) |
| 3 | Permissão | Consultar mapa de IDs (core/kamino/uau/radar) por CPF | Alguém tenta ver o status de sincronização de uma pessoa | Sem definição hoje de quem pode consultar — não existe tela para isso ainda | — | Precisa de tela própria, ou o dado fica só disponível via acesso direto ao banco como a trilha de auditoria? |
| 4 | Permissão | Exportar `.csv` para o Radar | Gestor aciona exportação de propostas já aprovadas | Mesma permissão da aprovação (Basic Auth `GESTOR`), sem passo extra de autorização | Botão/link de exportação visível só após existir ao menos uma proposta aprovada pendente de export | — |
| 5 | Estado | Registro de pessoa "básico" (só etapa 1 preenchida) | Usuário salva o formulário sem completar a etapa 2 | Registro é válido e sincronizável com nome+CPF+telefone+e-mail; enriquecimento pode vir depois, sem exigir recadastro | Ficha do funcionário sinaliza "dados básicos" vs. "completo" | — |
| 6 | Estado | Proposta pendente → aprovada → aplicada | Ciclo de vida de uma proposta no hub | Pendente (aguarda ação) → aprovada (grava no destino) → removida da fila após sucesso | Linha desaparece da lista de `/aprovacoes` após aprovação bem-sucedida | — |
| 7 | Estado | Proposta com resultado parcial | Escrita no destino (ex. UAU) sucede mas o vínculo de ID no core falha | Mutação principal não é revertida; falha fica só no registro do vínculo | Mensagem distinta de "aprovado com pendência" (não "falhou") | — |
| 8 | Estado | Adapter Kamino dormente | Ciclo de `/reconciliar` roda enquanto o schema `gold` do Kamino está vazio | No-op — nenhuma proposta é gerada | Badge "dormente" na origem Kamino em `/aprovacoes`, sem erro | Quando o Kamino expõe `gold`, quem aciona a reativação do adapter? |
| 9 | Estado | Sincronização parcial de uma pessoa | Pessoa tem ID preenchido em alguns sistemas e `NULL` em outros | É estado normal e esperado, não erro | Indicador visual por sistema (ex. ✓/— por Kamino/UAU/Radar), nunca tratado como falha | — |
| 10 | Limite | Formato do CPF | Usuário digita CPF em qualquer etapa | 11 dígitos + dígito verificador válido (módulo 11); máscara aplicada na digitação | Campo formata automaticamente; erro inline se dígito verificador falhar | — |
| 11 | Limite | Volume de gravações por ciclo core→sistema externo | Cron de reconciliação roda com muitas propostas pendentes | Deveria existir um teto por ciclo, como já existe para empresas (`CORE_TO_UAU_MAX_POR_CICLO`) | Sem impacto de UI direto — efeito é no ritmo com que propostas aparecem em `/aprovacoes` | Qual o teto por ciclo para pessoas? Reaproveita a mesma env var ou é um valor novo? |
| 12 | Limite | Frequência do cron de `/reconciliar` | Execução periódica dos adapters de pessoa | Segue o mesmo agendamento host cron já usado pelos adapters de empresa | — | Qual a frequência exata (minutos/horas)? Não documentada nas ADRs consultadas. |
| 13 | Limite | Tamanho da exportação CSV para o Radar | Muitas propostas aprovadas acumuladas para exportar | Sem definição de lote máximo por arquivo | — | O Radar tem limite de linhas por importação? Depende do modelo ainda não compartilhado. |
| 14 | Exceção | CPF duplicado no cadastro RH | Usuário tenta cadastrar CPF já existente em `rh.funcionarios` | Bloqueia o submit final, não silenciosamente sobrescreve | Mensagem no topo do form + link para a ficha existente | — |
| 15 | Exceção | Adapter offline durante fan-out da tela `/aprovacoes` | Um dos adapters de pessoa não responde | Tela continua funcional para os demais adapters | Origem marcada como indisponível, sem erro fatal na página | — |
| 16 | Exceção | UAU não reconhece CPF pela API usada para PJ | Adapter `uau-pessoas` tenta consultar/gravar uma pessoa física | Comportamento hoje desconhecido — API só validada para PJ | — | Bloqueante: precisa de teste técnico antes de implementar (ver dúvida global 3) |
| 17 | Exceção | Falha ao gravar trilha de auditoria | `logs.aprovacoes_auditoria` indisponível no momento da aprovação | Não reverte a mutação já feita; falha é só logada (best-effort, mesmo padrão do hub-empresas) | Sem mensagem de erro ao usuário nesse caso específico — mutação principal teve sucesso | Deveria haver algum sinal ao gestor de que a trilha falhou, mesmo a mutação tendo sucesso? |
| 18 | Exceção | Timeout/erro de rede ao salvar cadastro RH | Falha de conexão durante submit do formulário | Dados preenchidos preservados no client; usuário pode tentar novamente | Mensagem de erro geral, sem perder o preenchimento | — |
| 19 | Dependência técnica | Rede/credenciais para `rh.funcionarios` | Adapters de pessoa precisam ler/escrever na base do onsafety-epi | ~~Resolvido 2026-07-10~~: `supabase.faabengenharia.cloud` (onsafety-epi) e o Supabase que hospeda `core.empresas` são a mesma instância (`n8nproject-supabase-jhkyel`, confirmado pelo IP do Kong) — os adapters já têm rede até o banco que tem `rh.funcionarios`, sem réplica necessária | — | Resolvida — ver nota na dúvida global 1 |
| 20 | Dependência técnica | RLS por perfil em `rh.funcionarios` | Adapter tenta gravar via `anon`/`service_role` key, padrão usado no hub-empresas | Confirmado na prática (2026-07-10, teste com conta descartável): a `service_role` key **não** tem grant de escrita em `rh.funcionarios` hoje (só a sessão autenticada via RLS consegue) — diferente do hub-empresas, que concede grants diretos à `anon`/`service_role` em `core.empresas`. Segue bloqueante, mas o achado muda o formato da decisão: não é "se aplicar o padrão", é decidir se vale abrir grant novo (repetindo o risco já aceito em empresas) ou manter os adapters de pessoa restritos a ler via RLS de um papel próprio | — | Bloqueante — ver dúvida global 2 |
| 21 | Dependência técnica | Layout do CSV do Radar | Geração do export pelo adapter `radar` | Sem definição — modelo ainda não compartilhado pela FAAB | — | Bloqueante — ver dúvida global 5 |
| 22 | Dependência técnica | Schema `gold` do Kamino | Ativação real do adapter `kamino-pessoas` | Depende de entrega externa (time do Kamino), fora do controle desta feature | Badge "dormente" mantido até então | Sem prazo conhecido — tratar como dependência externa não bloqueante para o restante do escopo |
| 23 | Impacto em UI | Formulário `/rh/novo` em duas etapas | Sempre que o formulário é aberto | Navegação avançar/voltar com indicador de progresso (1 de 2 / 2 de 2) | Foco move para o primeiro campo da nova etapa a cada troca; progresso exposto em texto, não só visualmente | — |
| 24 | Impacto em UI | Tela `/aprovacoes` com domínio pessoas | Gestor abre a tela de aprovação | Pessoas listadas junto de empresas/insumos, com coluna de origem | Tabela semântica (`<table>`, `<th scope="col">`); badges de status não dependem só de cor | — |

## Acessibilidade (WCAG AA) — aplica-se às regras 23 e 24
- Navegação entre etapas 100% por teclado (Tab/Shift+Tab, Enter para avançar), sem armadilha de foco.
- Mensagens de erro/exceção (regras 10, 14, 18) anunciadas via `aria-live="polite"` ou `role="alert"`, associadas ao campo via `aria-describedby`.
- Todo campo tem `<label>` associado (não só placeholder).
- Contraste mínimo 4.5:1 (texto normal) e 3:1 (texto grande/ícones de estado).
- Indicador de progresso das etapas exposto via texto.

## Métricas
- % de pessoas com os 4 IDs mapeados (regra 9) sobre o total de `rh.funcionarios` ativos — baseline hoje é 0%.
- Tempo entre cadastro (regra 5) e sincronização completa.
- Nº de propostas rejeitadas por divergência de CPF/nome por ciclo (regra 6).
- Nº de CPFs barrados por dígito verificador inválido (regra 10).
- Nº de exportações CSV para Radar (regra 4) e tempo médio até a exportação.

## Dúvidas globais que ainda impedem implementação segura
Cross-cutting — não amarradas a uma única linha da tabela.

1. ~~**Topologia de rede/credenciais**~~ — **Resolvida em 2026-07-10.** `supabase.faabengenharia.cloud` (onde vive `rh.funcionarios`) e o "Supabase n8n" (onde vive `core.empresas`) são a **mesma instância** — confirmado via `docker inspect` na VPS: o Kong de ambos resolve para o mesmo container (`n8nproject-supabase-jhkyel-supabase-kong`, IP `172.20.0.6`). Não existe problema de topologia entre projetos nem necessidade de réplica: os adapters do hub-empresas já têm rede e credenciais até o banco que hospeda `rh.funcionarios`. O que resta em aberto é só a dúvida 2 (grants/RLS), não mais a rede.
2. **RLS vs. `anon` key**: o padrão do hub-empresas bypassa RLS com grants diretos — replicar isso em `rh.funcionarios` (dado bancário/documentos) exige avaliação de segurança própria antes de conceder acesso.
3. **Cobertura da API UAU para pessoa física**: só validada para PJ até o momento (2026-07-03) — regra 16 é bloqueante até teste técnico confirmar.
4. **Quem aprova propostas de pessoa**: mesma credencial `GESTOR` ou perfil próprio (regra 2).
5. **Layout do CSV do Radar**: pendente do modelo a ser compartilhado pela FAAB (regras 4, 13, 21).
6. **Migração retroativa do dígito verificador**: CPFs já cadastrados em `rh.funcionarios` sem essa validação — auditar ou deixar como estão?
7. **Obrigatoriedade de telefone/e-mail na etapa 1**: notas originais oscilaram entre "nome+CPF" e "nome+CPF+telefone+e-mail" como mínimo — decide o comportamento da regra 5.
