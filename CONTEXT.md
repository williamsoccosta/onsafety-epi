# Contexto de Domínio — Onsafety EPI

Sistema de gestão de almoxarifado de EPI para canteiros de obras da FAAB Engenharia.

---

## Glossário

### Obra
Canteiro de obras onde a FAAB executa um contrato. Cada obra tem estoque próprio de EPI.  
Campos: `nome`, `cliente` (texto livre), `ativa` (boolean).  
Uma obra inativa não recebe mais movimentações mas permanece no histórico.

### Cliente
Empresa contratante de uma ou mais obras. Não existe tabela separada de clientes — o nome é armazenado como texto livre no campo `obras.cliente`. O agrupamento de obras por cliente é feito em memória pelo valor desse campo. Obras sem cliente (`null`) formam o grupo "Sem cliente".

### EPI (Equipamento de Proteção Individual)
Item de proteção cadastrado no inventário da empresa (`epi.itens`). Cada EPI pode ter um CA vinculado com data de validade própria (`ca_validade`).

### CA (Certificado de Aprovação)
Certificado emitido pelo Ministério do Trabalho que valida um EPI para uso. Possui número, data de validade e situação (`VALIDO` ou `VENCIDO`).

Existem dois contextos de CA no sistema:
- **Catálogo externo** (`catalogo.fichas_tecnicas`): base de referência com todos os CAs disponíveis, consultada na página "Consulta CA".
- **CA do item** (`epi.itens.ca` + `epi.itens.ca_validade`): o certificado vinculado a um EPI específico no inventário da empresa.

### Catálogo
Base externa de fichas técnicas de CAs (`catalogo.fichas_tecnicas`). Usada como referência de consulta e para auto-preencher dados de EPIs no cadastro.

### Movimentação
Registro de entrada ou saída de EPI no estoque de uma obra. Tipos: `Entrada`, `Quantidade Inicial`, `Entrega`, `Substituicao`, `Devolucao`. Entregas exigem colaborador identificado (rastreabilidade NR-06).

### Colaborador
Trabalhador que recebe EPIs. Identificado por nome, matrícula e função. Cada entrega é registrada na ficha individual do colaborador.

---

## Deploy e infraestrutura

- **VPS**: `root@187.77.234.21` — chave SSH local em `~/.ssh/id_ed25519_hostinger`
- **Projeto na VPS**: `/root/onsafety-epi`
- **Processo**: PM2 (`onsafety-epi`, id 0), rodando `npm run start` (modo produção)

### Fluxo de deploy
O git é a fonte de verdade. Nunca editar arquivos diretamente na VPS — mudanças não commitadas causam conflitos no próximo `git pull`.

```bash
# Localmente:
git add <arquivos> && git commit -m "..." && git push origin main

# Na VPS:
ssh -i ~/.ssh/id_ed25519_hostinger root@187.77.234.21 \
  "cd /root/onsafety-epi && git pull origin main && npm install && npm run build && pm2 restart all"
```

---

## Decisões de design

### Agrupamento de obras por cliente
A página "Obras" exibe obras agrupadas por cliente. Ordenação: alfabética pelo nome do cliente. Header do container: nome do cliente + total de obras + quantas ativas. Obras sem cliente formam o grupo "Sem cliente" ao final. Obras inativas são ocultadas por padrão; um filtro global `?inativas=1` as revela. O campo cliente no formulário usa `<datalist>` com sugestões dos clientes existentes para evitar fragmentação de grupos por erro de digitação.

### Filtro de CAs vencidos no catálogo
A página "Consulta CA" tem um checkbox "Mostrar apenas vencidos" que filtra `situacao = 'VENCIDO'` no catálogo externo. O filtro funciona de forma independente da busca por número de CA, via URL param `?vencidos=1`.
