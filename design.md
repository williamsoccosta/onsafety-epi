# design.md — fonte da verdade de design (onsafety-epi)

## Princípios
1. Clareza antes de decoração — é ferramenta de campo, não vitrine.
2. Uma âncora visual por tela.
3. Cada seção tem um único trabalho.
4. Acessível por padrão.

## Voz & tom
Direto, profissional, sem jargão de SaaS. Termos do canteiro, não termos de produto (usar o [glossário do CONTEXT.md](CONTEXT.md#glossario) — "Entrega", "Substituição", "Ficha", nunca sinônimos inventados). Frases curtas, imperativo claro nos botões ("Registrar entrega", não "Confirmar").

## Tokens
Definidos em [src/app/globals.css](src/app/globals.css) como CSS custom properties — usar sempre a variável, nunca hex solto.

- **Canvas/superfície**: `--canvas` #eeece7 · `--surface` #f8f7f4 · `--surface-2` #e7e4dd (inputs) · `--surface-raised` #fcfbf9 (dropdowns/popovers)
- **Texto** (hierarquia de 4 níveis): `--ink` #2a2722 · `--ink-secondary` #5c574e · `--ink-tertiary` #8b8579 · `--ink-muted` #b3ada1
- **Bordas**: `--line` / `--line-soft` / `--line-strong` (rgba sobre o canvas) · `--line-focus` rgba(180,95,6,.55)
- **Acento — um só**: `--accent` #b45f06 (âmbar de canteiro/sinalização) · `--accent-ink` #fffaf0 · `--accent-soft` rgba(180,95,6,.12)
- **Semântico**: `--danger` #a3321f · `--success` #5b6b3a (+ variantes `-soft`)
- **Tipografia**: display/UI "Space Grotesk" (`--font-display`, pesos 500/600/700) · tabular/monoespaçado "IBM Plex Mono" (`--font-mono`) para matrícula, CA, datas, código
- **Raio**: `--radius-sm` 4px · `--radius-md` 8px (padrão de botão/input/card) · `--radius-lg` 14px
- **Espaçamento**: `--space-1` a `--space-8` = 4 / 8 / 12 / 16 / 24 / 32px

## Componentes (estados obrigatórios)
Button, Field (input/select), Card, Modal/Sheet, Toast — nenhum desses tem componente dedicado no repo hoje além de padrões inline; ao criar um, cobrir todos os estados abaixo:
default / hover / focus / disabled / loading / erro.

Padrões já em uso a seguir (não reinventar): `rounded-md` como raio padrão, `disabled:opacity-40`, `transition-colors` em hovers, texto de UI em 11–13px, `.selo` como padrão de badge/etiqueta de status (ver `.selo--ok` / `.selo--off` / `.selo--alert` no globals.css).

## Acessibilidade
Contraste AA. Foco visível (usar `--line-focus`, nunca remover outline sem substituto). Alvos de toque ≥ 44px (uso em campo, luva/tela suja). Cobrir sempre loading/erro/vazio/sucesso — ver requisito de acessibilidade já registrado em [docs/regras-negocio-hub-pessoas-fisicas.md](docs/regras-negocio-hub-pessoas-fisicas.md).

## Rejeitar (antipadrões)
- Cor fora da paleta acima — nada de azul/verde/roxo genérico de SaaS. O acento é único (`--accent`).
- Mais de uma família tipográfica além de display + mono.
- Sombra pesada / cartão flutuante estilo dashboard genérico — o visual é "concreto morno", não glassmorphism.
- Esconder ou omitir estado de erro/vazio para simplificar a tela.
- Ironia: o grid de módulos da home é intencional (ver CONTEXT.md, "Navegação por grid de módulos") — não é o antipadrão de "grade genérica de cards", é decisão de navegação registrada. Não confundir os dois.

## Checagens finais (litmus)
- Dá pra reconhecer que é o onsafety-epi só pela paleta (âmbar + concreto morno), sem ver o logo?
- Dá pra entender a tela só pelos títulos e pela hierarquia de texto (`--ink` → `--ink-muted`)?
- Todo estado de erro/vazio/loading tem um texto correspondente, não só ausência de conteúdo?
