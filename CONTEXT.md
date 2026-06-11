# Contexto de Dominio — Onsafety EPI

Sistema de gestao de almoxarifado de EPI para canteiros de obras da FAAB Engenharia.

---

## Glossario

### Obra
Canteiro de obras onde a FAAB executa um contrato. Cada obra tem estoque proprio de EPI.
Campos: `nome`, `cliente` (texto livre), `ativa` (boolean).
Uma obra inativa nao recebe mais movimentacoes mas permanece no historico.

### Cliente
Empresa contratante de uma ou mais obras. Nao existe tabela separada de clientes — o nome e armazenado como texto livre no campo `obras.cliente`. O agrupamento de obras por cliente e feito em memoria pelo valor desse campo. Obras sem cliente (`null`) formam o grupo "Sem cliente".

### EPI (Equipamento de Protecao Individual)
Item de protecao no inventario da empresa (`epi.itens`). A tabela e **populada e sincronizada automaticamente** a partir do catalogo externo (`catalogo.fichas_tecnicas`) via trigger `trg_sync_itens` — mesmo `id` nas duas tabelas. Cada EPI tem CA com data de validade (`ca_validade`).

Parametros configuraveis por item no Catalogo: `vida_util_dias` (alimenta a Agenda de Trocas), `limite_por_entrega` e `estoque_minimo` (alimenta o alerta de estoque do painel; fallback 3 quando nao definido).

### CA (Certificado de Aprovacao)
Certificado emitido pelo Ministerio do Trabalho que valida um EPI para uso. Possui numero, data de validade e situacao (`VALIDO` ou `VENCIDO`).

Dois contextos de CA no sistema:
- **Catalogo externo** (`catalogo.fichas_tecnicas`): base de referencia com todos os CAs, consultada na pagina "Consulta CA".
- **CA do item** (`epi.itens.ca` + `epi.itens.ca_validade`): o certificado do EPI no inventario — espelhado do catalogo pelo sync.

### Catalogo
Base externa de fichas tecnicas de CAs (`catalogo.fichas_tecnicas`). Fonte de verdade do inventario de EPIs: todo item em `epi.itens` nasce de uma ficha tecnica do catalogo.

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
Trabalhador que recebe EPIs. Identificado por nome, matricula e funcao (texto livre). Cada entrega e registrada na ficha individual. **Colaborador nao tem login** — a assinatura acontece no dispositivo do almoxarife. A ficha pode ser baixada em **PDF com um clique** (rota `/colaboradores/[id]/pdf`, pdfkit) com assinaturas embutidas e declaracao NR-06.

### Perfil
Nivel de acesso de um usuario do sistema (tabela `public.perfis`, FK para `auth.users`). Quatro perfis ativos:

| Acao | Supervisor | Almoxarife | Administrativo | Tec. Seguranca |
|---|---|---|---|---|
| Registrar movimentacao/entrega | sim | sim | — | — |
| Cadastrar/editar colaborador | sim | — | sim | — |
| Cadastrar/editar obra | sim | — | — | — |
| Cadastrar/editar EPI | sim | sim | — | — |
| Gerenciar usuarios | sim | — | — | — |
| Leitura geral | sim | sim | sim | sim |

- **Almoxarife e central** (nao vinculado a obra) — qualquer almoxarife movimenta qualquer obra.
- **Tecnico de seguranca** so fiscaliza (leitura).
- O perfil `colaborador` existe no enum do DB mas esta **descontinuado** (sem login de colaborador).

---

## Deploy e infraestrutura

- **VPS**: `root@187.77.234.21` — chave SSH local em `~/.ssh/id_ed25519_hostinger`
- **Projeto na VPS**: `/root/onsafety-epi`
- **Processo**: PM2 (`onsafety-epi`, id 0), rodando `npm run start` (modo producao)
- **Supabase self-hosted**: Kong em `172.20.0.9:8000` (rede interna), publico em `https://supabase.faabengenharia.cloud`

### URLs do Supabase (importante)
- Browser/cookies: `NEXT_PUBLIC_SUPABASE_URL` (publica, HTTPS)
- Server/middleware: `NEXT_PUBLIC_SUPABASE_INTERNAL_URL` (Kong direto — host nao alcanca a URL publica via HTTPS)
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

## Fora de escopo (backlog futuro)

- **Kit por funcao**: tabela funcao→EPIs do programa de certificacao, sugestao automatica de kit na entrega, auditoria de "faltando".
- **Login de colaborador**: consulta da propria ficha.
