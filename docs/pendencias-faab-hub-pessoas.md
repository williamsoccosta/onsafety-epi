# Pendências para decisão da FAAB — Hub de Pessoas Físicas

Duas questões ainda travam o início da implementação do [PRD do Hub de Pessoas](prd-hub-pessoas-fisicas.md). As demais dúvidas já foram resolvidas tecnicamente (ver [detalhamento completo](regras-negocio-hub-pessoas-fisicas.md)). Estas duas dependem de informação ou decisão que só a FAAB tem.

---

## 1. Layout do arquivo CSV para o Radar

**O que falta**: o adapter que envia propostas aprovadas para o Radar vai gerar um arquivo `.csv` para importação manual (não há integração via API com o Radar nesta fase). Precisamos do **modelo/layout exato** que o Radar espera — quais colunas, em que ordem, formato de data, encoding, e se existe um limite de linhas por arquivo de importação.

**O que pedir à FAAB/time do Radar**:
- Um arquivo de exemplo (mesmo que só com o cabeçalho) do formato de importação de pessoas que o Radar aceita hoje.
- Confirmação se há limite de registros por importação.

**Sem isso**: o adapter `radar` não pode ser implementado — fica como stub até o modelo chegar.

---

## 2. CPFs já cadastrados sem dígito verificador válido

**O que encontramos**: fizemos uma auditoria (agregada, sem expor dado pessoal) na base atual de `rh.funcionarios` e **100% dos registros cadastrados hoje têm CPF com dígito verificador inválido**. Não é uma minoria — é a base inteira.

**Por que isso importa**: o hub usa o CPF como chave única para casar o cadastro do funcionário com os sistemas externos (UAU, Kamino, Radar). Se o CPF estiver incorreto, o casamento pode falhar silenciosamente ou casar com a pessoa errada.

**Três caminhos possíveis — a FAAB precisa escolher um**:

| Opção | O que significa | Trade-off |
|---|---|---|
| **(a) Aceitar como está** | O hub passa a reconciliar com os CPFs já cadastrados, mesmo sabendo que o dígito verificador falha | Mais rápido de implementar, mas risco de casamento incorreto ou proposta rejeitada por divergência em 100% dos casos iniciais |
| **(b) Campanha de correção manual** | Alguém da FAAB revisa e corrige os 10 CPFs cadastrados antes de ativar os adapters | Mais seguro, mas exige esforço manual antes de ligar a sincronização |
| **(c) Validar só cadastros novos** | Novos cadastros exigem CPF com dígito válido; registros já existentes continuam editáveis sem essa exigência | Meio-termo — não trava o uso do RH hoje, mas adia o problema pros registros antigos |

**Pergunta direta pra levar à FAAB**: qual das três opções acima? Se for a (b), quem vai revisar os cadastros — Supervisor, Administrativo, ou outra pessoa?

---

## Enquanto isso

Nada nas duas pendências acima bloqueia o resto da implementação (formulário em duas etapas, adapter `uau-pessoas`, tabela de mapa de IDs, extensão da tela `/aprovacoes`). Só o adapter `radar` (pendência 1) e a decisão de tratamento do CPF legado (pendência 2) dependem dessas respostas.
