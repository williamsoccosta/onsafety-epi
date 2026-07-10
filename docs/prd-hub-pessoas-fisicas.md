# PRD — Hub de sincronização de Pessoas Físicas (Kamino / UAU / Radar)

Status: rascunho para validação — não iniciar implementação sem fechar as dúvidas em [docs/regras-negocio-hub-pessoas-fisicas.md](regras-negocio-hub-pessoas-fisicas.md#dúvidas-que-ainda-impedem-implementação-segura).

## Objetivo
Eliminar o cadastro manual duplicado de pessoa física (colaborador) entre `rh.funcionarios`, Kamino, UAU e Radar, usando o CPF como chave única de casamento. Replica, para pessoas, a arquitetura de hub por adapters já em produção para empresas (`core.empresas`, ver ADRs 0003–0006 do repo `ExternalAdapter` na VPS).

## Usuarios

| Papel | Ação nesta feature |
|---|---|
| Supervisor, Administrativo | Cadastram/editam funcionário em `/rh/novo` (dados que alimentam o hub) |
| Gestor (credencial `GESTOR`, hoje compartilhada) | Aprova propostas de sincronização na tela `/aprovacoes` |
| Técnico de segurança, Almoxarife | Sem ação nesta feature |

## Escopo
- Formulário `/rh/novo` dividido em duas etapas: página 1 (nome, CPF, telefone, e-mail), página 2 (demais dados hoje já existentes no form).
- Validação de dígito verificador de CPF (client + server), além do check de tamanho já existente.
- Adapter `uau-pessoas`: sincronização bidirecional com UAU, reaproveitando as tools já validadas (`pessoas_gravarpessoa`, `ExecutarConsultaGeral` Id=7).
- Adapter `kamino-pessoas`: stub dormente, mesmo padrão do `kamino-adapter` de empresas.
- Adapter `radar` (novo): fila de propostas + geração de `.csv` no formato do Radar, com aprovação humana antes do export (sem API).
- Tabela de mapa de IDs por pessoa (core, kamino, uau, radar), chaveada por CPF.
- Extensão da tela `/aprovacoes` existente para o domínio `pessoas`, reaproveitando o contrato de adapter v1 já em produção.

## Fora de escopo
- Login ou autoatendimento de colaborador.
- Escrita automática no Radar sem aprovação humana.
- Migração ou unificação retroativa de `core.pessoas` (legado, 1.847 registros) — continua não sendo fonte de verdade.
- Dado real do Kamino — bloqueado por dependência externa (schema `gold` vazio do lado deles); entregamos o stub, não a sincronização de fato.
- Alteração da ficha de visualização `/rh/[id]` — a divisão em etapas é só no cadastro (`/rh/novo`).
- Segregação maker/checker na aprovação — dívida já aceita na arquitetura de empresas, não resolvida aqui.

## Fluxo principal
**A. Cadastro humano**: Supervisor/Administrativo preenche `/rh/novo` em duas etapas → CPF validado antes de avançar → registro salvo em `rh.funcionarios`, fonte que os adapters de pessoa reconciliam.

**B. Reconciliação automática**: cron aciona `/reconciliar` em cada adapter → divergência ou registro faltante vira proposta → Gestor revisa e aprova em `/aprovacoes` → grava no destino, atualiza mapa de IDs, registra trilha em `logs.aprovacoes_auditoria` → para o Radar, aprovação gera o `.csv` para envio manual.

Detalhamento de regras, estados de UI, acessibilidade e métricas: ver [docs/regras-negocio-hub-pessoas-fisicas.md](regras-negocio-hub-pessoas-fisicas.md).

## Criterios de aceite
1. CPF com dígito verificador inválido bloqueia o avanço da etapa 1, com erro específico.
2. Voltar da etapa 2 para a etapa 1 preserva os dados já preenchidos.
3. CPF já existente em `rh.funcionarios` gera aviso de duplicidade com link para a ficha, antes de persistir.
4. Divergência detectada em `/reconciliar` aparece em `GET /propostas` com `diff` preenchido e `dominio: "pessoas"`.
5. Aprovação de proposta de pessoa grava linha em `logs.aprovacoes_auditoria` com `resultado` correto (`sucesso`/`parcial`/`erro`).
6. `.csv` exportado para o Radar contém apenas registros aprovados, no layout definido pela FAAB.
7. Adapter offline não derruba a listagem dos demais em `/aprovacoes`.
8. Cadastro completável ponta a ponta só com teclado e leitor de tela.
