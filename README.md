# onsafety-epi

Sistema de gestão de almoxarifado de EPI (Equipamento de Proteção Individual) para os canteiros de obras da FAAB Engenharia. Usado em campo por almoxarife, supervisor, administrativo e técnico de segurança para controlar entrega, substituição e devolução de EPIs, com assinatura do colaborador e ficha em PDF conforme NR-06.

Domínio completo (glossário, decisões de arquitetura, fluxo de deploy): [CONTEXT.md](CONTEXT.md).

## Como rodar

```bash
npm install
npm run dev
```

Abre em [http://localhost:3000](http://localhost:3000). Precisa de um `.env.local` com as variáveis do Supabase (não versionado — pedir ao time).

Outros comandos:

```bash
npm run build   # build de produção
npm run start   # roda o build de produção
npm run lint    # eslint
```

Não há suíte de testes automatizados configurada hoje.

Deploy é via `git push` + `git pull` na VPS (fluxo detalhado no [CONTEXT.md](CONTEXT.md#deploy-e-infraestrutura)) — não editar arquivos direto na VPS.

## Estrutura de pastas

```
src/
  app/              rotas Next.js (App Router) — cada pasta é um módulo
    api/            rotas de API internas
    auth/, login/   autenticação
    ca/             Consulta CA (catálogo externo de Certificados de Aprovação)
    colaboradores/  ficha e entrega de EPI ao colaborador
    dashboard/      indicadores e gráficos
    empresas/       cadastro de empresas via CNPJ (BrasilAPI)
    epis/           inventário de EPI da obra
    materiais/      catálogo geral de insumos (5 segmentos, EPI é um deles)
    movimentacoes/  entradas/saídas de estoque
    obras/          canteiros de obra
    rh/             ficha cadastral completa de funcionário
    trocas/         Agenda de Trocas (vida útil de EPI)
    usuarios/       gestão de usuários e perfis
  components/       UI compartilhada entre módulos
  hooks/            hooks React compartilhados
  lib/              clients Supabase, auth, tipos, constantes
docs/               PRDs e regras de negócio de features em desenho
scripts/            SQL de manutenção (RLS, estoque mínimo)
plans/              planos de implementação de mudanças pontuais
```

## Convenções e design

- [AGENTS.md](AGENTS.md) — regras para agentes de IA trabalharem neste repo (stack, comandos, convenções, o que não tocar).
- [design.md](design.md) — fonte da verdade de design (tokens de cor/tipografia, componentes, acessibilidade, antipadrões). Leitura obrigatória antes de criar ou alterar qualquer interface.
- [CONTEXT.md](CONTEXT.md) — glossário de domínio e decisões de arquitetura.

## Mantendo este README atualizado

Sempre que uma mudança estrutural acontecer (nova pasta de módulo em `src/app`, novo comando em `package.json`, mudança no fluxo de deploy, criação/remoção de `AGENTS.md`/`design.md`/`CONTEXT.md`), este README precisa ser atualizado junto. Se você (agente) fizer uma dessas mudanças e não atualizar o README no mesmo turno, avise o usuário explicitamente antes de encerrar a resposta.
