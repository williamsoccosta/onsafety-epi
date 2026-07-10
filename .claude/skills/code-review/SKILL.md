---
name: code-review
description: Revisa as mudancas (diff) antes do PR: correcao,
  seguranca, estilo, acessibilidade e aderencia ao design system.
invocation: user
---
Revise as mudancas da branch atual. Por arquivo, cheque:
1. Bugs e casos de borda.
2. Seguranca: nenhum segredo no codigo; entradas validadas.
3. Convencoes (AGENTS.md): nomes, estrutura, 1 componente/arquivo.
4. Design system (design.md): tokens e componentes, sem valor solto.
5. Acessibilidade: foco, teclado, contraste, estados.
Liste por severidade com correcao. Nao aprove se houver segredo
exposto ou violacao critica de acessibilidade.
