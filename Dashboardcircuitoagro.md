# 📊 Dashboard Circuito Agro — Documentação Mestra

> **Documento de memória permanente e guia de implementação.**
> Cole este arquivo (ou aponte o Claude para ele) ao iniciar um chat novo — ele descreve toda a
> arquitetura, regras de negócio, modelo de dados e convenções do sistema, sem precisar reler o código.
>
> - **Projeto:** `circuito-agro` (título público: *Circuito Nacional Jurídico Agro 2026*)
> - **Marca / identidade visual:** EFAGRO Regional (dark mode fixo)
> - **Pasta local:** `/Users/rafael/circuito-agro`
> - **Repositório:** https://github.com/darlanrafael/circuito-agro.git
> - **Última atualização deste doc:** 2026-07-17

> **Changelog 2026-07-17** (branch `melhorias-dashboard-2026-07`): regra de casamento unificada (`lib/matching.ts`); cálculos financeiros (`lib/finance.ts`); testes com **Vitest**; **arquivamento** de eventos (soft-delete) no lugar de exclusão; **UTMs extras por evento** (`utm_aliases`, tag input); **custos operacionais** (`event_costs`) com **Investimento Total** e **ROI Real**; investimento Meta por evento em "Realizados"; filtros rápidos da Análise agora dinâmicos. **Requer rodar `supabase/migrations/2026-07-17_melhorias.sql`.**

---

## 1. Visão geral

Dashboard interno de acompanhamento de um circuito de **8 eventos presenciais** (8 cidades pelo Brasil, Jul–Out 2026). Ele consolida, por evento e por período:

- **Vendas de ingressos** (individuais e duplos) vindas da plataforma **Hubla** via webhook.
- **Investimento em tráfego pago** vindo da **Meta Ads API** (Facebook Graph).
- **Métricas financeiras**: faturamento bruto, líquido, CPA, balanço, ROAS.
- **Atribuição de vendas por UTM**: quanto do faturamento veio rastreado de campanha, quanto veio com UTM "bugada" e quanto é de origem desconhecida (orgânico/direto).

É uma ferramenta de gestão de acesso restrito (login), com três telas principais + painel admin.

---

## 2. Stack técnica

| Camada | Tecnologia | Observações |
|--------|-----------|-------------|
| Framework | **Next.js 16.2.7** (App Router) | ⚠️ Versão nova — checar `node_modules/next/dist/docs/` antes de assumir APIs antigas |
| UI | **React 19.2.4** | Server Components + Client Components |
| Estilo | **Tailwind CSS v4** (`@tailwindcss/postcss`) + estilos inline | Import via `@import "tailwindcss"` em `globals.css` |
| Banco de dados | **Supabase** (`@supabase/supabase-js` ^2.107) | Postgres gerenciado; client anônimo |
| Linguagem | **TypeScript 5** | `strict`, path alias `@/* → ./*` |
| Fonte | Geist (via `next/font/google`) | |
| Deploy | Vercel (inferido pelos assets/config) | |

Scripts (`package.json`): `dev` (`next dev`), `build`, `start`, `lint` (`eslint`).

---

## 3. Estrutura de pastas

```
circuito-agro/
├── app/
│   ├── layout.tsx              # Root layout (html pt-BR, fonte Geist, ClientLayout)
│   ├── page.tsx                # ROTA "/" — Dashboard (Server Component, lê events do Supabase)
│   ├── globals.css             # Tailwind + tema dark fixo
│   ├── types.ts                # AppEvent, SessionUser, EventStatus, BandeiraTipo
│   ├── favicon.ico
│   │
│   ├── login/page.tsx          # ROTA "/login"
│   ├── analise/page.tsx        # ROTA "/analise" (AuthGuard → AnalysisPage)
│   ├── admin/page.tsx          # ROTA "/admin" (AuthGuard requireAdmin → AdminPage)
│   │
│   ├── api/                    # Route Handlers (backend)
│   │   ├── auth/route.ts       # POST login (usuários hardcoded/env)
│   │   ├── events/route.ts     # GET/POST/PUT/DELETE eventos (Supabase)
│   │   ├── sales/route.ts      # GET vendas filtradas (Supabase)
│   │   ├── meta/campaigns/route.ts   # GET campanhas Meta Ads
│   │   ├── utm/analysis/route.ts     # GET análise de atribuição UTM
│   │   └── hubla/webhook/route.ts    # POST webhook Hubla (vendas + reembolsos)
│   │
│   ├── hooks/useAuth.ts        # Lê sessão do localStorage
│   └── components/
│       ├── ClientLayout.tsx    # Wrapper client (envolve ThemeProvider)
│       ├── ThemeProvider.tsx   # ⚠️ VESTIGIAL — sempre 'dark', no-op
│       ├── ThemeToggle.tsx     # ⚠️ VESTIGIAL — tema é fixo
│       ├── NavBar.tsx          # Navegação (Dashboard / Análise UTM / Admin)
│       ├── AuthGuard.tsx       # Proteção client-side de rota
│       ├── LoginPage.tsx       # Formulário de login
│       ├── Dashboard.tsx       # Tela principal (cards + eventos + filtros)
│       ├── AnalysisPage.tsx    # Tela de análise UTM/ROAS
│       ├── AdminPage.tsx       # CRUD de eventos
│       ├── EventForm.tsx       # Formulário criar/editar evento
│       ├── EventRow.tsx        # Linha de evento (aba "Próximos")
│       ├── EventRealizadoRow.tsx  # Linha de evento (aba "Realizados")
│       ├── FinancialCard.tsx   # Card financeiro (com refresh opcional)
│       ├── IndicatorCard.tsx   # Card de indicador
│       └── StateFlagSVG.tsx    # Bandeiras dos estados (SVG inline) + upload/URL
│
├── lib/
│   ├── supabase.ts             # Cliente Supabase (anon key)
│   ├── meta.ts                 # fetchMetaCampaigns() — Facebook Graph API
│   └── utils.ts                # removeAccents()
│
├── data/
│   ├── events.json             # ⚠️ LEGADO/seed — NÃO é a fonte de verdade (Supabase é)
│   └── users.json              # ⚠️ LEGADO — gitignored, não usado pelo /api/auth atual
│
├── public/                     # logo-efagro-regional.png + SVGs padrão do Next
├── .env.local                  # Segredos (NÃO commitado)
├── next.config.ts / tsconfig.json / eslint.config.mjs / postcss.config.mjs
```

---

## 4. Arquitetura & fluxo de dados

```
                         ┌─────────────────┐
   Hubla (checkout) ─────▶  POST /api/hubla/webhook
                         │   • valida tipo (payment/refund)
                         │   • acha o evento (match por UTM/cidade)
                         │   • incrementa contadores no events
                         │   • insere linha em sales
                         └────────┬────────┘
                                  ▼
                         ┌─────────────────┐          ┌──────────────────┐
                         │    SUPABASE     │          │   Meta Ads API   │
                         │  events, sales  │          │ (Facebook Graph) │
                         └───┬────────┬────┘          └────────┬─────────┘
                             │        │                        │
             GET /api/events │        │ GET /api/sales         │ lib/meta.ts
             GET /api/utm/…  │        │ GET /api/meta/campaigns │
                             ▼        ▼                        ▼
                       ┌───────────────────────────────────────────┐
                       │  UI (Client Components, fetch por período) │
                       │  Dashboard · AnalysisPage · AdminPage      │
                       └───────────────────────────────────────────┘
```

**Princípios:**
- A **fonte de verdade em runtime é o Supabase** (tabelas `events` e `sales`). Os arquivos em `data/*.json` são legado/seed e **não** são lidos pela aplicação.
- `app/page.tsx` é **Server Component** (`export const dynamic = "force-dynamic"`) e lê `events` direto do Supabase no servidor. As telas interativas (`Dashboard`, `AnalysisPage`, `AdminPage`) são **Client Components** que buscam dados via `fetch` para as API routes conforme o filtro de período muda.
- Rotas de API que dependem de dados frescos usam `export const dynamic = "force-dynamic"`.

---

## 5. Modelo de dados

### 5.1 Tabela `events` (Supabase) — tipo `AppEvent` (`app/types.ts`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `string` | Gerado da cidade: minúsculas, sem acento/espaço (ex.: "Rio Verde" → `rioverde`) |
| `city` | `string` | Nome da cidade |
| `state` | `string` | UF (ex.: `MT`, `GO`) |
| `date` | `string` | `YYYY-MM-DD` |
| `individualTickets` | `number` | Contador acumulado de ingressos individuais |
| `doubleTickets` | `number` | Contador acumulado de ingressos duplos |
| `capacity` | `number` | Capacidade (campo existe, mas o Dashboard assume 350 fixo — ver §7.6) |
| `trafficInvestment` | `number` | Investimento manual (fallback quando Meta não configurada) |
| `participantes_final` | `number` | Participantes reais (pós-evento) |
| `faturamento_bruto` | `number` | Faturamento bruto acumulado |
| `faturamento_liquido` | `number` | Faturamento líquido acumulado |
| `stateName` | `string` | Nome do estado (preenchido = UF no form) |
| `status` | `EventStatus` | `em_andamento` \| `adiado` \| `realizado` \| `cancelado` |
| `bandeira_tipo` | `BandeiraTipo` | `auto` (SVG) \| `upload` (base64) \| `url` |
| `bandeira_url` | `string` | URL da imagem (se tipo `url`) |
| `bandeira_custom` | `string` | Base64 da imagem (se tipo `upload`) |
| `utm_nomenclatura` | `string` | Nomenclatura principal da campanha, UPPERCASE (ex.: `CUIABA`, `RIOVERDE`) |
| `utm_aliases` | `text[]` | UTMs extras que também atribuem ao evento (ex.: `{EM,LEM}`). Editável por tags no Admin. |
| `is_archived` | `boolean` | Soft-delete: `true` oculta o evento de todas as telas (reversível). Default `false`. |

> `created_at` existe no banco e é **removido** (`{ id, created_at, ...rest }`) antes de insert/update em `/api/events`.

### 5.2 Tabela `sales` (Supabase)

Cada venda aprovada/reembolsada é uma linha. Colunas usadas no código:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `string` | `invoice.id` da Hubla, ou `crypto.randomUUID()` se ausente (idempotência de reembolso depende disso) |
| `event_id` | `string` | FK → `events.id` |
| `offer_name` | `string` | Nome da oferta na Hubla (usado no matching de atribuição) |
| `ticket_type` | `"individual" \| "duplo"` | Determinado por "DUPLO"/"DOUBLE" no nome da oferta |
| `faturamento_bruto` | `number` | `totalCents / 100` |
| `faturamento_liquido` | `number` | `(totalCents − taxa da plataforma) / 100` |
| `payer_email` / `payer_name` | `string \| null` | Comprador |
| `payment_method` | `string \| null` | |
| `sale_date` | `string (ISO)` | Data da venda (usada nos filtros de período) |
| `status` | `string \| null` | `"refunded"` quando estornada; caso contrário aprovada |
| `refunded_at` | `string \| null` | Timestamp do estorno |

### 5.3 `SessionUser` (`app/types.ts`)

```ts
type SessionUser = { email: string; nome: string; role: string };  // role: "admin" | "viewer"
```

### 5.4 Tabela `event_costs` (Supabase) — tipo `EventCost` (`lib/finance.ts`)

Custos operacionais por evento (all-time, sem data de venda).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `uuid` | PK |
| `event_id` | `text` | FK → `events.id` (`on delete cascade`) |
| `categoria` | `text` | `espaco` \| `staff` \| `alimentacao` \| `transmissao` \| `deslocamento` \| `outros` |
| `descricao` | `text \| null` | Livre |
| `valor` | `numeric` | Valor em R$ |
| `created_at` | `timestamptz` | |

Migração: `supabase/migrations/2026-07-17_melhorias.sql`.

---

## 6. Rotas

### 6.1 Páginas (App Router)

| Rota | Proteção | Componente |
|------|----------|-----------|
| `/` | `AuthGuard` | `Dashboard` (dados de `events` via Server Component) |
| `/analise` | `AuthGuard` | `AnalysisPage` |
| `/admin` | `AuthGuard requireAdmin` | `AdminPage` |
| `/login` | pública | `LoginPage` |

### 6.2 API Routes

| Método + rota | Função |
|---------------|--------|
| `POST /api/auth` | Valida email/senha contra lista de usuários (hardcoded, sobrescrevível por env). Retorna o usuário **sem** a senha. |
| `GET /api/events` | Lista eventos **não arquivados**; `?all=1` inclui arquivados (usado pelo Admin). |
| `POST /api/events` | Cria evento (remove `id`/`created_at` do body e reinsere `id` gerado). |
| `PUT /api/events` | Atualiza evento por `id` (também usado para arquivar/restaurar via `is_archived`). |
| `DELETE /api/events` | Exclui por `id` (⚠️ falha por FK se houver vendas — a UI usa **arquivar**, não excluir). |
| `GET/POST/DELETE /api/events/costs` | CRUD de custos operacionais (`?event_id=` no GET). |
| `GET /api/sales` | Vendas filtradas por `from`, `to`, `event_ids` (CSV). |
| `GET /api/meta/campaigns` | Campanhas Meta por `date_preset`/`from`/`to`/`city`. `503 not_configured` se faltar env. |
| `GET /api/utm/analysis` | Análise de atribuição UTM por `city`, `date_preset`/`from`/`to`. |
| `POST /api/hubla/webhook` | Recebe eventos da Hubla (venda aprovada, reembolso). |

---

## 7. Regras de negócio (o coração do sistema)

### 7.1 Casamento evento ↔ texto — `lib/matching.ts` (FONTE ÚNICA)

`removeAccents()` (`lib/utils.ts`) normaliza: `NFD → remove diacríticos → não-alfanumérico vira espaço → colapsa → trim → UPPERCASE`. `normNS()` remove também os espaços (`"RIO VERDE"` → `"RIOVERDE"`).

**`eventMatchesText(ev, text)`** é a regra única usada em vendas, investimento, webhook e realizados. Retorna `true` se:
1. `utm_nomenclatura` casa o texto, **OU**
2. qualquer valor de `utm_aliases` casa, **OU**
3. fallback por cidade: ≥ `min(nº palavras, 2)` palavras (>2 chars) da cidade presentes.

> **Guardrail:** códigos ≤ 3 chars (ex.: `EM`, `LEM`) só casam como **token isolado**, nunca substring — evita `"EM"` bater dentro de `"BELEM"`/`"SISTEMA"`. Coberto por testes em `lib/matching.test.ts`.

`spendForEvent(ev, campaigns)` soma o `spend` das campanhas Meta que casam com o evento. **Testado com Vitest** (`npm test`).

### 7.2 Webhook Hubla — venda aprovada (`invoice.payment_succeeded`)

1. Extrai o **nome da oferta** de `event.products[0].offers[0].name`.
2. **Acha o evento** (`findEvent`), em duas passadas:
   - **a.** Cada palavra da `utm_nomenclatura` (normalizada) presente na oferta → match.
   - **b.** Fallback: cada palavra do nome da **cidade** presente na oferta → match.
3. **Tipo de ingresso**: `isDouble()` = oferta contém "DUPLO" ou "DOUBLE" → duplo; senão individual.
4. **Valores**:
   - `faturamento_bruto = totalCents / 100`
   - `faturamento_liquido = (totalCents − platformCents) / 100` (subtrai a taxa do receiver `role: "platform"`)
5. **Incrementa** os contadores do evento (`individualTickets`/`doubleTickets`, `faturamento_bruto`/`faturamento_liquido`).
6. **Insere** uma linha em `sales` (id = `invoice.id`). Se o insert falhar, **não** desfaz o update do evento (não bloqueia).

### 7.3 Webhook Hubla — reembolso (`invoice.refund_succeeded` / `invoice.refunded`)

- **Fluxo normal:** busca a venda em `sales` por `invoice.id`; decrementa os contadores do evento (com `Math.max(0, …)`); marca a venda como `status: "refunded"` + `refunded_at`.
- **Fallback** (venda anterior ao sistema, não está em `sales`): reencontra o evento pela oferta, decrementa e insere a linha em `sales` já com `status: "refunded"`.
- Qualquer outro `type` é ignorado (`action: "skipped"`).

### 7.4 Meta Ads — `fetchMetaCampaigns()` (`lib/meta.ts`)

- Endpoint: `https://graph.facebook.com/v21.0/{AD_ACCOUNT_ID}/campaigns`.
- Métricas via `insights` — `date_preset(<preset>)` **ou** `time_range({since,until})`; campos: `spend, impressions, clicks, cpc, cpm, reach`.
- **Filtro de campanhas:** o nome (normalizado) precisa conter **"REGIONAL"**; se `city` informada, o nome (sem espaços) precisa conter a cidade (sem espaços).
- `totalSpend` = soma de `spend` das campanhas filtradas.
- Sem `META_ACCESS_TOKEN`/`META_AD_ACCOUNT_ID` → retorna `error: "not_configured"` (a UI mostra fallback).
- ⚠️ Há **logging verboso** (`console.log("[Meta] …")`) proposital para debug em produção.

### 7.5 Análise UTM — `/api/utm/analysis` (a lógica mais densa)

Classifica cada venda do período em **3 baldes de atribuição**:

| Balde | Critério | Cor UI |
|-------|----------|--------|
| **Rastreada** (`tracked`) | `isTracked()` = UTM (sem espaços) presente na oferta **ou** ≥ min(palavras da cidade, 2) presentes | 🟢 verde |
| **UTM bugada** (`buggedUtm`) | Venda existe em `sales` mas **não** casa com a campanha | 🟡 amarelo |
| **Desconhecida** (`unknown`) | `max(0, totalIngressosDoEvento − totalVendasEmSales)` — ingressos que não têm linha em `sales` (orgânico/direto/pré-sistema) | ⚫ cinza |

- **Investimento por evento**: soma de `spend` das campanhas Meta cujo nome (sem espaços) contém a `utm_nomenclatura` (sem espaços).
- **ROAS** = faturamento / investido. **CPA** = investido / total de ingressos.
- O `totalInvested` global usa `metaResult.totalSpend` diretamente (para bater com o Dashboard), com fallback para a soma por evento.

### 7.6 Cálculos financeiros do Dashboard (`Dashboard.tsx`)

- **`usingSales`**: verdadeiro quando há filtro de período (≠ "all" e custom com datas). Nesse caso, ingressos e faturamento vêm das linhas de `sales` do período; senão, dos **contadores acumulados** em `events`.
- `totalPeople = individuais + duplos × 2`.
- `totalCapacity = nº de eventos filtrados × 350` (⚠️ **350 fixo hardcoded**, ignora o campo `capacity`).
- **Investimento efetivo**: `metaTotalSpend` se a Meta estiver carregada; senão soma de `trafficInvestment`.
- `averageCPA = investimento / totalTickets`. `totalBalance = líquido − investimento`.
- **Reembolsos** exibidos num card à parte (contagem + valor estornado no período).

### 7.7 Timezone Brasília (`/api/utm/analysis`)

Como Brasília é **UTC−3** (sem horário de verão), os presets (`today`, `yesterday`, `last_7d`, `this_month`, `last_month`) são calculados com helpers dedicados: meia-noite Brasília = **03:00 UTC**. Datas customizadas (`YYYY-MM-DD` do `<input type="date">`) são interpretadas como datas em Brasília e convertidas para os limites UTC corretos. **Ao mexer em filtros de data, respeite esses helpers** (`nowInBrasilia`, `startOfDayBrasiliaUTC`, `endOfDayBrasiliaUTC`, `parseBrasiliaDateStr`).

### 7.8 Regra dos 80% no formulário (`EventForm.tsx`)

Ao salvar manualmente um evento, `faturamento_liquido = faturamento_bruto × 0.8` (assume 20% de taxa). ⚠️ Isso diverge do webhook, que calcula o líquido a partir da taxa **real** da plataforma. Contadores manuais são para dados pré-sistema/estimativas.

### 7.9 Geração de `id` do evento

Em `AdminPage.handleAdd`: `id` derivado da cidade — `NFD`, remove diacríticos, `toLowerCase()`, remove tudo que não seja `[a-z0-9]`. Ex.: "Luís Eduardo" → `luiseduardo`.

---

## 8. Autenticação & autorização

- **Login** (`/api/auth`): compara `email`+`senha` contra um array `USERS` **hardcoded** no código (sobrescrevível por env `USER1_EMAIL`, `USER1_PASSWORD`, …). Retorna o usuário sem a senha.
- **Sessão**: guardada em `localStorage["session"]` (JSON de `SessionUser`). Lida por `useAuth()`.
- **Proteção de rota**: `AuthGuard` (client-side) — sem sessão → redireciona `/login`; `requireAdmin` + role ≠ admin → redireciona `/`.
- **Papéis**: `admin` (vê link/rota `/admin`) e `viewer`.

> ⚠️ **Segurança:** a proteção é **100% client-side** e as senhas ficam em texto puro. É adequado para uma ferramenta interna de baixo risco, **não** para dados sensíveis expostos publicamente. Evoluir isso (middleware server-side, hash, cookies httpOnly) é o principal débito de segurança. Veja o padrão de colisão de sessão dual-auth já documentado em outro projeto do usuário antes de mexer em `localStorage` de sessão.

---

## 9. Design system / identidade visual (EFAGRO Regional)

- **Tema:** **dark fixo** — fundo base `#0d0d0d`, superfícies `#161616`/`#111`, bordas `#252525`/`#1f1f1f`, texto branco. `ThemeProvider`/`ThemeToggle` são **vestigiais** (sempre `'dark'`, no-op).
- **Paleta semântica:**
  - 🟢 Verde `#22c55e` — primária/positivo/ativo (líquido, sucesso, links ativos).
  - 🟡 Amarelo `#eab308` — atenção/UTM bugada.
  - 🔴 Vermelho `#ef4444` — negativo/investido/reembolso/excluir.
  - 🔵 Azul `#60a5fa` — faturamento bruto / status "em andamento".
  - Cinzas `#6b7280`/`#4b5563`/`#374151` — texto secundário/neutro.
- **Linha tricolor** (verde/amarelo/vermelho) como assinatura visual no topo dos headers e do login.
- **Labels de seção:** `font-size 9px, weight 700, uppercase, letter-spacing 0.2em, color #4b5563`.
- **Estilização:** mistura Tailwind (classes utilitárias/responsividade) com **estilos inline** (`style={{…}}`) para cores e detalhes finos. Ao editar, **siga o padrão do arquivo** que está mexendo.
- **Responsividade:** mobile-first, breakpoints `sm`/`md`/`lg`. AdminPage tem linha desktop (`md:flex`) e card mobile (`md:hidden`) separados. Alvos de toque ≥ 44px.
- **Logo:** `public/logo-efagro-regional.png` (usado com `<img>` + `eslint-disable no-img-element`).
- **Bandeiras dos estados:** SVGs inline em `StateFlagSVG.tsx` (fallback quando `bandeira_tipo="auto"`), com opção de upload (base64, máx 2MB) ou URL.

---

## 10. Variáveis de ambiente (`.env.local`, NÃO commitado)

| Variável | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente Supabase (anon) |
| `META_ACCESS_TOKEN` | Token da Meta Ads API (⚠️ **não** estava no `.env.local` inspecionado — conferir; sem ele, Meta = `not_configured`) |
| `META_AD_ACCOUNT_ID` | ID da conta de anúncios (`act_…`) |
| `USER1_EMAIL` … `USER3_ROLE` | (Opcional) sobrescrevem os usuários hardcoded do login |

`.gitignore` ignora `.env*`, `.claude/`, `node_modules`, `.next`, `*.tsbuildinfo`, `next-env.d.ts` e **`data/users.json`** (dados sensíveis).

---

## 11. Como rodar / build

```bash
cd /Users/rafael/circuito-agro
npm install          # se necessário
npm run dev          # http://localhost:3000
npm run build && npm run start   # produção
npm run lint
```

Requer `.env.local` preenchido para Supabase (obrigatório) e Meta (opcional — sem ele o dashboard cai no fallback de investimento manual).

---

## 12. Convenções & armadilhas (gotchas)

1. **Supabase é a fonte de verdade** — ignore `data/events.json` e `data/users.json` (legado). Não os "sincronize".
2. **`id` de evento é string** (não number). O `events.json` legado usa number — não confundir.
3. **Matching de nomes** sempre passa por `removeAccents` (e às vezes remove espaços). Ao adicionar cidade/campanha nova, garanta que `utm_nomenclatura`, nome da campanha Meta ("…REGIONAL…CIDADE…") e nome da oferta Hubla sejam consistentes sob essa normalização.
4. **Timezone Brasília** tem helpers próprios em `/api/utm/analysis` — não use `new Date()` cru para filtros de data.
5. **Logging verboso** (`[Meta]`, `[Hubla]`, `[UTM]`) é intencional para depurar em produção. Remover com cautela.
6. **Capacidade 350 hardcoded** no Dashboard (`totalCapacity`), apesar do campo `capacity` existir por evento.
7. **Líquido divergente**: form manual usa `bruto × 0.8`; webhook usa taxa real da plataforma.
8. **Testes com Vitest** para lógica pura (`lib/matching.test.ts`, `lib/finance.test.ts`) — rodar `npm test`. UI/integração continuam com verificação manual.
9. **Exclusão de evento**: a UI usa **arquivar** (`is_archived`), não `DELETE` — porque `DELETE` viola a FK de `sales`. Telas filtram `is_archived = false`; Admin lista todos via `?all=1`.
10. **Custos são por evento (all-time)** — não têm data de venda; nos cards filtrados por período aparecem como total do(s) evento(s) selecionado(s). `Investimento Total = tráfego (Meta) + custos`; `ROI Real` e `Balanço Geral` já descontam tudo.
9. **AGENTS.md do repo alerta:** "This is NOT the Next.js you know" — Next 16 pode ter breaking changes; **consulte `node_modules/next/dist/docs/` antes de assumir APIs**.

---

## 13. Guia de implementação (receitas)

**Adicionar um novo evento/cidade ao circuito:**
1. Via UI: `/admin` → "Novo evento" (gera `id`, salva no Supabase). Defina `utm_nomenclatura` batendo com a campanha Meta e a oferta Hubla.
2. Garanta a bandeira: SVG do estado já existe em `StateFlagSVG`? Se não, adicione ou use upload/URL.

**Adicionar um novo card/indicador no Dashboard:**
- Reutilize `FinancialCard` ou `IndicatorCard`. Calcule o valor no corpo de `Dashboard.tsx` (a partir de `salesData`/`events`/`meta*`). Siga a paleta semântica.

**Novo filtro de período:**
- Frontend: adicione ao array de botões e ao `getDateRange`/`getMetaParams` (Dashboard) ou `DATE_PRESETS` (AnalysisPage).
- Backend: mapeie o preset em `dateRangeFromPreset` (`/api/utm/analysis`) respeitando os helpers de Brasília.

**Nova coluna em `events`/`sales`:**
- Adicione a coluna no Supabase → atualize `AppEvent`/tipos locais → propague em `/api/events` (o spread `...rest` já cobre a maioria) → exponha na UI/form.

**Nova integração de venda (além da Hubla):**
- Espelhe o padrão de `/api/hubla/webhook`: normalizar nome → `findEvent` → incrementar `events` + inserir `sales`.

**Regra geral:** antes de implementar, **use a skill de brainstorming** para desenhar, e siga TDD quando houver lógica de negócio testável (cálculo/atribuição/timezone são ótimos candidatos).

---

## 14. Débitos técnicos & pontos de atenção

- 🔐 **Auth só client-side + senhas em texto puro** → maior risco. Evoluir para verificação server-side.
- 🧪 **Zero testes** — a lógica de atribuição UTM, timezone e webhook são candidatas ideais a testes.
- 🧹 **Componentes vestigiais** (`ThemeProvider`, `ThemeToggle`) e **arquivos legado** (`data/*.json`) poderiam ser removidos.
- 🗒️ **Logs de debug** verbosos em produção.
- 📏 **`Dashboard.tsx` é grande** (~485 linhas) — candidato a extração de sub-componentes/hoooks se crescer mais.
- 💰 **Inconsistência bruto→líquido** entre form manual (80%) e webhook (taxa real).

---

## 15. Glossário

| Termo | Significado |
|-------|-------------|
| **Ingresso individual / duplo** | Tipo de bilhete; duplo conta como 2 pessoas na ocupação |
| **Faturamento bruto** | Valor total pago pelo cliente |
| **Faturamento líquido** | Bruto menos a taxa da plataforma |
| **CPA** | Custo por aquisição = investido / ingressos |
| **ROAS** | Return on ad spend = faturamento / investido |
| **UTM rastreada / bugada / desconhecida** | Baldes de atribuição de origem da venda (ver §7.5) |
| **`utm_nomenclatura`** | Chave de texto (UPPERCASE) que liga evento ↔ campanha Meta ↔ oferta Hubla |
| **Hubla** | Plataforma de checkout/venda de ingressos (origem do webhook) |
| **REGIONAL** | Palavra obrigatória no nome das campanhas Meta desse circuito |

---

*Fim da documentação mestra. Mantenha este arquivo atualizado a cada mudança estrutural — ele é a memória permanente do projeto.*
