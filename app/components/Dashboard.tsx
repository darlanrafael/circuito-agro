"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { NavBar } from "./NavBar";
import { FinancialCard } from "./FinancialCard";
import { IndicatorCard } from "./IndicatorCard";
import { EventRow } from "./EventRow";
import { EventRealizadoRow } from "./EventRealizadoRow";
import type { AppEvent } from "../types";

type Props = { events: AppEvent[] };
type Tab = "proximos" | "realizados";
type DateFilter = "all" | "today" | "yesterday" | "7days" | "month" | "custom";

type Sale = {
  id: string; event_id: string;
  ticket_type: "individual" | "duplo";
  faturamento_bruto: number; faturamento_liquido: number;
  sale_date: string; status: string; refunded_at: string | null;
};

type MetaCampaign = {
  id: string; name: string; status: string; spend: number;
  impressions: number; clicks: number; cpc: number; cpm: number; reach: number;
};

function getMetaParams(dateFilter: DateFilter, dateFrom: string, dateTo: string, city?: string): URLSearchParams {
  const p = new URLSearchParams();
  if (dateFilter === "today")         p.set("date_preset", "today");
  else if (dateFilter === "yesterday") p.set("date_preset", "yesterday");
  else if (dateFilter === "7days")     p.set("date_preset", "last_7d");
  else if (dateFilter === "month")     p.set("date_preset", "this_month");
  else if (dateFilter === "custom" && dateFrom && dateTo) { p.set("from", dateFrom); p.set("to", dateTo); }
  else { p.set("date_preset", "last_30d"); }
  if (city) p.set("city", city);
  return p;
}

function getDateRange(filter: DateFilter, from: string, to: string): { from: string; to: string } | null {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
  const endOfDay   = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();
  if (filter === "today")     return { from: startOfDay(now), to: endOfDay(now) };
  if (filter === "yesterday") { const d = new Date(now); d.setDate(d.getDate() - 1); return { from: startOfDay(d), to: endOfDay(d) }; }
  if (filter === "7days")     { const d = new Date(now); d.setDate(d.getDate() - 6); return { from: startOfDay(d), to: endOfDay(now) }; }
  if (filter === "month")     return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: endOfDay(now) };
  if (filter === "custom" && from && to) return { from: new Date(from).toISOString(), to: endOfDay(new Date(to)) };
  return null;
}

const MONTHS_PT: Record<number, string> = {
  0: "Janeiro", 1: "Fevereiro", 2: "Março", 3: "Abril",
  4: "Maio", 5: "Junho", 6: "Julho", 7: "Agosto",
  8: "Setembro", 9: "Outubro", 10: "Novembro", 11: "Dezembro",
};

function isPast(dateStr: string): boolean {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T00:00:00") < today;
}

function isRealizadoTab(ev: AppEvent): boolean {
  return ev.status === "realizado" || ev.status === "cancelado" || isPast(ev.date);
}

export function Dashboard({ events }: Props) {
  const [tab, setTab]               = useState<Tab>("proximos");
  const [cityFilter, setCityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [salesData, setSalesData]   = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([]);
  const [metaTotalSpend, setMetaTotalSpend] = useState(0);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError]   = useState<string | null>(null);
  const [metaConfigured, setMetaConfigured] = useState(true);

  const cities      = useMemo(() => ["all", ...Array.from(new Set(events.map((e) => e.city)))], [events]);
  const proximos    = useMemo(() => events.filter((e) => !isRealizadoTab(e)), [events]);
  const realizados  = useMemo(() => events.filter((e) => isRealizadoTab(e)), [events]);
  const proximosFiltrados   = cityFilter === "all" ? proximos : proximos.filter((e) => e.city === cityFilter);
  const realizadosFiltrados = cityFilter === "all" ? realizados : realizados.filter((e) => e.city === cityFilter);

  const grouped = useMemo(() => {
    const map: Record<string, AppEvent[]> = {};
    proximosFiltrados.forEach((ev) => {
      const d = new Date(ev.date + "T00:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [proximosFiltrados]);

  const filteredEvents    = useMemo(() => cityFilter === "all" ? events : events.filter((e) => e.city === cityFilter), [cityFilter, events]);
  const filteredEventIds  = useMemo(() => filteredEvents.map((e) => e.id).join(","), [filteredEvents]);
  const selectedCityUtm   = useMemo(() => cityFilter !== "all" && filteredEvents.length > 0 ? (filteredEvents[0].utm_nomenclatura ?? "") : "", [cityFilter, filteredEvents]);

  const fetchSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const range = getDateRange(dateFilter, dateFrom, dateTo);
      const params = new URLSearchParams();
      if (filteredEventIds) params.set("event_ids", filteredEventIds);
      if (range?.from) params.set("from", range.from);
      if (range?.to)   params.set("to", range.to);
      const res = await fetch(`/api/sales?${params}`);
      const data: Sale[] = await res.json();
      setSalesData(Array.isArray(data) ? data : []);
    } catch { setSalesData([]); }
    finally { setSalesLoading(false); }
  }, [dateFilter, dateFrom, dateTo, filteredEventIds]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const fetchMeta = useCallback(async () => {
    setMetaLoading(true); setMetaError(null);
    try {
      const params = getMetaParams(dateFilter, dateFrom, dateTo, selectedCityUtm || undefined);
      const res = await fetch(`/api/meta/campaigns?${params}`);
      const data = await res.json();
      if (res.status === 503 && data.error === "not_configured") { setMetaConfigured(false); return; }
      if (data.error) { setMetaError(data.error); return; }
      setMetaCampaigns(data.campaigns ?? []);
      setMetaTotalSpend(data.totalSpend ?? 0);
    } catch { setMetaError("Não foi possível carregar dados da Meta"); }
    finally { setMetaLoading(false); }
  }, [dateFilter, dateFrom, dateTo, selectedCityUtm]);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const usingSales       = dateFilter !== "all" && !(dateFilter === "custom" && (!dateFrom || !dateTo));
  const approvedSales    = salesData.filter((s) => s.status !== "refunded");
  const refundedSales    = salesData.filter((s) => s.status === "refunded");
  const refundCount      = refundedSales.length;
  const refundValue      = refundedSales.reduce((s, r) => s + (r.faturamento_bruto || 0), 0);

  const totalIndividual  = usingSales ? approvedSales.filter((s) => s.ticket_type === "individual").length : filteredEvents.reduce((s, e) => s + e.individualTickets, 0);
  const totalDouble      = usingSales ? approvedSales.filter((s) => s.ticket_type === "duplo").length : filteredEvents.reduce((s, e) => s + e.doubleTickets, 0);
  const totalPeople      = totalIndividual + totalDouble * 2;
  const totalCapacity    = filteredEvents.length * 350;
  const occupancyPct     = totalCapacity > 0 ? Math.round((totalPeople / totalCapacity) * 100) : 0;

  const trafficInvestment = filteredEvents.reduce((s, e) => s + e.trafficInvestment, 0);
  const grossRevenue = usingSales ? approvedSales.reduce((s, sale) => s + (sale.faturamento_bruto || 0), 0) : filteredEvents.reduce((s, e) => s + (e.faturamento_bruto > 0 ? e.faturamento_bruto : 0), 0);
  const netRevenue   = usingSales ? approvedSales.reduce((s, sale) => s + (sale.faturamento_liquido || 0), 0) : filteredEvents.reduce((s, e) => s + (e.faturamento_liquido > 0 ? e.faturamento_liquido : 0), 0);
  const totalTickets = totalIndividual + totalDouble;

  const metaLoaded          = metaConfigured && !metaLoading && !metaError;
  const effectiveInvestment = metaLoaded ? metaTotalSpend : trafficInvestment;
  const averageCPA          = totalTickets > 0 ? effectiveInvestment / totalTickets : 0;
  const totalBalance        = netRevenue - effectiveInvestment;

  // Map event_id → period ticket counts (built from approved sales in memory, no extra fetch)
  const salesByEvent = useMemo(() => {
    const map = new Map<string, { individual: number; duplo: number }>();
    if (!usingSales) return map;
    for (const s of salesData) {
      if (s.status === "refunded") continue;
      const entry = map.get(s.event_id) ?? { individual: 0, duplo: 0 };
      if (s.ticket_type === "individual") entry.individual++;
      else if (s.ticket_type === "duplo")  entry.duplo++;
      map.set(s.event_id, entry);
    }
    return map;
  }, [usingSales, salesData]);

  const fmtBRL  = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const fmtBRL2 = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(v);

  // suppress unused variable warning (metaCampaigns fetched but displayed via totalSpend only)
  void metaCampaigns;

  const sectionLabel: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.2em", color: "#4b5563",
  };

  const inputStyle: React.CSSProperties = {
    borderRadius: 10, border: "1px solid #333", background: "#0d0d0d",
    color: "white", padding: "8px 12px", fontSize: 13, outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d" }}>
      <NavBar />
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-5 sm:py-4 lg:px-8 lg:py-6">

        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <div style={{ height: 3, display: "flex", borderRadius: 2, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ flex: 1, background: "#22c55e" }} />
            <div style={{ flex: 1, background: "#eab308" }} />
            <div style={{ flex: 1, background: "#ef4444" }} />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-efagro-regional.png" alt="EFAGRO Regional" className="h-9 sm:h-12 w-auto flex-shrink-0" />
              <div>
                <h1 className="text-xl sm:text-3xl" style={{ fontWeight: 700, color: "white", lineHeight: 1.2 }}>
                  Circuito Nacional
                </h1>
                <p className="text-sm sm:text-xl" style={{ fontWeight: 600, color: "#22c55e" }}>
                  Jurídico Agro 2026
                </p>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              <p style={{ fontWeight: 600, color: "#9ca3af" }}>8 cidades · 8 eventos</p>
              <p style={{ fontSize: 11 }}>Todo o Brasil · Jul–Out 2026</p>
            </div>
          </div>
        </header>

        {/* Filtro de período */}
        <section className="mb-5 sm:mb-6">
          <h2 style={{ ...sectionLabel, marginBottom: 8 }}>Período</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div
              className="flex flex-wrap items-center gap-0.5 p-1"
              style={{ background: "#161616", borderRadius: 14, border: "1px solid #1f1f1f" }}
            >
              {([
                ["today",     "Hoje"],
                ["yesterday", "Ontem"],
                ["7days",     "7 dias"],
                ["month",     "Este mês"],
                ["custom",    "Personalizado"],
              ] as [DateFilter, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setDateFilter(id)}
                  className="whitespace-nowrap text-[11px] sm:text-[13px] px-2.5 py-[5px] sm:px-3 sm:py-[6px] rounded-[7px] sm:rounded-[10px]"
                  style={{
                    fontWeight: dateFilter === id ? 700 : 500,
                    background: dateFilter === id ? "#22c55e" : "transparent",
                    color: dateFilter === id ? "white" : "#6b7280",
                    border: "none", cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {dateFilter === "custom" && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full sm:w-auto" style={inputStyle} />
                <span className="hidden sm:inline" style={{ color: "#4b5563", fontSize: 13 }}>até</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="w-full sm:w-auto" style={inputStyle} />
              </div>
            )}

            {usingSales && (
              <span className="sm:ml-auto flex items-center gap-1.5 text-[11px] sm:text-xs" style={{ color: "#22c55e", fontWeight: 500 }}>
                {salesLoading ? (
                  <><span className="h-3 w-3 border border-emerald-500 border-t-transparent rounded-full animate-spin inline-block" /> Carregando...</>
                ) : (
                  <><svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{salesData.length} venda{salesData.length !== 1 ? "s" : ""}</>
                )}
              </span>
            )}
          </div>
        </section>

        {/* Cards financeiros */}
        <section className="mb-5 sm:mb-6">
          <h2 style={{ ...sectionLabel, marginBottom: 8 }}>Financeiro</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 lg:gap-3">
            <FinancialCard
              title="Investimento em Tráfego" value={effectiveInvestment} color="gold"
              subtitle={metaLoaded ? "Meta Ads · período" : "Soma dos eventos"}
              onRefresh={fetchMeta} isRefreshing={metaLoading}
              icon={<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            />
            <FinancialCard
              title="Faturamento Bruto" value={grossRevenue} color="blue"
              subtitle="Valor pago pelo cliente"
              icon={<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <FinancialCard
              title="Faturamento Líquido" value={netRevenue} color="green"
              subtitle="Bruto - taxas plataforma"
              icon={<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
            />
            {/* Card Reembolsos */}
            <div
              className="relative flex flex-col p-3 sm:py-[14px] sm:px-4"
              style={{
                background: "#161616", border: "1px solid #252525",
                borderLeft: `3px solid ${refundCount > 0 ? "#ef4444" : "#374151"}`,
                borderRadius: "0 12px 12px 0", gap: 4,
              }}
            >
              <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 flex items-center justify-center"
                style={{ background: "#1f1f1f", borderRadius: 8, padding: 5, color: refundCount > 0 ? "#ef4444" : "#374151" }}>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                </svg>
              </div>
              <p className="text-[8px] sm:text-[9px] pr-7"
                style={{ fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: refundCount > 0 ? "#991b1b" : "#374151" }}>
                Reembolsos
              </p>
              <p className="text-base sm:text-[20px] leading-none"
                style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: refundCount > 0 ? "#ef4444" : "#6b7280" }}>
                {refundCount}
              </p>
              <p className="text-[9px] sm:text-[10px]" style={{ color: "#4b5563" }}>
                {fmtBRL(refundValue)} estornados
              </p>
            </div>
          </div>
        </section>

        {/* Cards indicadores */}
        <section className="mb-6 sm:mb-8">
          <h2 style={{ ...sectionLabel, marginBottom: 8 }}>Indicadores</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-3 lg:gap-4">
            <IndicatorCard title="Ingressos Individuais" value={totalIndividual} trend="up" suffix="vendidos"
              icon={<svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
            <IndicatorCard title="Ingressos Duplos" value={totalDouble} trend="up" suffix="vendidos"
              icon={<svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
            <IndicatorCard title="CPA Médio" value={fmtBRL2(averageCPA)} trend="neutral"
              icon={<svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
            <IndicatorCard title="Balanço Geral" value={fmtBRL(totalBalance)} trend={totalBalance >= 0 ? "up" : "down"}
              icon={<svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>} />
          </div>
        </section>

        {/* Seção de eventos */}
        <section>
          {/* Header: título + filtro de cidade */}
          <div style={{ marginBottom: 12 }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <h2 style={sectionLabel}>Programação de Eventos</h2>
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-[13px] whitespace-nowrap" style={{ color: "#9ca3af" }}>
                  Filtrar por cidade:
                </label>
                <select
                  className="flex-1 sm:flex-none"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  style={{
                    background: "#161616", border: "1px solid #252525",
                    color: "white", borderRadius: 10, padding: "10px 12px",
                    fontSize: 13, cursor: "pointer", outline: "none", minWidth: 0,
                  }}
                >
                  <option value="all">Todas as cidades</option>
                  {cities.slice(1).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Abas */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid #252525" }}>
            {([
              ["proximos",   "Próximos eventos", proximos.length],
              ["realizados", "Realizados",       realizados.length],
            ] as const).map(([id, label, count]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="text-xs sm:text-[13px]"
                style={{
                  position: "relative", padding: "8px 12px", fontWeight: 500,
                  color: tab === id ? "#22c55e" : "#6b7280",
                  background: "transparent", border: "none", cursor: "pointer",
                }}
              >
                {label}
                {count > 0 && (
                  <span style={{
                    marginLeft: 5, borderRadius: 99, padding: "1px 5px",
                    fontSize: 11, fontWeight: 600,
                    background: tab === id ? "#052e16" : "#1f1f1f",
                    color: tab === id ? "#22c55e" : "#4b5563",
                  }}>
                    {count}
                  </span>
                )}
                {tab === id && <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "#22c55e", borderRadius: "2px 2px 0 0" }} />}
              </button>
            ))}
          </div>

          {/* Aba: Próximos */}
          {tab === "proximos" && (
            <>
              {/* Barra de ocupação */}
              <div className="p-3 sm:p-[14px_18px] mb-4 sm:mb-5"
                style={{ borderRadius: 14, border: "1px solid #252525", background: "#161616" }}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 mb-2">
                  <span className="text-[11px] sm:text-[13px]" style={{ color: "#9ca3af", fontWeight: 500 }}>
                    Ocupação total do circuito
                  </span>
                  <span className="text-[11px] sm:text-[13px] sm:text-right" style={{ color: "#22c55e", fontWeight: 600 }}>
                    {totalPeople} / {totalCapacity} pessoas ({occupancyPct}%)
                  </span>
                </div>
                <div style={{ background: "#1f1f1f", borderRadius: 4, overflow: "hidden" }} className="h-1.5 sm:h-2">
                  <div className="progress-bar h-full" style={{ width: `${Math.min(100, occupancyPct)}%`, background: "#22c55e", borderRadius: 4 }} />
                </div>
              </div>

              {usingSales && (
                <p className="text-[10px] sm:text-xs mb-3 sm:mb-4" style={{ color: "#4b5563", fontStyle: "italic" }}>
                  Ingressos exibidos referentes ao período selecionado
                </p>
              )}

              {grouped.length === 0 ? (
                <p className="text-sm" style={{ textAlign: "center", padding: "40px 0", color: "#4b5563" }}>
                  Nenhum evento futuro encontrado{cityFilter !== "all" ? ` para ${cityFilter}` : ""}.
                </p>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {grouped.map(([key, monthEvents]) => {
                    const [year, monthIdx] = key.split("-");
                    return (
                      <div key={key} className="mt-4 sm:mt-5">
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <span
                            className="text-[9px] sm:text-[17px] uppercase sm:normal-case tracking-[0.15em] sm:tracking-normal"
                            style={{ fontWeight: 600, color: "#9ca3af" }}
                          >
                            {MONTHS_PT[parseInt(monthIdx, 10)]} {year}
                          </span>
                          <div style={{ flex: 1, height: 1, background: "#252525" }} />
                          <span className="text-[10px] sm:text-xs" style={{ color: "#4b5563" }}>
                            {monthEvents.length} evento{monthEvents.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div>{monthEvents.map((ev) => (
                          <EventRow
                            key={ev.id}
                            event={ev}
                            periodIndividual={usingSales ? (salesByEvent.get(ev.id)?.individual ?? 0) : undefined}
                            periodDouble={usingSales ? (salesByEvent.get(ev.id)?.duplo ?? 0) : undefined}
                          />
                        ))}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Aba: Realizados */}
          {tab === "realizados" && (
            realizadosFiltrados.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 26, background: "#161616", marginBottom: 14 }}>
                  <svg className="h-6 w-6" style={{ color: "#4b5563" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <p className="text-sm" style={{ color: "#6b7280", fontWeight: 500 }}>Nenhum evento realizado ainda</p>
                <p className="text-xs mt-1" style={{ color: "#4b5563" }}>
                  Eventos aparecerão aqui quando a data passar ou o status for alterado no Admin.
                </p>
              </div>
            ) : (
              <div>{realizadosFiltrados.map((ev) => <EventRealizadoRow key={ev.id} event={ev} />)}</div>
            )
          )}
        </section>

        <footer style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid #1f1f1f", textAlign: "center", fontSize: 12, color: "#4b5563" }}>
          Circuito Nacional Jurídico Agro 2026 · Dashboard interno
        </footer>
      </div>
    </div>
  );
}
