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

function dateRangeFromPreset(preset: string): { from: string; to: string } | null {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (preset === "today")
    return { from: iso(sod(now)), to: iso(now) };

  if (preset === "yesterday") {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    return { from: iso(sod(d)), to: iso(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)) };
  }
  if (preset === "last_7d") {
    const d = new Date(now); d.setDate(d.getDate() - 6);
    return { from: iso(sod(d)), to: iso(now) };
  }
  if (preset === "this_month")
    return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };

  if (preset === "last_month")
    return {
      from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: iso(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)),
    };

  return null;
}

// A venda é "rastreada" se o offer_name contém a cidade de forma identificável.
function isTracked(offerName: string, city: string, utmNomenclatura: string): boolean {
  const normOffer = removeAccents(offerName);
  const normUtm = removeAccents(utmNomenclatura || "");

  if (normUtm && normOffer.includes(normUtm)) return true;

  // Fallback: verifica se as palavras significativas da cidade estão no offer
  const cityWords = removeAccents(city).split(" ").filter((w) => w.length > 2);
  if (cityWords.length === 0) return false;
  const minMatch = Math.min(cityWords.length, 2);
  return cityWords.filter((w) => normOffer.includes(w)).length >= minMatch;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cityParam = searchParams.get("city");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const datePreset = searchParams.get("date_preset") || "this_month";

  // ── 1. Eventos ────────────────────────────────────────────────────────────
  const { data: eventsData, error: evError } = await supabase
    .from("events")
    .select("id, city, state, utm_nomenclatura, individualTickets, doubleTickets")
    .order("city");

  if (evError || !eventsData) {
    return NextResponse.json({ error: "Erro ao buscar eventos" }, { status: 500 });
  }

  const events = eventsData as EventRow[];
  const targetEvents = cityParam
    ? events.filter((e) => removeAccents(e.utm_nomenclatura) === removeAccents(cityParam))
    : events;

  if (targetEvents.length === 0) return emptyResponse();

  const eventIds = targetEvents.map((e) => e.id);

  // ── 2. Período para queries de vendas ─────────────────────────────────────
  const dateRange = from && to
    ? { from: new Date(from).toISOString(), to: new Date(to + "T23:59:59.999").toISOString() }
    : dateRangeFromPreset(datePreset);

  // ── 3. Vendas aprovadas no período (atribuição + faturamento) ─────────────
  let salesQ = supabase
    .from("sales")
    .select("event_id, offer_name, faturamento_bruto")
    .in("event_id", eventIds)
    .neq("status", "refunded");

  if (dateRange) {
    salesQ = salesQ.gte("sale_date", dateRange.from).lte("sale_date", dateRange.to);
  }

  const { data: salesData } = await salesQ;
  const sales: SaleRow[] = Array.isArray(salesData) ? salesData : [];

  // ── 4. Contagem total de vendas por evento (all-time, para "desconhecidas") ─
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

  // ── 5. Campanhas Meta filtradas por cidade e período ─────────────────────
  const metaOpts = from && to
    ? { from, to,       city: cityParam || undefined }
    : { datePreset,     city: cityParam || undefined };

  console.log("[UTM Analysis] Params recebidos: city=%s from=%s to=%s date_preset=%s", cityParam, from, to, datePreset);
  console.log("[UTM Analysis] Chamando fetchMetaCampaigns com:", JSON.stringify(metaOpts));

  const metaResult = await fetchMetaCampaigns(metaOpts);

  console.log("[UTM Analysis] Meta result: error=%s campaigns=%d totalSpend=%d",
    metaResult.error ?? "none",
    metaResult.campaigns.length,
    metaResult.totalSpend
  );

  const metaCampaigns = metaResult.campaigns;

  // Log matching por evento
  for (const ev of targetEvents) {
    const normUtm = removeAccents(ev.utm_nomenclatura || "");
    const matched = metaCampaigns.filter((c) => removeAccents(c.name).includes(normUtm));
    console.log("[UTM Analysis] Evento %s: normUtm=%s matched=%d campaigns spend=%d",
      ev.city, normUtm,
      matched.length,
      matched.reduce((s, c) => s + c.spend, 0)
    );
  }

  // ── 6. Cálculos por evento ────────────────────────────────────────────────
  // aggInvested: soma dos investimentos que batem por evento (usado nas linhas da tabela)
  // totalInvested na resposta usa metaResult.totalSpend para coincidir com o Dashboard
  let aggInvested = 0, aggRevenue = 0;
  let aggTracked = 0, aggTrackedRev = 0;
  let aggBugged = 0, aggBuggedRev = 0;
  let aggUnknown = 0;

  const campaignRows = targetEvents.map((ev) => {
    const evSales = sales.filter((s) => s.event_id === ev.id);
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
    const unknownCount = Math.max(0, totalEventTickets - allEvCount);

    // Investimento Meta: campanhas cujo nome normalizado contém o utm
    const normUtm = removeAccents(ev.utm_nomenclatura || "");
    const evInvested = normUtm
      ? metaCampaigns
          .filter((c) => removeAccents(c.name).includes(normUtm))
          .reduce((sum, c) => sum + c.spend, 0)
      : 0;

    const evRevenue = trackedRevenue + buggedRevenue;
    const totalTickets = trackedCount + buggedCount + unknownCount;
    const roi = evInvested > 0 ? evRevenue / evInvested : 0;
    const cpa = totalTickets > 0 ? evInvested / totalTickets : 0;
    const pct = (n: number) => totalTickets > 0 ? Math.round((n / totalTickets) * 100) : 0;

    aggInvested += evInvested;
    aggRevenue  += evRevenue;
    aggTracked  += trackedCount; aggTrackedRev += trackedRevenue;
    aggBugged   += buggedCount;  aggBuggedRev  += buggedRevenue;
    aggUnknown  += unknownCount;

    return {
      city: ev.city,
      state: ev.state,
      utm_nomenclatura: ev.utm_nomenclatura,
      invested: evInvested,
      revenue: evRevenue,
      roi,
      cpa,
      individualTickets: ev.individualTickets,
      doubleTickets: ev.doubleTickets,
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
  // aggInvested (soma por matching de evento) pode ser menor quando há campanhas
  // REGIONAL que não batem o UTM de nenhum evento específico.
  const totalInvested = metaResult.totalSpend > 0 ? metaResult.totalSpend : aggInvested;

  return NextResponse.json({
    totalInvested,
    totalRevenue:  aggRevenue,
    totalTickets,
    roi:        totalInvested > 0 ? aggRevenue / totalInvested : 0,
    averageCpa: totalTickets > 0 ? totalInvested / totalTickets : 0,
    attribution: {
      tracked:   { count: aggTracked,  revenue: aggTrackedRev, percentage: attrPct(aggTracked) },
      buggedUtm: { count: aggBugged,   revenue: aggBuggedRev,  percentage: attrPct(aggBugged) },
      unknown:   { count: aggUnknown,  revenue: 0,             percentage: attrPct(aggUnknown) },
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
