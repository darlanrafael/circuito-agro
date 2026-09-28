# Spec - Funil de leads do EFAGRO Experience + régua de nomenclatura da Meta

- **Data:** 2026-09-28
- **Projeto:** `circuito-agro`
- **Evento alvo:** `saopaulo` (EFAGRO EXPERIENCE), 13/11/2026
- **Contexto do sistema:** ver [`Dashboardcircuitoagro.md`](../../../Dashboardcircuitoagro.md)

---

## 1. Problema

O EFAGRO Experience funciona diferente das outras 8 regionais. Nelas o fluxo é **investimento → venda**. No Experience é **investimento → lead → venda do comercial → vaga ocupada**. O dashboard não conhece o conceito de lead, então hoje esse evento aparece vazio.

Ao investigar, apareceram dois defeitos que impedem qualquer métrica correta desse evento:

1. **As campanhas do Experience são invisíveis.** `fetchMetaCampaigns` descarta toda campanha cujo nome não contenha `REGIONAL` ([lib/meta.ts](../../../lib/meta.ts)). As 25 campanhas do Experience seguem o padrão `[efagro_experience]_lead_frio_...` e nenhuma tem essa palavra. Resultado medido: **R$ 286.607,75 de investimento 100% fora do dashboard** (desde sempre; R$ 286.301,89 se contar só 2026).
2. **O gasto acumulado mistura duas edições.** O Experience já teve uma edição em **maio/2026**. A de novembro é outra. Somar as duas distorce qualquer custo por lead.

---

## 2. Decisões tomadas (validadas com o Rafael)

| # | Decisão |
|---|---|
| 1 | Leads entram por **webhook** disparado pelo Apps Script da planilha, mesmo padrão da Hubla. Não haverá leitura da planilha pela API do Google. |
| 2 | **O e-mail identifica a pessoa.** Quem preencheu escolhendo Standard e depois Gold é **1 lead**, com 2 manifestações de interesse. |
| 3 | Linhas de teste são **descartadas** (nome ou e-mail contendo `teste`, `testte` ou `exemplo`, sem diferenciar maiúsculas). |
| 4 | A edição atual do Experience começa em **01/07/2026**. Todo investimento e todo lead anteriores ficam fora. |
| 5 | A régua da Meta deixa de ser "tem REGIONAL no nome" e passa a ser **"casa com algum evento cadastrado"**. |
| 6 | Cadastrar os apelidos que faltam: **`BH`** em Belo Horizonte e **`EM`** (Eduardo Magalhães) em Luís Eduardo. |
| 7 | **Cascavel foi cancelado.** Continua arquivado, ganha `status = 'cancelado'`, e o investimento dele fica fora da conta. |
| 8 | Lead vira venda por **cruzamento de e-mail** entre `leads` e `sales.payer_email`. |

---

## 3. Evidência medida (2026-09-28)

### 3.1 Investimento do Experience, mês a mês

| Período | Gasto | Edição |
|---|---|---|
| Jan a Mai/2026 | R$ 199.054,18 | Maio |
| **Junho/2026** | **R$ 0,00** | intervalo |
| Jul a Set/2026 | **R$ 87.250,81** | **Novembro** |
| Total em 2026 | R$ 286.301,89 | |
| Total desde sempre | R$ 286.607,75 | |

Junho não teve gasto nenhum, o que dá um corte natural entre as edições. Os leads da lista antiga começam em **16/07/2026**, logo após o reinício. O padrão de nome das campanhas (`abr26`, `mai26`, `jul26`, `agos26`, `set26`, `NOV26`) confirma o mesmo corte.

### 3.2 Leads

| Lista | Linhas | Testes | Válidos | E-mails únicos |
|---|---|---|---|---|
| 1 - planilha antiga | 1.538 | 8 | 1.530 | 1.417 |
| 2 - LP nova | 57 | 12 | 45 | 41 |
| **Somadas** | | | | **1.455** (3 e-mails em comum) |

Lotes escolhidos: lista 1 tem `standard` 643, `vip` 520, `basic` 266, `gold` 101. Lista 2 tem `standard` 18, `não informado` 14, `vip` 9, `gold` 4. O lote `basic` só existe na lista antiga e o `não informado` só na nova.

**Custo por lead da edição de novembro: cerca de R$ 60** (R$ 87.250,81 ÷ 1.455 leads, medido em 28/09). Duas campanhas do Experience ainda estão ativas, então esse número se move todo dia.

### 3.3 Troca da régua da Meta

Conta tem **389 campanhas**, das quais só uma parte é do circuito.

| Regra | Campanhas | Gasto |
|---|---|---|
| Hoje (`REGIONAL` no nome) | 158 | R$ 442.908,11 |
| Nova, sem os apelidos novos | 174 | R$ 705.939,43 |
| **Nova, com `BH` e `EM` e sem Cascavel** | **181** | **R$ 728.088,78** |

Atribuição por evento no cenário final:

| Evento | Investimento |
|---|---|
| saopaulo (Experience) | R$ 286.607,75 |
| luiseduardo | R$ 79.444,73 |
| campogrande | R$ 67.871,21 |
| rioverde | R$ 60.953,62 |
| cuiaba | R$ 57.289,65 |
| uberlandia | R$ 56.855,23 |
| ribeirao | R$ 55.747,56 |
| belohorizonte | R$ 36.652,26 |
| sinop | R$ 26.666,77 |

**Entram 26 campanhas / R$ 286.790,42**, quase tudo Experience (R$ 286.601,05) mais uma de Rio Verde que tem `REGIONA` escrito errado.

**Saem 10 campanhas / R$ 23.759,10.** Estas não são lixo: são campanhas do circuito que hoje entram no total geral mas **já hoje não são atribuídas a evento nenhum**. Os apelidos da decisão 6 resolvem a maior parte:

| O que sai | Gasto | Destino |
|---|---|---|
| Campanhas com `BH` | R$ 12.820,66 | Belo Horizonte, via apelido novo |
| Campanhas com `EM` | R$ 9.305,11 | Luís Eduardo, via apelido novo |
| Cascavel | R$ 1.509,62 | fica fora (evento cancelado) |
| Londrina | R$ 123,82 | fica fora (não é evento do circuito) |

Risco de falso positivo dos apelidos de 2 letras foi medido na conta inteira: **`BH` casa com 5 campanhas e `EM` com 2, todas legítimas, nenhuma de outro evento.** A regra de token isolado ([lib/matching.ts](../../../lib/matching.ts)) já impede que `EM` case dentro de "BELÉM" ou "SISTEMA".

---

## 4. Modelo de dados

### 4.1 Nova tabela `leads`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `text` PK | Idempotência. Na LP nova, o `ID` da própria planilha (ex.: `mulbekf2cm3iq`). Na lista antiga, hash de `e-mail + data`. |
| `event_id` | `text` | FK → `events.id` |
| `nome` | `text` | |
| `email` | `text` | Normalizado: sem espaços nas pontas, minúsculo. É a chave da pessoa. |
| `whatsapp` | `text` | Guardado como veio; os dois formatos convivem (`5511...` e `(11) 9...`) |
| `lote` | `text` | `basic` \| `standard` \| `vip` \| `gold` \| `nao_informado` |
| `origem` | `text` | `planilha_antiga` \| `lp_nova` |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` | `text` | Da planilha antiga em colunas próprias; da LP nova, extraídos da URL da coluna `Página` |
| `lead_date` | `timestamptz` | Data/hora do preenchimento, gravada em UTC |
| `payload` | `jsonb` | Linha crua, para auditoria |
| `created_at` | `timestamptz` | |

Índices: `event_id`, `email`, `lead_date`.
RLS liberada para `anon`, mesmo padrão de `event_costs` e `unmatched_sales`.

### 4.2 Coluna nova em `events`

| Campo | Tipo | Descrição |
|---|---|---|
| `captacao_inicio` | `date \| null` | Início da edição atual. Investimento e leads anteriores a esta data não contam. `saopaulo` recebe `2026-07-01`. Nula nos demais eventos, que seguem com o comportamento de hoje. |

Isso é o que impede a edição de maio de poluir a de novembro, e o que torna a próxima virada de edição uma troca de data em vez de uma mudança de código.

---

## 5. Entrada de leads

### 5.1 Webhook (`POST /api/leads/webhook`)

O Apps Script da planilha **já existe e já dispara um POST para a Meta** (coluna `Meta API` da LP nova, com `ok` em 35 linhas). A mudança é acrescentar uma segunda chamada, para a nossa rota.

Comportamento da rota:

1. Rejeita linha de teste (regra da decisão 3) e responde `skipped_test`.
2. Acha o evento. Se não achar, **não** usa a tabela `unmatched_sales` (aquela é de vendas): responde `skipped_no_event` e registra no log. *(ver ponto aberto 8.2)*
3. Normaliza o e-mail e o lote.
4. `upsert` em `leads` pelo `id`, então reenvio não duplica.
5. Responde sempre `200`, para o Apps Script não ficar reenviando.

### 5.2 Importação inicial

Script pontual, no mesmo molde do que importou as vendas de Sinop: lê os dois CSVs, aplica as mesmas regras de limpeza e dedup, grava os 1.455 leads, e imprime a conferência contra os números da seção 3.2. Roda uma vez.

---

## 6. Régua da Meta

`fetchMetaCampaigns` passa a receber a lista de eventos ativos e filtra por `eventMatchesText` em vez da palavra fixa `REGIONAL`. Consequências:

- `totalSpend` deixa de significar "tudo que tem REGIONAL" e passa a significar "tudo que pertence a algum evento do circuito". É uma definição mais defensável, e é a que faz o Experience aparecer.
- Evento arquivado ou cancelado não entra no filtro. É assim que Cascavel sai da conta.
- Quando o evento tem `captacao_inicio`, o gasto considerado é só o do período a partir dessa data.

Antes de rodar, aplicar no banco: apelido `BH` em `belohorizonte`, apelido `EM` em `luiseduardo`, e `status = 'cancelado'` em `cascavel`.

---

## 7. Tela

O Experience ganha um bloco de funil no Dashboard, visível só para eventos que tenham leads:

```
Investimento  →  Leads  →  Vendas  →  Vagas ocupadas
R$ 87.247,71     1.455       (Hubla)     (de 350)
                 CPL R$ 59,97   conversão %
```

Os outros 8 eventos não mudam nada. A linha do Experience em "Próximos" ganha os números de lead; as demais seguem como estão.

---

## 8. Fora de escopo e pontos abertos

1. **Não** entra leitura da planilha pela API do Google. Se o Apps Script parar, os leads param, e isso é aceito.
2. **Lead sem evento correspondente** não tem destino definido. Hoje só loga. Se acontecer na prática, vale uma tabela de órfãos como a das vendas.
3. **Capacidade de 350 está fixa no código** para todos os eventos ([Dashboard.tsx](../../../app/components/Dashboard.tsx)), apesar da coluna `capacity` existir. O Experience provavelmente tem outra lotação. Precisa ser confirmado antes de a métrica de "vagas ocupadas" significar alguma coisa.
4. **Cruzamento lead → venda por e-mail** é frágil se a pessoa compra com outro e-mail. Não há plano B nesta versão.
5. A lista antiga e a nova têm **lotes diferentes** (`basic` só na antiga, `não informado` só na nova). O funil mostra os dois sem tentar unificar.
6. **O ingresso de R$ 247 de Cascavel continua marcado como pago** num evento cancelado. É questão administrativa, não de código, mas está registrado aqui.

---

## 9. Como verificar quando estiver pronto

- `POST` de teste na rota com uma linha real da LP nova cria exatamente 1 registro; reenvio do mesmo `ID` não cria um segundo.
- `POST` com nome "Teste Silva" não cria registro nenhum.
- Importação inicial fecha em **1.455 leads** para `saopaulo`, conferido por consulta ao banco.
- `/api/meta/campaigns?date_preset=maximum` passa a devolver **181 campanhas** e **R$ 728.088,78**, com a atribuição por evento da seção 3.3. O gasto do `saopaulo` a partir de 01/07/2026 fica na casa dos **R$ 87,2 mil** (valor exato varia, há campanha ativa).
- Belo Horizonte e Luís Eduardo passam a receber R$ 12.820,66 e R$ 9.305,11 que hoje ficam órfãos.
- Cascavel não aparece em nenhum total.
