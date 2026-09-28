# Funil de leads do EFAGRO Experience - Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o EFAGRO Experience aparecer no dashboard com o funil investimento → leads → vendas → vagas, e consertar a régua de nomenclatura da Meta que hoje esconde R$ 286 mil.

**Architecture:** A régua da Meta deixa de ser uma palavra fixa (`REGIONAL`) e passa a ser o casamento com os eventos cadastrados, usando a função que já existe em `lib/matching.ts`. Leads viram uma tabela nova alimentada por webhook, no mesmo padrão do webhook da Hubla. Uma coluna nova em `events` separa a edição atual do Experience da edição de maio.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (Postgres via PostgREST), Vitest, Tailwind v4.

**Spec:** [`docs/superpowers/specs/2026-09-28-efagro-experience-funil-leads-design.md`](../specs/2026-09-28-efagro-experience-funil-leads-design.md)

## Global Constraints

- Testes só rodam em `lib/**/*.test.ts` (ver `vitest.config.ts`). Lógica que precisa de teste vai para `lib/`, não para dentro de `app/api/`.
- Toda data gravada no banco vai em **UTC**. A planilha e a Hubla mandam horário de Brasília (UTC-3). Converter na entrada.
- Migrações SQL vão em `supabase/migrations/AAAA-MM-DD_nome.sql` e são rodadas à mão no SQL Editor do Supabase. O código precisa degradar sem quebrar enquanto a migração não rodou.
- RLS nas tabelas novas: `enable row level security` + policy `for all using (true) with check (true)`, igual a `event_costs` e `unmatched_sales`.
- Nunca imprimir o valor de `META_ACCESS_TOKEN` em log.
- Linha de teste = nome **ou** e-mail contendo `teste`, `testte` ou `exemplo`, sem diferenciar maiúsculas.
- Corte da edição atual do Experience: **2026-07-01**.
- Commits em português, no padrão que o repositório já usa (`feat:`, `fix:`, `docs:`).

---

## Fase 1 - Régua de nomenclatura da Meta

Entrega valor sozinha: destrava R$ 286 mil do Experience e R$ 22 mil órfãos de BH e Luís Eduardo, sem depender de nada de leads.

### Task 1: Função de pertencimento ao circuito

**Files:**
- Modify: `lib/matching.ts`
- Test: `lib/matching.test.ts`

**Interfaces:**
- Consumes: `eventMatchesText(ev: MatchableEvent, text: string): boolean` (já existe neste arquivo)
- Produces: `campaignBelongsToCircuit(campaignName: string, events: MatchableEvent[]): boolean`

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao final de `lib/matching.test.ts`:

```typescript
describe("campaignBelongsToCircuit", () => {
  const eventos = [
    { city: "Belo Horizonte", utm_nomenclatura: "BELO HORIZONTE", utm_aliases: ["BH"] },
    { city: "EFAGRO EXPERIENCE", utm_nomenclatura: "EXPERIENCE", utm_aliases: ["EX"] },
  ];

  it("aceita campanha do Experience, que não tem a palavra REGIONAL", () => {
    expect(campaignBelongsToCircuit("[efagro_experience]_lead_frio_cbo_set26", eventos)).toBe(true);
  });

  it("aceita campanha que casa por apelido curto isolado", () => {
    expect(campaignBelongsToCircuit("LEAD_ABO_REGIONAL_MOV_BH-newpgs", eventos)).toBe(true);
  });

  it("recusa campanha de cidade que não é do circuito", () => {
    expect(campaignBelongsToCircuit("[C01] REGIONAL -LONDRINA - PR", eventos)).toBe(false);
  });

  it("recusa quando não há evento nenhum", () => {
    expect(campaignBelongsToCircuit("[efagro_experience]_lead_frio", [])).toBe(false);
  });
});
```

E acrescentar `campaignBelongsToCircuit` ao import no topo do arquivo:

```typescript
import { normNS, eventMatchesText, spendForEvent, campaignBelongsToCircuit } from "./matching";
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npm test -- lib/matching.test.ts`
Expected: FAIL com `campaignBelongsToCircuit is not a function` ou erro de import.

- [ ] **Step 3: Implementar o mínimo**

Acrescentar ao final de `lib/matching.ts`:

```typescript
// Uma campanha pertence ao circuito quando casa com algum evento cadastrado.
// Substitui a antiga regra de "tem a palavra REGIONAL no nome", que escondia
// todo o EFAGRO Experience (ver spec 2026-09-28).
export function campaignBelongsToCircuit(
  campaignName: string,
  events: MatchableEvent[],
): boolean {
  return events.some((ev) => eventMatchesText(ev, campaignName));
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npm test`
Expected: PASS, e os testes que já existiam continuam passando.

- [ ] **Step 5: Commit**

```bash
git add lib/matching.ts lib/matching.test.ts
git commit -m "feat: campaignBelongsToCircuit, régua de campanha por evento cadastrado"
```

---

### Task 2: `fetchMetaCampaigns` passa a usar a régua nova

**Files:**
- Modify: `lib/meta.ts`
- Test: `lib/meta.test.ts`

**Interfaces:**
- Consumes: `campaignBelongsToCircuit` da Task 1
- Produces: `FetchOpts` ganha o campo **obrigatório** `events: MatchableEvent[]`. Assinatura final: `fetchMetaCampaigns(opts: { events: MatchableEvent[]; datePreset?: string; from?: string; to?: string; city?: string })`

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `lib/meta.test.ts`:

```typescript
const EVENTOS = [
  { city: "EFAGRO EXPERIENCE", utm_nomenclatura: "EXPERIENCE", utm_aliases: ["EX"] },
  { city: "Cuiabá", utm_nomenclatura: "CUIABA", utm_aliases: [] as string[] },
];

describe("fetchMetaCampaigns — régua por evento", () => {
  it("inclui campanha do Experience, que não tem REGIONAL no nome", async () => {
    global.fetch = stubPaginas([
      { data: [campanha("[efagro_experience]_lead_frio_cbo_set26", "500.00")] },
    ]);

    const r = await fetchMetaCampaigns({ datePreset: "maximum", events: EVENTOS });

    expect(r.campaigns.map((c) => c.name)).toEqual(["[efagro_experience]_lead_frio_cbo_set26"]);
    expect(r.totalSpend).toBeCloseTo(500, 2);
  });

  it("descarta campanha que não casa com nenhum evento", async () => {
    global.fetch = stubPaginas([
      { data: [campanha("[C01] REGIONAL -LONDRINA - PR", "123.82")] },
    ]);

    const r = await fetchMetaCampaigns({ datePreset: "maximum", events: EVENTOS });

    expect(r.campaigns).toHaveLength(0);
    expect(r.totalSpend).toBe(0);
  });
});
```

Nos três testes de paginação que já existem neste arquivo, acrescentar `events: EVENTOS` na chamada e trocar os nomes das campanhas de exemplo para nomes que casem com `EVENTOS` (por exemplo `REGIONAL CUIABA - VENDAS`).

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- lib/meta.test.ts`
Expected: FAIL. O teste do Experience falha porque o filtro `REGIONAL` descarta a campanha.

- [ ] **Step 3: Implementar**

Em `lib/meta.ts`, trocar os imports do topo:

```typescript
import { normNS, campaignBelongsToCircuit, type MatchableEvent } from "@/lib/matching";
```

`removeAccents` deixa de ser usado neste arquivo; remover o import dele.

Trocar o tipo `FetchOpts`:

```typescript
type FetchOpts = {
  /** Eventos ativos do circuito. Uma campanha só entra se casar com algum deles. */
  events: MatchableEvent[];
  datePreset?: string;
  from?: string;
  to?: string;
  city?: string;
};
```

E trocar o bloco de filtro (hoje ele testa `name.includes("REGIONAL")`):

```typescript
    const campaigns: MetaCampaign[] = rawCampaigns
      .filter((c) => {
        if (!campaignBelongsToCircuit(c.name, opts.events)) return false;
        // Compara sem espaços para "RIOVERDE" bater "RIO VERDE" na campanha Meta
        if (normalizedCity && !normNS(c.name).includes(normalizedCity)) return false;
        return true;
      })
      .map((c) => {
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test && npx tsc --noEmit`
Expected: testes PASS. O `tsc` vai apontar erro nos dois chamadores, que a Task 3 conserta. Se apontar só isso, seguir.

- [ ] **Step 5: Commit**

```bash
git add lib/meta.ts lib/meta.test.ts
git commit -m "feat: fetchMetaCampaigns filtra por evento cadastrado, não pela palavra REGIONAL"
```

---

### Task 3: Chamadores passam os eventos

**Files:**
- Modify: `app/api/meta/campaigns/route.ts`
- Modify: `app/api/utm/analysis/route.ts:211`

**Interfaces:**
- Consumes: `fetchMetaCampaigns({ events, ... })` da Task 2
- Produces: nada novo

- [ ] **Step 1: Ajustar `app/api/meta/campaigns/route.ts`**

Substituir o conteúdo do arquivo por:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { fetchMetaCampaigns } from "@/lib/meta";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const datePreset = searchParams.get("date_preset") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const city = searchParams.get("city") ?? undefined;

  // A régua de campanha é o conjunto de eventos ativos. Arquivado não conta.
  const { data: events, error } = await supabase
    .from("events")
    .select("city, utm_nomenclatura, utm_aliases")
    .eq("is_archived", false)
    .not("utm_nomenclatura", "is", null);

  if (error) {
    console.error("[Meta] Erro ao ler eventos para a régua:", error.message);
    return NextResponse.json({ error: "Erro ao ler eventos." }, { status: 500 });
  }

  const result = await fetchMetaCampaigns({ datePreset, from, to, city, events: events ?? [] });

  if (result.error === "not_configured") {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ campaigns: result.campaigns, totalSpend: result.totalSpend });
}
```

- [ ] **Step 2: Ajustar `app/api/utm/analysis/route.ts`**

Essa rota já carrega os eventos antes de chamar a Meta. Localizar a chamada na linha 211 e acrescentar os eventos ao objeto de opções:

```typescript
  const metaResult = await fetchMetaCampaigns({ ...metaOpts, events });
```

Se a variável com a lista de eventos tiver outro nome nesse arquivo, usar o nome real e garantir que ela já esteja filtrada por `is_archived = false`.

- [ ] **Step 3: Checar tipos e lint**

Run: `npx tsc --noEmit && npm run lint 2>&1 | grep -E "meta|analysis" || echo "sem problema novo"`
Expected: `tsc` sem saída; nenhum problema de lint nos arquivos tocados.

- [ ] **Step 4: Commit**

```bash
git add app/api/meta/campaigns/route.ts app/api/utm/analysis/route.ts
git commit -m "feat: rotas da Meta passam os eventos ativos como régua de campanha"
```

---

### Task 4: Dados no banco - apelidos e Cascavel

**Files:**
- Create: `supabase/migrations/2026-09-28_regua_campanhas.sql`

**Interfaces:**
- Consumes: nada
- Produces: `events.utm_aliases` com `BH` e `EM`; `cascavel.status = 'cancelado'`

- [ ] **Step 1: Escrever a migração**

```sql
-- Régua de campanhas da Meta - 2026-09-28
-- Rodar no Supabase → SQL Editor (uma vez).
--
-- Contexto: a régua passou de "tem REGIONAL no nome" para "casa com algum
-- evento cadastrado". Sem os apelidos abaixo, R$ 22.125,77 de campanhas reais
-- ficariam sem evento. Medido em 28/09/2026, ver spec.

-- BH: 5 campanhas, R$ 12.820,66. Ex.: LEAD_ABO_REGIONAL_MOV_BH-newpgs
update events
   set utm_aliases = array(select distinct unnest(utm_aliases || array['BH']))
 where id = 'belohorizonte';

-- EM = Eduardo Magalhães: 2 campanhas, R$ 9.305,11. Ex.: [C01]REGIONAL-VENDAS_EM_ABO
update events
   set utm_aliases = array(select distinct unnest(utm_aliases || array['EM']))
 where id = 'luiseduardo';

-- Cascavel foi cancelado. Segue arquivado; o status só estava desatualizado.
update events set status = 'cancelado' where id = 'cascavel';

-- Verificação:
-- select id, utm_nomenclatura, utm_aliases, status, is_archived
--   from events where id in ('belohorizonte','luiseduardo','cascavel');
```

- [ ] **Step 2: Pedir ao Rafael para rodar no SQL Editor**

Mostrar o conteúdo do arquivo e esperar a confirmação. Não seguir para o passo 3 antes disso.

- [ ] **Step 3: Verificar contra o banco e contra a Meta**

Consultar `events` e confirmar os três registros. Depois subir o app (`npm run dev`) e conferir:

Run: `curl -s "http://localhost:3000/api/meta/campaigns?date_preset=maximum" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['campaigns']), round(d['totalSpend'],2))"`
Expected: **181** campanhas e total na casa de **R$ 728 mil**. O valor exato varia, há campanha ativa gastando.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/2026-09-28_regua_campanhas.sql
git commit -m "feat: migração dos apelidos BH e EM e do cancelamento de Cascavel"
```

---

## Fase 2 - Leads: dados e entrada

### Task 5: Tabela `leads` e coluna `captacao_inicio`

**Files:**
- Create: `supabase/migrations/2026-09-28_leads.sql`
- Modify: `app/types.ts`

**Interfaces:**
- Consumes: o tipo `Lote`, que é criado em `lib/leads.ts` na Task 6. Se esta task for executada antes da 6, deixar o `export type { Lote }` comentado e destravar ao final da Task 6.
- Produces: tabela `leads`; `events.captacao_inicio`; tipo `AppEvent` com `captacao_inicio: string | null`

- [ ] **Step 1: Escrever a migração**

```sql
-- Leads do EFAGRO Experience - 2026-09-28
-- Rodar no Supabase → SQL Editor (uma vez).

create table if not exists leads (
  id            text primary key,   -- ID da planilha, ou hash de e-mail+data
  event_id      text not null references events(id),
  nome          text,
  email         text not null,      -- normalizado: minúsculo, sem espaços nas pontas
  whatsapp      text,
  lote          text,               -- basic | standard | vip | gold | nao_informado
  origem        text not null,      -- planilha_antiga | lp_nova
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_term      text,
  utm_content   text,
  lead_date     timestamptz not null,
  payload       jsonb,
  created_at    timestamptz not null default now()
);

-- Uma linha por preenchimento. Quem escolheu Standard e depois Gold gera 2 linhas
-- com o mesmo e-mail, de propósito: a dedup por pessoa é feita na LEITURA
-- (contagem de e-mails distintos), nunca na escrita, para não perder a
-- informação de que a pessoa manifestou interesse em dois lotes.
create index if not exists idx_leads_event on leads(event_id);
create index if not exists idx_leads_email on leads(email);
create index if not exists idx_leads_date  on leads(lead_date);

alter table leads enable row level security;
create policy "leads anon all" on leads for all using (true) with check (true);

-- Início da captação da edição atual. Investimento e leads anteriores a esta
-- data não contam. Nulo = comportamento de hoje (conta tudo).
alter table events add column if not exists captacao_inicio date;
update events set captacao_inicio = '2026-07-01' where id = 'saopaulo';

-- Verificação:
-- select count(*) from leads;
-- select id, captacao_inicio from events where captacao_inicio is not null;
```

- [ ] **Step 2: Pedir ao Rafael para rodar e confirmar**

Não seguir antes da confirmação.

- [ ] **Step 3: Acrescentar o campo em `app/types.ts`**

Dentro do tipo `AppEvent`, depois de `is_archived: boolean;`:

```typescript
  /** Início da captação da edição atual. Nulo = conta o histórico inteiro. */
  captacao_inicio: string | null;
```

E acrescentar o tipo do lead ao final do arquivo. **`Lote` mora em `lib/leads.ts`**, não aqui: `lib/` é a camada de baixo e não importa de `app/`. É o mesmo arranjo que `EventCost` já usa (`export type { EventCost } from "@/lib/finance"`).

```typescript
export type { Lote } from "@/lib/leads";

export type Lead = {
  id: string;
  event_id: string;
  nome: string | null;
  email: string;
  whatsapp: string | null;
  lote: Lote;
  origem: "planilha_antiga" | "lp_nova";
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  lead_date: string;
};
```

- [ ] **Step 4: Checar tipos**

Run: `npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/2026-09-28_leads.sql app/types.ts
git commit -m "feat: tabela leads e coluna captacao_inicio"
```

---

### Task 6: `lib/leads.ts` - limpeza e normalização

**Files:**
- Create: `lib/leads.ts`
- Test: `lib/leads.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `isTestLead(nome: string | null | undefined, email: string | null | undefined): boolean`
  - `normalizeLote(valor: string | null | undefined): Lote`
  - `normalizeEmail(valor: string): string`
  - `utmsFromUrl(url: string | null | undefined): { utm_source, utm_medium, utm_campaign, utm_term, utm_content }` (todos `string | null`)
  - `leadIdFrom(id: string | null | undefined, email: string, leadDate: string): string`

- [ ] **Step 1: Escrever os testes**

Criar `lib/leads.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { isTestLead, normalizeLote, normalizeEmail, utmsFromUrl, leadIdFrom } from "./leads";

describe("isTestLead", () => {
  it("pega teste no nome, em qualquer caixa", () => {
    expect(isTestLead("TESTE GUILHERME VIP", "guilherme@x.com")).toBe(true);
    expect(isTestLead("Darlan teste novo", "dalran@gmai.co")).toBe(true);
  });
  it("pega a grafia errada testte e o e-mail de exemplo", () => {
    expect(isTestLead("DARLAN TESTTE", "dadfg@gmail.com")).toBe(true);
    expect(isTestLead("Teste Silva", "teste@exemplo.com")).toBe(true);
  });
  it("não derruba lead de verdade", () => {
    expect(isTestLead("Lucas Morais", "lucas.waishaupt@gmail.com")).toBe(false);
  });
});

describe("normalizeLote", () => {
  it("normaliza caixa e espaços", () => {
    expect(normalizeLote("Standard")).toBe("standard");
    expect(normalizeLote(" VIP ")).toBe("vip");
    expect(normalizeLote("Gold")).toBe("gold");
    expect(normalizeLote("basic")).toBe("basic");
  });
  it("traduz ausência para nao_informado", () => {
    expect(normalizeLote("Não informado")).toBe("nao_informado");
    expect(normalizeLote(null)).toBe("nao_informado");
    expect(normalizeLote("")).toBe("nao_informado");
  });
});

describe("normalizeEmail", () => {
  it("tira espaços e baixa a caixa", () => {
    expect(normalizeEmail("  DADFG@GMAIL.COM ")).toBe("dadfg@gmail.com");
  });
});

describe("utmsFromUrl", () => {
  it("extrai as UTMs da URL da landing page", () => {
    const url = "https://efagroregional.com.br/efagro-experience-lotes/?utm_source=ig&utm_medium=paid_Instagram_Feed&utm_campaign=%5Befagro_experience%5D_lead_frio_cbo_est%C3%A1ticos_set02&utm_term=ad03_vendas#ingressos";
    expect(utmsFromUrl(url)).toEqual({
      utm_source: "ig",
      utm_medium: "paid_Instagram_Feed",
      utm_campaign: "[efagro_experience]_lead_frio_cbo_estáticos_set02",
      utm_term: "ad03_vendas",
      utm_content: null,
    });
  });
  it("devolve tudo nulo quando não há UTM nem URL válida", () => {
    expect(utmsFromUrl("teste")).toEqual({
      utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null,
    });
    expect(utmsFromUrl(null)).toEqual({
      utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null,
    });
  });
});

describe("leadIdFrom", () => {
  it("usa o id da planilha quando ele existe", () => {
    expect(leadIdFrom("mulbekf2cm3iq", "a@b.com", "2026-09-28T14:00:00.000Z")).toBe("mulbekf2cm3iq");
  });
  it("gera id estável por e-mail e data quando não há id", () => {
    const a = leadIdFrom(null, "a@b.com", "2026-09-28T14:00:00.000Z");
    const b = leadIdFrom(null, "a@b.com", "2026-09-28T14:00:00.000Z");
    expect(a).toBe(b);
    expect(a).not.toBe(leadIdFrom(null, "c@d.com", "2026-09-28T14:00:00.000Z"));
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- lib/leads.test.ts`
Expected: FAIL com `Cannot find module './leads'`.

- [ ] **Step 3: Implementar**

Criar `lib/leads.ts`:

```typescript
import { createHash } from "node:crypto";

/** Lote escolhido no formulário. `nao_informado` cobre a LP nova, que deixa o campo opcional. */
export type Lote = "basic" | "standard" | "vip" | "gold" | "nao_informado";

// Linhas de teste que o time cria na planilha. Decisão registrada na spec.
const PADRAO_TESTE = /teste|testte|exemplo/i;

export function isTestLead(nome: string | null | undefined, email: string | null | undefined): boolean {
  return PADRAO_TESTE.test(String(nome ?? "")) || PADRAO_TESTE.test(String(email ?? ""));
}

const LOTES: Lote[] = ["basic", "standard", "vip", "gold"];

export function normalizeLote(valor: string | null | undefined): Lote {
  const v = String(valor ?? "").trim().toLowerCase();
  return (LOTES as string[]).includes(v) ? (v as Lote) : "nao_informado";
}

export function normalizeEmail(valor: string): string {
  return String(valor ?? "").trim().toLowerCase();
}

export type Utms = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
};

const UTMS_VAZIAS: Utms = {
  utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null,
};

export function utmsFromUrl(url: string | null | undefined): Utms {
  if (!url) return { ...UTMS_VAZIAS };
  let params: URLSearchParams;
  try {
    params = new URL(url).searchParams;
  } catch {
    return { ...UTMS_VAZIAS };
  }
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
  };
}

export function leadIdFrom(id: string | null | undefined, email: string, leadDate: string): string {
  const limpo = String(id ?? "").trim();
  if (limpo) return limpo;
  return createHash("sha1").update(`${normalizeEmail(email)}|${leadDate}`).digest("hex").slice(0, 24);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS em tudo.

- [ ] **Step 5: Commit**

```bash
git add lib/leads.ts lib/leads.test.ts
git commit -m "feat: lib/leads com limpeza, normalização e id idempotente de lead"
```

---

### Task 7: Rota `POST /api/leads/webhook`

**Files:**
- Create: `app/api/leads/webhook/route.ts`

**Interfaces:**
- Consumes: tudo de `lib/leads.ts` (Task 6); tabela `leads` (Task 5)
- Produces: rota que aceita o corpo `{ id?, nome, email, whatsapp?, ingresso?, pagina?, data? }` e responde `{ received: true, action: "saved" | "skipped_test" | "skipped_no_event" | "skipped_no_email" }`

- [ ] **Step 1: Implementar a rota**

Criar `app/api/leads/webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { eventMatchesText } from "@/lib/matching";
import { isTestLead, normalizeLote, normalizeEmail, utmsFromUrl, leadIdFrom } from "@/lib/leads";

export const dynamic = "force-dynamic";

type Corpo = {
  id?: string;
  nome?: string;
  email?: string;
  whatsapp?: string;
  ingresso?: string;
  pagina?: string;
  origem?: string;
  data?: string;
};

// "28/09/2026 11:00:28" (Brasília) → ISO em UTC
function dataBrasiliaParaUTC(valor: string | undefined): string {
  if (!valor) return new Date().toISOString();
  const m = valor.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) {
    const d = new Date(valor);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const [, dd, mm, yyyy, hh, mi, ss] = m;
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss ?? "00"}-03:00`).toISOString();
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  console.log("[Leads] ▶ Webhook recebido:", raw.slice(0, 1000));

  let corpo: Corpo;
  try {
    corpo = JSON.parse(raw);
  } catch {
    console.warn("[Leads] Corpo não é JSON");
    return NextResponse.json({ received: true, action: "skipped_invalid_json" });
  }

  if (isTestLead(corpo.nome, corpo.email)) {
    console.log("[Leads] Linha de teste, descartada:", corpo.nome, corpo.email);
    return NextResponse.json({ received: true, action: "skipped_test" });
  }

  const email = normalizeEmail(corpo.email ?? "");
  if (!email) {
    console.warn("[Leads] Lead sem e-mail, descartado");
    return NextResponse.json({ received: true, action: "skipped_no_email" });
  }

  const { data: events, error: errEventos } = await supabase
    .from("events")
    .select("id, city, utm_nomenclatura, utm_aliases")
    .eq("is_archived", false);

  if (errEventos || !events) {
    console.error("[Leads] Erro ao buscar eventos:", errEventos?.message);
    return NextResponse.json({ received: true, action: "db_error" });
  }

  // A origem informada pelo formulário é o texto que identifica o evento.
  const textoDoEvento = corpo.origem ?? "";
  const evento = events.find((ev) => eventMatchesText(ev, textoDoEvento));

  if (!evento) {
    console.warn("[Leads] Nenhum evento casou com:", textoDoEvento, "| lead:", email);
    return NextResponse.json({ received: true, action: "skipped_no_event", origem: textoDoEvento });
  }

  const leadDate = dataBrasiliaParaUTC(corpo.data);
  const registro = {
    id: leadIdFrom(corpo.id, email, leadDate),
    event_id: evento.id,
    nome: corpo.nome?.trim() || null,
    email,
    whatsapp: corpo.whatsapp?.trim() || null,
    lote: normalizeLote(corpo.ingresso),
    origem: "lp_nova",
    ...utmsFromUrl(corpo.pagina),
    lead_date: leadDate,
    payload: corpo,
  };

  const { error } = await supabase.from("leads").upsert([registro], { onConflict: "id" });
  if (error) {
    console.error("[Leads] Erro ao gravar:", error.message, "| payload:", raw.slice(0, 1000));
    return NextResponse.json({ received: true, action: "db_error" });
  }

  console.log("[Leads] ✅ Lead gravado:", registro.id, registro.email, registro.lote);
  return NextResponse.json({ received: true, action: "saved", id: registro.id });
}
```

- [ ] **Step 2: Checar tipos e lint**

Run: `npx tsc --noEmit && npm run lint 2>&1 | grep leads || echo "sem problema de lint em leads"`
Expected: `tsc` sem saída.

- [ ] **Step 3: Provar rodando, com o app de pé**

Subir `npm run dev` e disparar os três casos:

```bash
# 1. lead de verdade → saved
curl -s -X POST http://localhost:3000/api/leads/webhook -H 'Content-Type: application/json' -d '{
 "id":"plano-teste-1","nome":"Fulano da Silva","email":"FULANO@Exemplo.COM.BR","whatsapp":"(11) 99999-0000",
 "ingresso":"Gold","origem":"EFAGRO Experience Novembro","data":"28/09/2026 11:00:28",
 "pagina":"https://efagroregional.com.br/efagro-experience-lotes/?utm_source=ig&utm_medium=paid_Instagram_Feed"}'

# 2. mesmo id de novo → continua 1 registro só
# 3. nome com teste → skipped_test
curl -s -X POST http://localhost:3000/api/leads/webhook -H 'Content-Type: application/json' -d '{
 "id":"plano-teste-2","nome":"Teste Silva","email":"teste@exemplo.com","origem":"EFAGRO Experience Novembro"}'
```

Expected: o primeiro responde `{"action":"saved"}`, o reenvio mantém 1 linha na tabela, o terceiro responde `{"action":"skipped_test"}`.

Atenção: o e-mail `FULANO@Exemplo.COM.BR` contém "exemplo" e vai cair na regra de teste. Usar um e-mail que não contenha as palavras da regra, por exemplo `fulano@empresa.com.br`, e conferir que a normalização baixou a caixa.

Ao final, apagar os registros de teste da tabela `leads`.

- [ ] **Step 4: Commit**

```bash
git add app/api/leads/webhook/route.ts
git commit -m "feat: webhook de leads, com idempotência e descarte de linha de teste"
```

---

### Task 8: Importação das duas planilhas

**Files:**
- Create: `scripts/importar-leads.mjs`

**Interfaces:**
- Consumes: `lib/leads.ts` (Task 6), tabela `leads` (Task 5)
- Produces: 1.455 registros em `leads` para `saopaulo`

- [ ] **Step 1: Escrever o script**

Criar `scripts/importar-leads.mjs`:

```javascript
// Importa as duas planilhas de leads do EFAGRO Experience para a tabela `leads`.
// Simulação por padrão. Só escreve com --commit.
//
// node scripts/importar-leads.mjs "<csv antigo>" "<csv novo>" [--commit]

import fs from "node:fs";
import { createHash } from "node:crypto";

const EVENT_ID = "saopaulo";
const COMMIT = process.argv.includes("--commit");
const [csvAntigo, csvNovo] = process.argv.slice(2).filter((a) => !a.startsWith("--"));

if (!csvAntigo || !csvNovo) {
  console.error("Uso: node scripts/importar-leads.mjs <csv-antigo> <csv-novo> [--commit]");
  process.exit(1);
}

// ── Ambiente (nunca imprimir valor) ─────────────────────────────────────────
const env = Object.fromEntries(
  fs.readFileSync("/Users/rafael/circuito-agro/.env.local", "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ── Mesmas regras de lib/leads.ts ───────────────────────────────────────────
const PADRAO_TESTE = /teste|testte|exemplo/i;
const LOTES = ["basic", "standard", "vip", "gold"];

const isTestLead = (nome, email) => PADRAO_TESTE.test(String(nome ?? "")) || PADRAO_TESTE.test(String(email ?? ""));
const normalizeEmail = (v) => String(v ?? "").trim().toLowerCase();
const normalizeLote = (v) => {
  const x = String(v ?? "").trim().toLowerCase();
  return LOTES.includes(x) ? x : "nao_informado";
};
const leadIdFrom = (id, email, data) => {
  const limpo = String(id ?? "").trim();
  if (limpo) return limpo;
  return createHash("sha1").update(`${normalizeEmail(email)}|${data}`).digest("hex").slice(0, 24);
};
const UTMS_VAZIAS = { utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null };
function utmsFromUrl(url) {
  if (!url) return { ...UTMS_VAZIAS };
  let sp;
  try { sp = new URL(url).searchParams; } catch { return { ...UTMS_VAZIAS }; }
  return {
    utm_source: sp.get("utm_source"), utm_medium: sp.get("utm_medium"),
    utm_campaign: sp.get("utm_campaign"), utm_term: sp.get("utm_term"),
    utm_content: sp.get("utm_content"),
  };
}

// ── CSV com aspas ───────────────────────────────────────────────────────────
function parseCSV(texto) {
  const linhas = [];
  let campo = "", linha = [], dentroDeAspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroDeAspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') dentroDeAspas = false;
      else campo += c;
    } else if (c === '"') dentroDeAspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n") { linha.push(campo); linhas.push(linha); linha = []; campo = ""; }
    else if (c !== "\r") campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cab, ...resto] = linhas.filter((l) => l.some((v) => v !== ""));
  return resto.map((l) => Object.fromEntries(cab.map((h, i) => [h.trim(), l[i] ?? ""])));
}

// ── Datas de Brasília para UTC ──────────────────────────────────────────────
// Lista antiga: "15-7-2026" ou "16-07-2026" (só data, sem hora)
// Lista nova:   "28/09/2026 11:00:28"
function dataParaUTC(valor) {
  const v = String(valor ?? "").trim();
  let m = v.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) {
    const [, d, mes, a] = m;
    return new Date(`${a}-${mes.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00-03:00`).toISOString();
  }
  m = v.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  if (m) {
    const [, d, mes, a, h, mi, ss] = m;
    return new Date(`${a}-${mes}-${d}T${h}:${mi}:${ss}-03:00`).toISOString();
  }
  return null;
}

// ── Monta os registros ──────────────────────────────────────────────────────
function daListaAntiga(linhas) {
  const out = [], descartados = [];
  for (const r of linhas) {
    const nome = r["Qual o seu nome?"], email = r["Qual seu melhor e-mail?"];
    if (isTestLead(nome, email)) { descartados.push(r); continue; }
    const e = normalizeEmail(email);
    const data = dataParaUTC(r["data_preenchimento"]);
    if (!e || !data) { descartados.push(r); continue; }
    out.push({
      id: leadIdFrom(null, e, data), event_id: EVENT_ID,
      nome: (nome ?? "").trim() || null, email: e,
      whatsapp: (r["Qual o seu DDD + WhatsApp?"] ?? "").trim() || null,
      lote: normalizeLote(r["Ingresso"]), origem: "planilha_antiga",
      utm_source: r["utm_source"] || null, utm_medium: r["utm_medium"] || null,
      utm_campaign: r["utm_campaign"] || null, utm_term: r["utm_term"] || null,
      utm_content: r["utm_content"] || null,
      lead_date: data, payload: r,
    });
  }
  return { out, descartados };
}

function daListaNova(linhas) {
  const out = [], descartados = [];
  for (const r of linhas) {
    const nome = r["Nome"], email = r["E-mail"];
    if (isTestLead(nome, email)) { descartados.push(r); continue; }
    const e = normalizeEmail(email);
    const data = dataParaUTC(r["Data/Hora"]);
    if (!e || !data) { descartados.push(r); continue; }
    out.push({
      id: leadIdFrom(r["ID"], e, data), event_id: EVENT_ID,
      nome: (nome ?? "").trim() || null, email: e,
      whatsapp: (r["WhatsApp"] ?? "").trim() || null,
      lote: normalizeLote(r["Ingresso escolhido"]), origem: "lp_nova",
      ...utmsFromUrl(r["Página"]),
      lead_date: data, payload: r,
    });
  }
  return { out, descartados };
}

// ── Execução ────────────────────────────────────────────────────────────────
const a = daListaAntiga(parseCSV(fs.readFileSync(csvAntigo, "utf8")));
const b = daListaNova(parseCSV(fs.readFileSync(csvNovo, "utf8")));

console.log(`lista antiga: ${a.out.length + a.descartados.length} linhas | ${a.descartados.length} descartadas | ${a.out.length} válidas`);
console.log(`lista nova:   ${b.out.length + b.descartados.length} linhas | ${b.descartados.length} descartadas | ${b.out.length} válidas`);

const todos = [...a.out, ...b.out];
const porId = new Map(todos.map((l) => [l.id, l]));
const registros = [...porId.values()];
const emails = new Set(registros.map((l) => l.email));

console.log(`\nregistros a gravar: ${registros.length} | e-mails distintos: ${emails.size}`);
const porLote = {};
for (const l of registros) porLote[l.lote] = (porLote[l.lote] ?? 0) + 1;
console.log("por lote:", porLote);

if (!COMMIT) { console.log("\n>>> SIMULAÇÃO. Nada foi escrito. Rode com --commit para aplicar."); process.exit(0); }

for (let i = 0; i < registros.length; i += 500) {
  const bloco = registros.slice(i, i + 500);
  const res = await fetch(`${SB_URL}/rest/v1/leads?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(bloco),
  });
  if (!res.ok) { console.error("FALHOU no bloco", i, res.status, (await res.text()).slice(0, 600)); process.exit(1); }
  console.log(`  gravado ${Math.min(i + 500, registros.length)}/${registros.length}`);
}

const conf = await fetch(`${SB_URL}/rest/v1/leads?event_id=eq.${EVENT_ID}&select=email,lote`, {
  headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
});
const gravados = await conf.json();
console.log(`\nCONFERÊNCIA no banco: ${gravados.length} linhas | ${new Set(gravados.map((l) => l.email)).size} e-mails distintos`);
```

Atenção a uma diferença entre as listas: a antiga só traz **data**, sem hora, então todos os leads de um mesmo dia ficam com `00:00:00`. Como o `id` é o hash de `e-mail + data`, **a mesma pessoa que preencheu duas vezes no mesmo dia escolhendo lotes diferentes vira um registro só**. Isso está de acordo com a decisão 2 da spec, mas significa que o total de linhas gravadas fica abaixo das 1.530 válidas da lista antiga. O número que precisa fechar é o de **e-mails distintos: 1.455**.

- [ ] **Step 2: Rodar em simulação**

Run:
```bash
node scripts/importar-leads.mjs \
  "/Users/rafael/Downloads/LEADS EFAGRO EXPERIENCE | NOVEMBRO - leads.csv" \
  "/Users/rafael/Downloads/LEADS - EFAGRO EXPERIENCE - NOVA PÁGINA - Novos Leads - Página Nova-2.csv"
```
Expected: `lista antiga: 1538 linhas | 8 descartadas | 1530 válidas` e `lista nova: 57 linhas | 12 descartadas | 45 válidas`, terminando com **1.455 e-mails distintos**. Nada escrito no banco.

- [ ] **Step 3: Rodar de verdade**

Run: o mesmo comando com `--commit` no final.
Expected: escreve e imprime a conferência.

- [ ] **Step 4: Conferir no banco, não na saída do script**

Consultar `leads` e confirmar: total de linhas, e-mails distintos, data mínima e máxima, distribuição por lote. Comparar com a seção 3.2 da spec.

- [ ] **Step 5: Commit**

```bash
git add scripts/importar-leads.mjs
git commit -m "feat: script de importação das duas planilhas de leads"
```

---

### Task 9: Apps Script na planilha

**Files:**
- Create: `docs/apps-script-leads.md`

**Interfaces:**
- Consumes: rota da Task 7
- Produces: instrução pronta para colar na planilha

- [ ] **Step 1: Escrever o documento**

Criar `docs/apps-script-leads.md` com o trecho abaixo e a instrução de onde colar. O script **já existe** na planilha e já dispara para a Meta; isto é uma chamada a mais dentro da função que já roda.

```javascript
// Acrescentar dentro da função que já processa a linha nova.
// A permissão de UrlFetchApp já foi autorizada quando o envio para a Meta passou a funcionar.
function enviarLeadParaDashboard(linha) {
  var url = 'https://SEU-DOMINIO-NA-VERCEL/api/leads/webhook';
  var corpo = {
    id:       linha.id,            // coluna ID da planilha
    nome:     linha.nome,
    email:    linha.email,
    whatsapp: linha.whatsapp,
    ingresso: linha.ingressoEscolhido,
    origem:   linha.origem,        // "EFAGRO Experience Novembro"
    pagina:   linha.pagina,        // URL completa, com as UTMs
    data:     linha.dataHora       // "28/09/2026 11:00:28"
  };

  try {
    var resp = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(corpo),
      muteHttpExceptions: true
    });
    return resp.getResponseCode() === 200 ? 'ok' : 'erro http ' + resp.getResponseCode();
  } catch (e) {
    return 'erro: ' + e;
  }
}
```

Documentar também: gravar o retorno numa coluna `Dashboard` ao lado da coluna `Meta API`, para dar visibilidade igual à que já existe.

- [ ] **Step 2: Entregar ao Rafael e confirmar com lead real**

Pedir para colar, e conferir que a próxima linha real da planilha aparece na tabela `leads` em segundos.

- [ ] **Step 3: Commit**

```bash
git add docs/apps-script-leads.md
git commit -m "docs: trecho de Apps Script que manda o lead para o dashboard"
```

---

## Fase 3 - Corte por edição

### Task 10: Investimento respeita `captacao_inicio`

**Files:**
- Modify: `lib/meta.ts`
- Test: `lib/meta.test.ts`

**Interfaces:**
- Consumes: `FetchOpts` da Task 2
- Produces: `FetchOpts` ganha `since?: string` (`AAAA-MM-DD`). Quando presente e não houver `from`/`to`, a janela de insights começa nessa data.

- [ ] **Step 1: Escrever o teste**

```typescript
describe("fetchMetaCampaigns — recorte por início de captação", () => {
  it("usa time_range começando no since quando ele é informado", async () => {
    const fetchStub = vi.fn(async (url: string) => {
      expect(url).toContain('"since":"2026-07-01"');
      return {
        status: 200, statusText: "OK",
        text: async () => JSON.stringify({ data: [], paging: {} }),
      } as unknown as Response;
    });
    global.fetch = fetchStub as unknown as typeof fetch;

    await fetchMetaCampaigns({ events: EVENTOS, since: "2026-07-01" });

    expect(fetchStub).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- lib/meta.test.ts`
Expected: FAIL, a URL não contém o `since`.

- [ ] **Step 3: Implementar**

Em `lib/meta.ts`, acrescentar `since?: string;` ao `FetchOpts` e trocar o bloco que monta `insightsField`:

```typescript
  let insightsField: string;
  if (opts.from && opts.to) {
    insightsField = `insights.time_range({"since":"${opts.from}","until":"${opts.to}"}){spend,impressions,clicks,cpc,cpm,reach}`;
  } else if (opts.since) {
    const hoje = new Date().toISOString().slice(0, 10);
    insightsField = `insights.time_range({"since":"${opts.since}","until":"${hoje}"}){spend,impressions,clicks,cpc,cpm,reach}`;
  } else {
    const preset = opts.datePreset || "last_30d";
    insightsField = `insights.date_preset(${preset}){spend,impressions,clicks,cpc,cpm,reach}`;
  }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test && npx tsc --noEmit`
Expected: PASS, `tsc` limpo.

- [ ] **Step 5: Commit**

```bash
git add lib/meta.ts lib/meta.test.ts
git commit -m "feat: fetchMetaCampaigns aceita since, para recortar a edição atual"
```

---

## Fase 4 - Tela

### Task 11: `GET /api/leads`

**Files:**
- Create: `app/api/leads/route.ts`

**Interfaces:**
- Consumes: tabela `leads`
- Produces: `GET /api/leads?event_id=saopaulo` devolve `{ total, unicos, porLote, convertidos }`, onde `convertidos` é a contagem de e-mails que também aparecem em `sales.payer_email` do mesmo evento.

- [ ] **Step 1: Implementar**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const eventId = new URL(req.url).searchParams.get("event_id");
  if (!eventId) return NextResponse.json({ error: "event_id é obrigatório" }, { status: 400 });

  const { data: leads, error } = await supabase
    .from("leads")
    .select("email, lote")
    .eq("event_id", eventId);

  if (error) {
    console.error("[Leads] Erro ao ler:", error.message);
    return NextResponse.json({ error: "Erro ao ler leads." }, { status: 500 });
  }

  const linhas = leads ?? [];
  const emails = new Set(linhas.map((l) => l.email));

  const porLote: Record<string, number> = {};
  for (const l of linhas) porLote[l.lote ?? "nao_informado"] = (porLote[l.lote ?? "nao_informado"] ?? 0) + 1;

  const { data: vendas } = await supabase
    .from("sales")
    .select("payer_email")
    .eq("event_id", eventId)
    .neq("status", "refunded");

  const emailsVenda = new Set((vendas ?? []).map((v) => String(v.payer_email ?? "").trim().toLowerCase()).filter(Boolean));
  const convertidos = [...emails].filter((e) => emailsVenda.has(e)).length;

  return NextResponse.json({ total: linhas.length, unicos: emails.size, porLote, convertidos });
}
```

- [ ] **Step 2: Provar rodando**

Run: `curl -s "http://localhost:3000/api/leads?event_id=saopaulo" | python3 -m json.tool`
Expected: `unicos` igual a **1455**, e `porLote` batendo com a seção 3.2 da spec.

- [ ] **Step 3: Commit**

```bash
git add app/api/leads/route.ts
git commit -m "feat: rota de leitura dos leads, com conversão por e-mail"
```

---

### Task 12: Bloco do funil no Dashboard

**Files:**
- Create: `app/components/LeadFunnelCard.tsx`
- Modify: `app/components/Dashboard.tsx`

**Interfaces:**
- Consumes: `GET /api/leads` (Task 11); `IndicatorCard` e `FinancialCard`, que já existem
- Produces: componente `LeadFunnelCard({ eventId, eventName, investimento, capacidade, individualTickets, doubleTickets })`

- [ ] **Step 1: Criar o componente**

```tsx
"use client";

import { useEffect, useState } from "react";

type Resumo = {
  total: number;
  unicos: number;
  porLote: Record<string, number>;
  convertidos: number;
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function LeadFunnelCard({
  eventId,
  eventName,
  investimento,
  capacidade,
  individualTickets,
  doubleTickets,
}: {
  eventId: string;
  eventName: string;
  investimento: number;
  capacidade: number;
  individualTickets: number;
  doubleTickets: number;
}) {
  const [dados, setDados] = useState<Resumo | null>(null);

  useEffect(() => {
    fetch(`/api/leads?event_id=${eventId}`)
      .then((r) => r.json())
      .then((d) => { if (!d?.error) setDados(d); })
      .catch(() => {});
  }, [eventId]);

  const leads = dados?.unicos ?? 0;
  const vendas = individualTickets + doubleTickets;
  const pessoas = individualTickets + doubleTickets * 2;

  const cpl = leads > 0 ? investimento / leads : 0;
  const conversao = leads > 0 ? (dados?.convertidos ?? 0) / leads : 0;
  const ocupacao = capacidade > 0 ? pessoas / capacidade : 0;

  // Enquanto carrega, o traço é o mesmo placeholder que as outras telas usam.
  const n = (v: string) => (dados ? v : "—");

  const etapas = [
    { rotulo: "Investimento", valor: fmtBRL(investimento), abaixo: null },
    { rotulo: "Leads", valor: n(String(leads)), abaixo: n(`${fmtBRL(cpl)} por lead`) },
    { rotulo: "Vendas", valor: n(String(vendas)), abaixo: n(`${(conversao * 100).toFixed(1)}% dos leads`) },
    { rotulo: "Vagas ocupadas", valor: n(`${pessoas} de ${capacidade}`), abaixo: n(`${Math.round(ocupacao * 100)}%`) },
  ];

  return (
    <div style={{ background: "#0f0f0f", border: "1px solid #262626", borderRadius: 12, padding: 16 }}>
      <p className="text-[9px]" style={{ fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#6b7280" }}>
        Funil de leads · {eventName}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 12, marginTop: 12 }}>
        {etapas.map((e) => (
          <div key={e.rotulo}>
            <p className="text-[9px]" style={{ color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em" }}>{e.rotulo}</p>
            <p className="text-base sm:text-[20px] leading-none" style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#fbbf24", marginTop: 4 }}>{e.valor}</p>
            {e.abaixo && <p className="text-[10px]" style={{ color: "#4b5563", marginTop: 2 }}>{e.abaixo}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

Cores e espaçamentos saíram de `FinancialCard.tsx` e `IndicatorCard.tsx`, que já existem. O tema é dark fixo, não há modo claro para tratar.

- [ ] **Step 2: Encaixar no Dashboard**

Em `app/components/Dashboard.tsx`, renderizar `LeadFunnelCard` **somente** para eventos que tenham `captacao_inicio` preenchido. Os outros 8 eventos não mudam nada. Passar o investimento já recortado pelo `since`.

- [ ] **Step 3: Conferir na tela**

Subir o app, abrir o Dashboard e conferir os quatro números contra as consultas diretas ao banco e à Meta. Tirar um print.

- [ ] **Step 4: Checar tipos, lint e testes**

Run: `npm test && npx tsc --noEmit && npm run lint 2>&1 | tail -3`
Expected: 100% dos testes passando, `tsc` limpo, nenhum problema de lint novo nos arquivos tocados.

- [ ] **Step 5: Commit**

```bash
git add app/components/LeadFunnelCard.tsx app/components/Dashboard.tsx
git commit -m "feat: bloco de funil de leads no Dashboard do Experience"
```

---

## Ao terminar

- Atualizar `Dashboardcircuitoagro.md`: changelog, seção 5 com a tabela `leads` e a coluna `captacao_inicio`, seção 7 com a régua nova, e uma entrada em Incidentes sobre os R$ 286 mil que estavam invisíveis.
- Rodar a skill `superpowers:finishing-a-development-branch` para integrar.
- Três pontos ficaram sem resposta do Rafael e continuam abertos: capacidade real do Experience (o código assume 350 para todos), destino do lead que não casa com evento, e o plano B para o cruzamento lead → venda quando a pessoa compra com outro e-mail.
