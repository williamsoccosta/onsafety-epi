---
name: screens-to-ia
description: Gera a arquitetura de informacao do produto (sitemap +
  hierarquia de conteudo por tela) a partir dos modulos existentes.
  Use para mapear navegacao antes de adicionar uma tela nova.
invocation: user
---
Leia CONTEXT.md (secao de Modulos) e a estrutura real de src/app.
Gere em Markdown:
- Sitemap: arvore de rotas por modulo, indicando se e pagina unica
  ou modulo com sub-paginas/sidebar contextual.
- Por tela: proposito em 1 frase, quem acessa (perfil), e o que essa
  tela deliberadamente NAO deveria conter.
- Pontos de entrada e saida entre modulos (deep links, links
  cruzados, ex.: ficha de colaborador -> ficha de RH).
Saida pronta pra colar em docs/. Nao invente modulo que nao existe —
se a analise sugerir um modulo novo, marque como proposta explicita,
nunca como fato ja implementado.
