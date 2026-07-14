# Pendências para decisão da FAAB — Hub de Pessoas Físicas

Uma questão ainda trava o início da implementação do [PRD do Hub de Pessoas](prd-hub-pessoas-fisicas.md). As demais dúvidas já foram resolvidas tecnicamente (ver [detalhamento completo](regras-negocio-hub-pessoas-fisicas.md)) — inclusive o tratamento do CPF legado, decidido em 2026-07-14 (campanha de correção manual; ver seção abaixo).

---

## 1. Layout do arquivo CSV para o Radar

**O que falta**: o adapter que envia propostas aprovadas para o Radar vai gerar um arquivo `.csv` para importação manual (não há integração via API com o Radar nesta fase). Precisamos do **modelo/layout exato** que o Radar espera — quais colunas, em que ordem, formato de data, encoding, e se existe um limite de linhas por arquivo de importação.

**O que pedir à FAAB/time do Radar**:
- Um arquivo de exemplo (mesmo que só com o cabeçalho) do formato de importação de pessoas que o Radar aceita hoje.
- Confirmação se há limite de registros por importação.

**Sem isso**: o adapter `radar` não pode ser implementado — fica como stub até o modelo chegar.

---

## 2. CPFs já cadastrados sem dígito verificador válido — ✅ Decidido em 2026-07-14

Auditoria mostrou **10 de 10 registros (100%)** com CPF inválido. Dado o tamanho pequeno da base, foi escolhida a **campanha de correção manual**: revisar e corrigir cada um dos 10 CPFs comparando com o documento oficial, antes de ativar os adapters de pessoa. A lista dos funcionários afetados (nome + CPF atual + link da ficha) foi gerada e entregue fora deste repositório — não é versionada aqui por conter dado pessoal.

**Ainda em aberto**: quem vai revisar os cadastros (Supervisor, Administrativo, ou outra pessoa) e até quando — os adapters de pessoa não devem ser ativados antes da campanha fechar.

---

## Enquanto isso

Nada na pendência acima bloqueia o resto da implementação (formulário em duas etapas, adapter `uau-pessoas`, tabela de mapa de IDs, extensão da tela `/aprovacoes`). Só o adapter `radar` (pendência 1) segue esperando o layout do CSV.
