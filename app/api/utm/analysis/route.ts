import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchMetaCampaigns } from "@/lib/meta";
import { removeAccents } from "@/lib/utils";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  city: string;
  state: string;
  utm_nomenclatura: string;
  individualTickets: number;
  doubleTickets: number;
};

type SaleRow = {
  event_id: string;
  offer_name: string | null;
  faturamento_bruto: number;
};

// ── Timezone helpers (Brasília = UTC-3, sem horário de verão) ────────────────

const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000; // 3 h em ms

// Retorna um Date cujos campos UTC correspondem ao horário atual em Brasília.
// Exemplo: se agora é 23:30 UTC, nowInBrasilia().getUTCHours() = 20 (UTC-3).
function nowInBrasilia(): Date {
  return new Date(Date.now() - BRASILIA_OFFSET_MS);
}

// Dado um Date cujos campos UTC representam uma data em Brasília,
// retorna o timestamp UTC que corresponde à meia-noite (00:00:00) desse dia em Brasília.
// Meia-noite Brasília = 03:00 UTC
function startOfDayBrasiliaUTC(brasiliaDate: Date): Date {
  return new Date(Date.UTC(
    brasiliaDate.getUTCFullYear(),
    brasiliaDate.getUTCMonth(),
    brasiliaDate.getUTCDate(),
    3, 0, 0, 0,
  ));
}

// Retorna o timestamp UTC que corresponde a 23:59:59.999 do dia em Brasília.
// 23:59:59 Brasília = início do próximo dia (03:00 UTC) - 1 ms
function endOfDayBrasiliaUTC(brasiliaDate: Date): Date {
  return new Date(
    Date.UTC(
      brasiliaDate.getUTCFullYear(),
      brasiliaDate.getUTCMonth(),
      brasiliaDate.getUTCDate() + 1,
      3, 0, 0, 0,
    ) - 1,
  );
}

function dateRangeFromPreset(preset: string): { from: string; to: string } | null {
  const now = nowInBrasilia(); // campos UTC = horário Brasília
  const nowUTC = new Date();   // instante atual real em UTC (usado como "to" para presets abertos)

  if (preset === "today")
    return {
      from: startOfDayBrasiliaUTC(now).toISOString(),
      to:   nowUTC.toISOString(),
    };

  if (preset === "yesterday") {
    const yd = new Date(now);
    yd.setUTCDate(yd.getUTCDate() - 1);
    return {
      from: startOfDayBrasiliaUTC(yd).toISOString(),
      to:   endOfDayBrasiliaUTC(yd).toISOString(),
    };
  }

  if (preset === "last_7d") {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - 6);
    return {
      from: startOfDayBrasiliaUTC(d).toISOString(),
      to:   nowUTC.toISOString(),
    };
  }

  if (preset === "this_month") {
    const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return {
      from: startOfDayBrasiliaUTC(firstDay).toISOString(),
      to:   nowUTC.toISOString(),
    };
  }

  if (preset === "last_month") {
    const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const lastDay  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(),     0));
    return {
      from: startOfDayBrasiliaUTC(firstDay).toISOString(),
      to:   endOfDayBrasiliaUTC(lastDay).toISOString(),
    };
  }

  return null;
}

// Interpreta uma string "YYYY-MM-DD" ou ISO como uma data em Brasília
// e retorna um Date cujos campos UTC representam essa data.
function parseBrasiliaDateStr(s: string): Date {
  const dateOnly = s.split("T")[0]; // extrai só "YYYY-MM-DD"
  const [y, m, d] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// ── Normalização para matching ───────────────────────────────────────────────
// Remove acentos, substitui não-alfanuméricos por espaço E remove os espaços.
// Isso permite "RIOVERDE" bater com "RIO VERDE" e vice-versa.
function normNS(s: string): string {
  return removeAccents(s).replace(/\s+/g, "");
}

// ── Atribuição de venda ──────────────────────────────────────────────────────
// Retorna true se o offer_name indica claramente que a venda veio da campanha do evento.
function isTracked(offerName: string, city: string, utmNomenclatura: string): boolean {
  if (!offerName) return false;

  const normOfferNS  = normNS(offerName);
  const normUtmNS    = normNS(utmNomenclatura || "");

  // Primeira checagem: UTM nomenclatura (sem espaços) presente no offer (sem espaços)
  if (normUtmNS && normOfferNS.includes(normUtmNS)) return true;

  // Fallback: palavras significativas da cidade presentes no offer
  const cityWords = removeAccents(city).split(" ").filter((w) => w.length > 2);
  if (cityWords.length === 0) return false;
  const normOffer = removeAccents(offerName);
  const minMatch  = Math.min(cityWords.length, 2);
  return cityWords.filter((w) => normOffer.includes(w)).length >= minMatch;
}

// ── Handler principal ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cityParam  = searchParams.get("city");
  const from       = searchParams.get("from");
  const to         = searchParams.get("to");
  const datePreset = searchParams.get("date_preset") || "this_month";

  console.log("[UTM] city param recebido:", cityParam);
  console.log("[UTM] date_preset:", datePreset, "| from:", from, "| to:", to);

  // ── 1. Eventos ──────────────────────────────────────────────────────────────
  const { data: eventsData, error: evError } = await supabase
    .from("events")
    .select("id, city, state, utm_nomenclatura, individualTickets, doubleTickets")
    .order("city");

  if (evError || !eventsData) {
    return NextResponse.json({ error: "Erro ao buscar eventos" }, { status: 500 });
  }

  const events = eventsData as EventRow[];

  // Filtra por cidade com normalização sem espaços: "RIOVERDE" bate com "RIO VERDE" no DB
  const targetEvents = cityParam
    ? events.filter((e) => normNS(e.utm_nomenclatura) === normNS(cityParam))
    : events;

  console.log("[UTM] Eventos no DB:", events.map((e) => `${e.city}(utm=${e.utm_nomenclatura})`).join(", "));
  console.log("[UTM] Eventos após filtro de cidade:", targetEvents.map((e) => e.city).join(", ") || "(nenhum)");

  if (targetEvents.length === 0) return emptyResponse();

  const eventIds = targetEvents.map((e) => e.id);

  // ── 2. Período para queries de vendas (com timezone Brasília) ───────────────
  let dateRange: { from: string; to: string } | null;

  if (from && to) {
    // Datas customizadas vindas do frontend (input type="date" → "YYYY-MM-DD")
    // Interpreta como datas em Brasília e aplica os limites corretos em UTC
    const fromBrasilia = parseBrasiliaDateStr(from);
    const toBrasilia   = parseBrasiliaDateStr(to);
    dateRange = {
      from: startOfDayBrasiliaUTC(fromBrasilia).toISOString(),
      to:   endOfDayBrasiliaUTC(toBrasilia).toISOString(),
    };
  } else {
    dateRange = dateRangeFromPreset(datePreset);
  }

  console.log("[UTM] dateRange para Supabase:", JSON.stringify(dateRange));

  // ── 3. Vendas aprovadas no período ──────────────────────────────────────────
  let salesQ = supabase
    .from("sales")
    .select("event_id, offer_name, faturamento_bruto")
    .in("event_id", eventIds)
    .neq("status", "refunded");

  if (dateRange) {
    salesQ = salesQ.gte("sale_date", dateRange.from).lte("sale_date", dateRange.to);
  }

  const { data: salesData, error: salesError } = await salesQ;
  const sales: SaleRow[] = Array.isArray(salesData) ? salesData : [];

  console.log("[UTM] vendas Supabase encontradas:", sales.length, "| erro:", salesError?.message ?? "none");
  if (sales.length > 0) {
    console.log("[UTM] amostra vendas (até 5):", JSON.stringify(sales.slice(0, 5)));
  }

  // ── 4. Contagem all-time por evento (para "desconhecidas") ──────────────────
  const { data: allSalesData } = await supabase
    .from("sales")
    .select("event_id")
    .in("event_id", eventIds)
    .neq("status", "refunded");

  const allSalesCountByEvent: Record<string, number> = {};
  if (Array.isArray(allSalesData)) {
    for (const s of allSalesData) {
      allSalesCountByEvent[s.event_id] = (allSalesCountByEvent[s.event_id] || 0) + 1;
    }
  }

  // ── 5. Campanhas Meta ───────────────────────────────────────────────────────
  // Passa apenas a data (YYYY-MM-DD) para o Meta, não o ISO completo
  const metaOpts = from && to
    ? { from: from.split("T")[0], to: to.split("T")[0], city: cityParam || undefined }
    : { datePreset, city: cityParam || undefined };

  console.log("[UTM] fetchMetaCampaigns opts:", JSON.stringify(metaOpts));

  const metaResult = await fetchMetaCampaigns(metaOpts);

  console.log("[UTM] campanhas Meta retornadas:", metaResult.campaigns.map((c) => c.name));
  console.log("[UTM] totalSpend:", metaResult.totalSpend);

  const metaCampaigns = metaResult.campaigns;

  // Log de matching por evento
  for (const ev of targetEvents) {
    const utmNS  = normNS(ev.utm_nomenclatura || "");
    const matched = metaCampaigns.filter((c) => normNS(c.name).includes(utmNS));
    console.log("[UTM] campanhas após filtro de cidade %s (utm=%s normNS=%s): %d campanhas | spend=%.2f",
      ev.city, ev.utm_nomenclatura, utmNS,
      matched.length,
      matched.reduce((s, c) => s + c.spend, 0),
    );
  }

  // ── 6. Cálculos por evento ──────────────────────────────────────────────────
  let aggInvested = 0, aggRevenue = 0;
  let aggTracked = 0, aggTrackedRev = 0;
  let aggBugged = 0, aggBuggedRev = 0;
  let aggUnknown = 0;

  const campaignRows = targetEvents.map((ev) => {
    const evSales   = sales.filter((s) => s.event_id === ev.id);
    const allEvCount = allSalesCountByEvent[ev.id] || 0;

    let trackedCount = 0, trackedRevenue = 0;
    let buggedCount = 0, buggedRevenue = 0;

    for (const sale of evSales) {
      if (isTracked(sale.offer_name || "", ev.city, ev.utm_nomenclatura)) {
        trackedCount++;
        trackedRevenue += sale.faturamento_bruto || 0;
      } else {
        buggedCount++;
        buggedRevenue += sale.faturamento_bruto || 0;
      }
    }

    const totalEventTickets = ev.individualTickets + ev.doubleTickets;
    const unknownCount      = Math.max(0, totalEventTickets - allEvCount);

    // Investimento Meta: compara sem espaços para "RIOVERDE" bater "RIO VERDE"
    const utmNS     = normNS(ev.utm_nomenclatura || "");
    const evInvested = utmNS
      ? metaCampaigns
          .filter((c) => normNS(c.name).includes(utmNS))
          .reduce((sum, c) => sum + c.spend, 0)
      : 0;

    const evRevenue   = trackedRevenue + buggedRevenue;
    const totalTickets = trackedCount + buggedCount + unknownCount;
    const roi = evInvested > 0 ? evRevenue / evInvested : 0;
    const cpa = totalTickets > 0 ? evInvested / totalTickets : 0;
    const pct = (n: number) => totalTickets > 0 ? Math.round((n / totalTickets) * 100) : 0;

    aggInvested  += evInvested;
    aggRevenue   += evRevenue;
    aggTracked   += trackedCount;  aggTrackedRev += trackedRevenue;
    aggBugged    += buggedCount;   aggBuggedRev  += buggedRevenue;
    aggUnknown   += unknownCount;

    return {
      city:             ev.city,
      state:            ev.state,
      utm_nomenclatura: ev.utm_nomenclatura,
      invested:         evInvested,
      revenue:          evRevenue,
      roi,
      cpa,
      individualTickets: ev.individualTickets,
      doubleTickets:     ev.doubleTickets,
      trackedCount,
      trackedRevenue,
      buggedCount,
      buggedRevenue,
      unknownCount,
      attribution: {
        tracked:   pct(trackedCount),
        buggedUtm: pct(buggedCount),
        unknown:   pct(unknownCount),
      },
    };
  });

  const totalTickets = aggTracked + aggBugged + aggUnknown;
  const attrPct = (n: number) => totalTickets > 0 ? Math.round((n / totalTickets) * 100) : 0;

  // Usa o totalSpend da Meta diretamente para coincidir com o Dashboard.
  const totalInvested = metaResult.totalSpend > 0 ? metaResult.totalSpend : aggInvested;

  return NextResponse.json({
    totalInvested,
    totalRevenue: aggRevenue,
    totalTickets,
    roi:        totalInvested > 0 ? aggRevenue / totalInvested : 0,
    averageCpa: totalTickets  > 0 ? totalInvested / totalTickets : 0,
    attribution: {
      tracked:   { count: aggTracked,  revenue: aggTrackedRev, percentage: attrPct(aggTracked)  },
      buggedUtm: { count: aggBugged,   revenue: aggBuggedRev,  percentage: attrPct(aggBugged)   },
      unknown:   { count: aggUnknown,  revenue: 0,             percentage: attrPct(aggUnknown)  },
    },
    campaigns: campaignRows,
  });
}

function emptyResponse() {
  return NextResponse.json({
    totalInvested: 0, totalRevenue: 0, totalTickets: 0, roi: 0, averageCpa: 0,
    attribution: {
      tracked:   { count: 0, revenue: 0, percentage: 0 },
      buggedUtm: { count: 0, revenue: 0, percentage: 0 },
      unknown:   { count: 0, revenue: 0, percentage: 0 },
    },
    campaigns: [],
  });
}
