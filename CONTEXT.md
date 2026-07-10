# Contexto de Dominio — Onsafety EPI

Sistema de gestao de almoxarifado de EPI para canteiros de obras da FAAB Engenharia.

---

## Glossario

### Obra
Canteiro de obras onde a FAAB executa um contrato. Cada obra tem estoque proprio de EPI.
Campos: `nome`, `cliente` (texto livre), `ativa` (boolean).
Uma obra inativa nao recebe mais movimentacoes mas permanece no historico.

### Cliente
Empresa contratante de uma ou mais obras. Historicamente armazenado como texto livre no campo `obras.cliente`. A partir de 2026-06, obras podem ter `empresa_id` (FK para `core.empresas`) vinculando a uma empresa real com dados do CNPJ via BrasilAPI. O campo `cliente` (texto) permanece como fallback para obras sem CNPJ cadastrado. O agrupamento por cliente usa `empresa_id` quando disponivel, senao o texto livre. Obras sem cliente (`null`) formam o grupo "Sem cliente".

### EPI (Equipamento de Protecao Individual)
Item de protecao no inventario da empresa (`epi.itens`). A tabela e **populada e sincronizada automaticamente** a partir do catalogo externo (`catalogo.fichas_tecnicas`) via trigger `trg_sync_itens` — mesmo `id` nas duas tabelas. Cada EPI tem CA com data de validade (`ca_validade`).

Parametros configuraveis por item no Catalogo: `vida_util_dias` (alimenta a Agenda de Trocas), `limite_por_entrega` e `estoque_minimo` (alimenta o alerta de estoque do painel; fallback 3 quando nao definido).

### CA (Certificado de Aprovacao)
Certificado emitido pelo Ministerio do Trabalho que valida um EPI para uso. Possui numero, data de validade e situacao (`VALIDO` ou `VENCIDO`).

Dois contextos de CA no sistema:
- **Catalogo externo** (`catalogo.fichas_tecnicas`): base de referencia com todos os CAs, consultada na pagina "Consulta CA".
- **CA do item** (`epi.itens.ca` + `epi.itens.ca_validade`): o certificado do EPI no inventario — espelhado do catalogo pelo sync.

### Material
Termo generico para qualquer item que a FAAB adquire para uso em obra. No dia a dia da construtora, "material" e o termo coloquial — no sistema, o registro formal e o **Insumo**.

### Insumo
Item especifico registrado no catalogo de materiais (`catalogo.insumos`), com codigo unico auto-gerado (INS-001), classificado na hierarquia segmento→categoria→tipo. Pode ter marca, informacao adicional e ficha tecnica vinculada. Um EPI e um insumo do segmento "EPIs, EPCs e Sinalizacao" (SEG-003).

### Catalogo
Hierarquia de classificacao de materiais da FAAB (`catalogo.*`). Cinco niveis: **Segmento** (grande familia, ex: Materiais de Construcao) → **Categoria** (agrupamento, ex: Cimento e Argamassa) → **Tipo** (classe, ex: Cimento) → Subtipo → Componente → **Insumo** (item especifico). Cada nivel tem codigo auto-gerado por trigger (SEG-001, CAT-002, TIP-058, INS-001). Fichas tecnicas de CA (`catalogo.fichas_tecnicas`) sao vinculadas a insumos do segmento de EPIs.

### Movimentacao
Registro de entrada ou saida de EPI no estoque de uma obra. Motivos: `Entrada`, `Quantidade Inicial`, `Entrega`, `Substituicao`, `Devolucao` (sem acentos — constraint do DB alinhada ao codigo). Saidas tem quantidade negativa. Coluna `criado_por` registra o usuario que fez o lancamento.

### Entrega de EPI (fluxo de balcao)
Fluxo unico de entrega presencial: o almoxarife preenche os dados (colaborador, obra, **lista de EPIs com quantidades**, motivo) no dispositivo dele e o colaborador **assina na hora** no canvas. Entrega multipla: uma assinatura cobre a lista toda (N movimentacoes compartilham a mesma imagem de assinatura, upload unico por lote) — igual ao papel. Motivos `Entrega` e `Substituicao` **exigem assinatura**; demais motivos nao tem assinatura.

- **Entrega**: tipicamente para funcionarios novos.
- **Substituicao**: o caso mais frequente — item desgastado trocado por novo. Uma unica movimentacao assinada; o item velho vira descarte fisico (nao entra no sistema).
- **Devolucao**: caso raro (ex: desligamento). Registrada na pagina Movimentacoes, sem assinatura.

O almoxarife define o que entregar consultando o programa de certificacao (documento externo, baseado na funcao do colaborador). A relacao funcao→EPIs ("kit por funcao") **nao e modelada no sistema** — backlog futuro.

### Troca prevista / Agenda de Trocas
Para cada ultima entrega de um EPI a um colaborador, a troca prevista = data da entrega + `vida_util_dias` do item. A pagina "Agenda de Trocas" lista os EPIs em campo ordenados pelo vencimento, com filtro de vencidas. Entregas de itens sem vida util definida ficam fora da agenda (aviso aponta para o Catalogo).

### Assinatura
Imagem PNG capturada em canvas no ato da entrega, salva no bucket `assinaturas` do Storage com URL publica gravada em `movimentacoes.assinatura_url`. Comprova recebimento conforme NR-06. Pode ser apagada (ex: assinatura errada) por quem opera a ficha.

### Colaborador
Trabalhador que recebe EPIs. Entidade operacional do almoxarifado (`epi.colaboradores`). Identificado por nome, matricula e funcao (texto livre). Cada entrega e registrada na ficha individual. **Colaborador nao tem login** — a assinatura acontece no dispositivo do almoxarife. A ficha pode ser baixada em **PDF com um clique** (rota `/colaboradores/[id]/pdf`, pdfkit) com assinaturas embutidas e declaracao NR-06.

Um colaborador pode ter vinculo opcional com um **Funcionario** do RH (`pessoa_id` FK para `rh.funcionarios`). O vinculo e manual e incremental — o colaborador pode existir sem ficha RH. A ficha do colaborador exibe um resumo dos dados do funcionario quando vinculado (CPF, telefone, email) com link para a ficha completa.

### Funcionario
Pessoa fisica com vinculo empregaticio e ficha cadastral completa (`rh.funcionarios`). Contem dados pessoais (CPF, filiacao, nascimento), documentos (CTPS, RG, titulo eleitor, reservista, CNH em JSONB), endereco, dados bancarios, estado civil e grau de instrucao. Entidade do modulo RH, operada por supervisor e administrativo. Tecnico de seguranca tem leitura (exceto dados bancarios). Almoxarife nao acessa.

Nao confundir com **Colaborador** (entidade do EPI) nem com **Contato** (cadastro legado).

### Contato
Registro generico de pessoa ou empresa no cadastro legado (`core.pessoas`, 1.847 registros). Mistura PF e PJ. Serve como base de busca para auto-preenchimento ao cadastrar funcionarios, mas **nao e fonte de verdade** para nenhum modulo. Independente de `rh.funcionarios`.

### Perfil
Nivel de acesso de um usuario do sistema (tabela `public.perfis`, FK para `auth.users`). Quatro perfis ativos:

| Acao | Supervisor | Almoxarife | Administrativo | Tec. Seguranca |
|---|---|---|---|---|
| Registrar movimentacao/entrega | sim | sim | — | — |
| Cadastrar/editar colaborador | sim | — | sim | — |
| Cadastrar/editar obra | sim | — | — | — |
| Cadastrar/editar EPI | sim | sim | — | — |
| Gerenciar usuarios | sim | — | — | — |
| Criar/editar ficha RH | sim | — | sim | — |
| Consultar ficha RH completa | sim | — | sim | sim (leitura) |
| Ver dados bancarios (RH) | sim | — | sim | — |
| Leitura geral | sim | sim | sim | sim |

- **Almoxarife e central** (nao vinculado a obra) — qualquer almoxarife movimenta qualquer obra.
- **Tecnico de seguranca** so fiscaliza (leitura).
- O perfil `colaborador` existe no enum do DB mas esta **descontinuado** (sem login de colaborador).

---

## Deploy e infraestrutura

- **VPS**: `root@187.77.234.21` — chave SSH local em `~/.ssh/id_ed25519_hostinger`
- **Projeto na VPS**: `/root/onsafety-epi`
- **Processo**: PM2 (`onsafety-epi`, id 0), rodando `npm run start` (modo producao)
- **Supabase self-hosted**: Kong (rede interna Docker), publico em `https://supabase.faabengenharia.cloud`. O IP do container Kong **muda** quando ele reinicia — nao usar IP fixo (ver URLs abaixo).

### URLs do Supabase (importante)
- **Todas as vars de URL apontam para o dominio publico** `https://supabase.faabengenharia.cloud` — browser, server e middleware. O host alcanca o dominio publico via nginx local (nginx atualiza o upstream do Kong sozinho quando o IP muda).
- **Nao usar IP de container** (ex: `172.20.0.9:8000`) em `SUPABASE_INTERNAL_URL`/`NEXT_PUBLIC_SUPABASE_INTERNAL_URL`: o Kong troca de IP a cada restart e o app (PM2 no host) passa a dar `ECONNREFUSED` e nao abre. Incidente em 2026-06-12: Kong foi de `.9` para `.10` e derrubou o app. Corrigido apontando tudo para o dominio publico.
- Usar a mesma URL em todos os clients tambem alinha o nome do cookie de sessao (`sb-supabase-auth-token`) entre browser e server.
- URLs de arquivos do Storage gravadas no DB devem usar **sempre a URL publica** (o browser precisa carregar).
- PostgREST **nao resolve joins cross-schema** (ex: `epi.movimentacoes` → `obras.obras`): buscar separado e juntar em memoria.

### Fluxo de deploy
O git e a fonte de verdade. Nunca editar arquivos diretamente na VPS — mudancas nao commitadas causam conflitos no proximo `git pull`.

```bash
# Localmente:
git add <arquivos> && git commit -m "..." && git push origin main

# Na VPS:
ssh -i ~/.ssh/id_ed25519_hostinger root@187.77.234.21 \
  "cd /root/onsafety-epi && git pull origin main && npm install && npm run build && pm2 restart all"
```

---

## Decisoes de design

### Paridade com OnSafety (2026-06)
Referencia de produto: OnSafety (onsafety.com.br). Implementado: vida util com Agenda de Trocas, entrega multipla com assinatura unica, estoque minimo por item, dashboard com indicadores (EPIs mais entregues, por motivo, trabalhadores sem EPI, trocas vencidas) e ficha em PDF. Fora do alcance: biometria facial, app mobile offline, assinatura remota por e-mail.

### Fluxo de balcao unico para entregas (2026-06)
Entrega e substituicao acontecem presencialmente no almoxarifado: almoxarife preenche, colaborador assina no mesmo dispositivo. Rejeitado: autosservico do colaborador (sem controle de estoque) e fluxo em duas etapas com assinatura posterior (fichas ficariam eternamente pendentes — colaborador de obra nao loga em sistema). Consequencia: colaborador nao precisa de conta; menos gestao de acessos.

### epi.itens espelha catalogo.fichas_tecnicas (2026-06)
PostgREST nao segue FK cross-schema, entao `movimentacoes.epi_id` referencia `epi.itens` — que e populada/sincronizada do catalogo via trigger com IDs identicos. Alternativa rejeitada: apontar FK direto pro catalogo (quebra joins embutidos do PostgREST).

### Agrupamento de obras por cliente
A pagina "Obras" exibe obras agrupadas por cliente. Ordenacao: alfabetica pelo nome do cliente. Header do container: nome do cliente + total de obras + quantas ativas. Obras sem cliente formam o grupo "Sem cliente" ao final. Obras inativas sao ocultadas por padrao; um filtro global `?inativas=1` as revela. O campo cliente no formulario usa `<datalist>` com sugestoes dos clientes existentes para evitar fragmentacao de grupos por erro de digitacao.

### Filtro de CAs vencidos no catalogo
A pagina "Consulta CA" tem um checkbox "Mostrar apenas vencidos" que filtra `situacao = 'VENCIDO'` no catalogo externo. O filtro funciona de forma independente da busca por numero de CA, via URL param `?vencidos=1`.

---

### Modulo
Unidade de navegacao do sistema. Cada modulo aparece como card no grid da home. Modulos com multiplas paginas (EPI, Materiais) exibem sidebar contextual; modulos de pagina unica (Colaboradores, Obras, RH, Consulta CA, Usuarios, Dashboard) exibem header com botao de voltar ao grid. Visibilidade controlada por perfil — cards de modulos nao autorizados nao aparecem (nunca desabilitados/cinza).

Modulos ativos: Dashboard, EPI, Colaboradores, Obras, RH, Materiais, Consulta CA, Usuarios.

### Validacao (catalogo)
Flag booleano (`validado`) em segmentos, categorias e tipos que indica que o item foi revisado e confirmado pelo supervisor. Nao impede edicao — e apenas um indicador visual ("Validado" verde / "Pendente" cinza). Supervisor pode editar itens validados normalmente.

---

## Decisoes de design

### Navegacao por grid de modulos (2026-06)
A home (`/`) exibe um grid de cards estilo PubliWeb + alertas compactos abaixo (trocas vencidas, CAs vencendo, estoque baixo). O dashboard completo com graficos vive no modulo Dashboard (`/dashboard`). Sidebar lateral unico foi substituido por sidebar contextual por modulo — aparece so em EPI e Materiais. Demais modulos tem header com botao voltar. Deep links funcionam sem passar pelo grid.

### EPI e Materiais sao modulos separados (2026-06)
`/epis` continua como visao operacional do almoxarife (vida util, estoque minimo, limite por entrega). `/materiais` e o catalogo geral de todos os insumos da FAAB (5 segmentos). EPI e um insumo do segmento SEG-003 mas a pagina /epis nao muda — continua listando `epi.itens` sincronizado de fichas tecnicas. Insumos de outros segmentos nao aparecem em /epis.

### Desativacao nao cascateia (2026-06)
Desativar um segmento nao desativa categorias/tipos filhos. A desativacao e soft — flag `ativo = false` — e afeta apenas a visibilidade no picker. Comportamento intencional: permite reorganizar a arvore sem perder insumos.

### Coexistencia fichas tecnicas e insumos (2026-06)
Os 246 EPIs existentes vieram de `catalogo.fichas_tecnicas` via trigger `trg_sync_itens`. `catalogo.insumos` comeca vazio. Os dois caminhos coexistem: fichas tecnicas alimentam EPIs, insumos alimentam o catalogo geral. Migracao do trigger para usar insumos como fonte de verdade fica no backlog.

---

## Fora de escopo (backlog futuro)

- **Kit por funcao**: tabela funcao→EPIs do programa de certificacao, sugestao automatica de kit na entrega, auditoria de "faltando".
- **Login de colaborador**: consulta da propria ficha.
- **Funcoes (RH)**: tabela de funcoes/cargos com riscos ocupacionais associados. Anotado no caderno, ainda nao modelado.
- **Riscos (RH)**: riscos ocupacionais vinculados a funcao ou ao funcionario. Anotado no caderno, ainda nao modelado.
- **Relatorio de conformidade por obra**: cruzamento de colaboradores × EPIs × trocas vencidas para fiscalizacao.
- **Alertas de vencimento de CNH**: CNH registrada em `rh.funcionarios.documentos`, alerta similar ao de CA.
- **Painel de fornecedores**: consulta de fornecedores por CNPJ/UF/CNAE a partir de `public.fornecedores` (20.225 registros).
- **Catalogo hierarquico visual**: picker segmento→categoria→tipo usando `core.buscar_arvore_catalogo()`.
