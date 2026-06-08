"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { NavBar } from "./NavBar";
import { FinancialCard } from "./FinancialCard";
import { IndicatorCard } from "./IndicatorCard";
import { EventRow } from "./EventRow";
import { EventRealizadoRow } from "./EventRealizadoRow";
import type { AppEvent } from "../types";

type Props = {
  events: AppEvent[];
};

type Tab = "proximos" | "realizados";
type DateFilter = "all" | "today" | "yesterday" | "7days" | "month" | "custom";

type Sale = {
  id: string;
  event_id: string;
  ticket_type: "individual" | "duplo";
  faturamento_bruto: number;
  faturamento_liquido: number;
  sale_date: string;
  status: string;
  refunded_at: string | null;
};

type MetaCampaign = {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  cpm: number;
  reach: number;
};

function getMetaParams(
  dateFilter: DateFilter,
  dateFrom: string,
  dateTo: string
): URLSearchParams {
  const p = new URLSearchParams();
  if (dateFilter === "today")         p.set("date_preset", "today");
  else if (dateFilter === "yesterday") p.set("date_preset", "yesterday");
  else if (dateFilter === "7days")     p.set("date_preset", "last_7d");
  else if (dateFilter === "month")     p.set("date_preset", "this_month");
  else if (dateFilter === "custom" && dateFrom && dateTo) {
    p.set("from", dateFrom);
    p.set("to", dateTo);
  } else {
    p.set("date_preset", "last_30d");
  }
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T00:00:00") < today;
}

function isRealizadoTab(ev: AppEvent): boolean {
  return ev.status === "realizado" || ev.status === "cancelado" || isPast(ev.date);
}

export function Dashboard({ events }: Props) {
  const [tab, setTab] = useState<Tab>("proximos");
  const [cityFilter, setCityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]   = useState("");
  const [salesData, setSalesData] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([]);
  const [metaTotalSpend, setMetaTotalSpend] = useState(0);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [metaConfigured, setMetaConfigured] = useState(true);

  const cities = useMemo(
    () => ["all", ...Array.from(new Set(events.map((e) => e.city)))],
    [events]
  );

  const proximos = useMemo(() => events.filter((e) => !isRealizadoTab(e)), [events]);
  const realizados = useMemo(() => events.filter((e) => isRealizadoTab(e)), [events]);

  const proximosFiltrados = cityFilter === "all" ? proximos : proximos.filter((e) => e.city === cityFilter);
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

  // Base para os cards: respeita o filtro de cidade
  const filteredEvents = useMemo(
    () => cityFilter === "all" ? events : events.filter((e) => e.city === cityFilter),
    [cityFilter, events]
  );

  // String primitiva de IDs — evita instabilidade de referência de array no useCallback
  const filteredEventIds = useMemo(
    () => filteredEvents.map((e) => e.id).join(","),
    [filteredEvents]
  );

  // Busca vendas sempre (para reembolsos) — aplica data quando filtro ativo
  const fetchSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const range = getDateRange(dateFilter, dateFrom, dateTo);
      const params = new URLSearchParams();
      if (filteredEventIds) params.set("event_ids", filteredEventIds);
      if (range?.from) params.set("from", range.from);
      if (range?.to)   params.set("to",   range.to);
      const res = await fetch(`/api/sales?${params}`);
      const data: Sale[] = await res.json();
      setSalesData(Array.isArray(data) ? data : []);
    } catch {
      setSalesData([]);
    } finally {
      setSalesLoading(false);
    }
  }, [dateFilter, dateFrom, dateTo, filteredEventIds]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const fetchMeta = useCallback(async () => {
    setMetaLoading(true);
    setMetaError(null);
    try {
      const params = getMetaParams(dateFilter, dateFrom, dateTo);
      const res = await fetch(`/api/meta/campaigns?${params}`);
      const data = await res.json();
      if (res.status === 503 && data.error === "not_configured") {
        setMetaConfigured(false);
        return;
      }
      if (data.error) {
        setMetaError(data.error);
        return;
      }
      setMetaCampaigns(data.campaigns ?? []);
      setMetaTotalSpend(data.totalSpend ?? 0);
    } catch {
      setMetaError("Não foi possível carregar dados da Meta");
    } finally {
      setMetaLoading(false);
    }
  }, [dateFilter, dateFrom, dateTo]);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  // Decide a fonte dos dados para os cards de ingressos/faturamento
  const usingSales = dateFilter !== "all" && !(dateFilter === "custom" && (!dateFrom || !dateTo));

  // Separa approved e refunded
  const approvedSales  = salesData.filter((s) => s.status !== "refunded");
  const refundedSales  = salesData.filter((s) => s.status === "refunded");
  const refundCount    = refundedSales.length;
  const refundValue    = refundedSales.reduce((s, r) => s + (r.faturamento_bruto || 0), 0);

  // Métricas de ingressos (apenas approved quando usando sales)
  const totalIndividual = usingSales
    ? approvedSales.filter((s) => s.ticket_type === "individual").length
    : filteredEvents.reduce((s, e) => s + e.individualTickets, 0);
  const totalDouble = usingSales
    ? approvedSales.filter((s) => s.ticket_type === "duplo").length
    : filteredEvents.reduce((s, e) => s + e.doubleTickets, 0);

  const totalPeople = totalIndividual + totalDouble * 2;
  const totalCapacity = filteredEvents.length * 350;
  const occupancyPct = totalCapacity > 0 ? Math.round((totalPeople / totalCapacity) * 100) : 0;

  // Métricas financeiras
  const trafficInvestment = filteredEvents.reduce((s, e) => s + e.trafficInvestment, 0);
  const grossRevenue = usingSales
    ? approvedSales.reduce((s, sale) => s + (sale.faturamento_bruto || 0), 0)
    : filteredEvents.reduce((s, e) => s + (e.faturamento_bruto > 0 ? e.faturamento_bruto : 0), 0);
  const netRevenue = usingSales
    ? approvedSales.reduce((s, sale) => s + (sale.faturamento_liquido || 0), 0)
    : filteredEvents.reduce((s, e) => s + (e.faturamento_liquido > 0 ? e.faturamento_liquido : 0), 0);
  const totalTickets = totalIndividual + totalDouble;

  // Usa o gasto real da Meta quando disponível
  const metaLoaded = metaConfigured && !metaLoading && !metaError;
  const effectiveInvestment = metaLoaded ? metaTotalSpend : trafficInvestment;
  const averageCPA = totalTickets > 0 ? effectiveInvestment / totalTickets : 0;
  const totalBalance = netRevenue - effectiveInvestment;

  const fmtBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const fmtBRL2 = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(v);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">

        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 flex-shrink-0 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-lg flex items-center justify-center">
              <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="24" y1="8" x2="24" y2="40" stroke="#FEDF00" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="12" y1="12" x2="36" y2="12" stroke="#FEDF00" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M10,14 L8,22 Q14,26 18,22 L16,14" stroke="#FEDF00" strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
                <path d="M32,14 L30,22 Q36,26 40,22 L38,14" stroke="#FEDF00" strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
                <path d="M20,34 Q18,30 22,28 Q20,32 24,34 Q22,30 26,28 Q24,32 28,34" stroke="#A3E635" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">Circuito Nacional</h1>
              <p className="text-lg sm:text-xl font-semibold text-emerald-700 dark:text-emerald-400">Jurídico Agro 2026</p>
            </div>
          </div>
          <div className="sm:ml-auto text-sm text-gray-500 dark:text-gray-400 sm:text-right">
            <p className="font-medium text-gray-700 dark:text-gray-300">8 cidades · 8 eventos</p>
            <p>Todo o Brasil · Jul–Out 2026</p>
          </div>
        </header>

        {/* Filtro de período */}
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Período</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex flex-wrap items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              {([ ["today", "Hoje"], ["yesterday", "Ontem"], ["7days", "Últimos 7 dias"], ["month", "Este mês"], ["custom", "Personalizado"] ] as [DateFilter, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setDateFilter(id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap ${
                    dateFilter === id
                      ? "bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10 font-semibold"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            {dateFilter === "custom" && (
              <div className="flex items-center gap-2">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm" />
                <span className="text-gray-400 dark:text-gray-500 text-sm font-medium">até</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm" />
              </div>
            )}
            {usingSales && (
              <span className="sm:ml-auto flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {salesLoading
                  ? <><span className="h-3 w-3 border border-emerald-500 border-t-transparent rounded-full animate-spin inline-block" /> Carregando...</>
                  : <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{salesData.length} venda{salesData.length !== 1 ? "s" : ""} no período</>
                }
              </span>
            )}
          </div>
        </section>

        {/* Cards financeiros */}
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Financeiro</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <FinancialCard
              title="Investimento em Tráfego"
              value={effectiveInvestment}
              color="gold"
              subtitle={metaLoaded ? "Meta Ads · período selecionado" : "Soma de todos os eventos"}
              icon={<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            />
            <FinancialCard title="Faturamento Bruto" value={grossRevenue} color="blue" subtitle="Valor pago pelo cliente"
              icon={<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <FinancialCard title="Faturamento Líquido" value={netRevenue} color="green" subtitle="Valor bruto - taxas da plataforma"
              icon={<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>} />
            {/* Card Reembolsos — mesmo padrão que FinancialCard */}
            <div className={`rounded-2xl border p-3 shadow-sm flex flex-col justify-between transition-all ${
              refundCount > 0
                ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800/50"
                : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
            }`}>
              <div className="flex items-start justify-between">
                <p className={`text-[9px] font-bold uppercase tracking-widest leading-tight ${refundCount > 0 ? "text-red-700 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}`}>
                  Reembolsos
                </p>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ml-2 ${refundCount > 0 ? "bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400" : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"}`}>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </div>
              </div>
              <div className="mt-2">
                <p className={`text-lg font-bold tabular-nums leading-none ${refundCount > 0 ? "text-red-700 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}`}>
                  {refundCount}
                </p>
                <p className={`text-[10px] opacity-70 mt-0.5 ${refundCount > 0 ? "text-red-700 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}`}>
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(refundValue)} estornados
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Cards indicadores */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Indicadores</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <IndicatorCard title="Ingressos Individuais" value={totalIndividual} trend="up" suffix="vendidos"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
            <IndicatorCard title="Ingressos Duplos" value={totalDouble} trend="up" suffix="vendidos"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
            <IndicatorCard title="CPA Médio" value={fmtBRL2(averageCPA)} trend="neutral"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
            <IndicatorCard title="Balanço Geral" value={fmtBRL(totalBalance)} trend={totalBalance >= 0 ? "up" : "down"}
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>} />
          </div>
        </section>

        {/* Meta Ads */}
        {metaConfigured && (
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Meta Ads</h2>
              {metaLoading && (
                <span className="h-3 w-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
              )}
              {!metaLoading && metaLoaded && (
                <button onClick={fetchMeta} title="Atualizar" className="text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>

            {metaError ? (
              <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {metaError}
              </div>
            ) : metaLoading ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500 animate-pulse">
                Carregando dados da Meta...
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                {/* Resumo */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total investido no período</span>
                  <span className="text-lg font-bold tabular-nums text-blue-700 dark:text-blue-400">
                    {fmtBRL(metaTotalSpend)}
                  </span>
                </div>

                {/* Tabela de campanhas ativas */}
                {metaCampaigns.filter((c) => c.status === "ACTIVE").length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                    Nenhuma campanha ativa no período
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Campanha</th>
                          <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Gasto</th>
                          <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 hidden sm:table-cell">Impressões</th>
                          <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 hidden sm:table-cell">Cliques</th>
                          <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 hidden md:table-cell">CPM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metaCampaigns
                          .filter((c) => c.status === "ACTIVE")
                          .sort((a, b) => b.spend - a.spend)
                          .map((c) => (
                            <tr key={c.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                              <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200 max-w-[200px] truncate" title={c.name}>
                                {c.name}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-blue-700 dark:text-blue-400">
                                {fmtBRL(c.spend)}
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                                {c.impressions.toLocaleString("pt-BR")}
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                                {c.clicks.toLocaleString("pt-BR")}
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-400 hidden md:table-cell">
                                {fmtBRL(c.cpm)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Seção de eventos */}
        <section>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Programação de Eventos</h2>
            <div className="flex items-center gap-2">
              <label htmlFor="city-filter" className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">Filtrar por cidade:</label>
              <select id="city-filter" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer">
                <option value="all">Todas as cidades</option>
                {cities.slice(1).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Abas */}
          <div className="flex gap-1 mb-5 border-b border-gray-200 dark:border-gray-700">
            {([["proximos", "Próximos eventos", proximos.length], ["realizados", "Realizados", realizados.length]] as const).map(([id, label, count]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${tab === id ? "text-emerald-700 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>
                {label}
                {count > 0 && (
                  <span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs font-semibold ${tab === id ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                    {count}
                  </span>
                )}
                {tab === id && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-emerald-600 dark:bg-emerald-500" />}
              </button>
            ))}
          </div>

          {/* Aba: Próximos */}
          {tab === "proximos" && (
            <>
              <div className="mb-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">Ocupação total do circuito</span>
                  <span className="text-green-600 dark:text-green-400 text-sm font-semibold">{totalPeople} / {totalCapacity} pessoas ({occupancyPct}%)</span>
                </div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full bg-green-500 progress-bar" style={{ width: `${Math.min(100, occupancyPct)}%` }} />
                </div>
              </div>
              {grouped.length === 0 ? (
                <p className="text-center py-12 text-gray-400 dark:text-gray-500">Nenhum evento futuro encontrado{cityFilter !== "all" ? ` para ${cityFilter}` : ""}.</p>
              ) : (
                <div className="space-y-6">
                  {grouped.map(([key, monthEvents]) => {
                    const [year, monthIdx] = key.split("-");
                    return (
                      <div key={key}>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-gray-700 dark:text-gray-300 font-semibold text-lg">{MONTHS_PT[parseInt(monthIdx, 10)]} {year}</span>
                          <div className="flex-1 h-px border-gray-200 dark:border-gray-700 border-t" />
                          <span className="text-xs text-gray-400 dark:text-gray-500">{monthEvents.length} evento{monthEvents.length > 1 ? "s" : ""}</span>
                        </div>
                        <div>{monthEvents.map((ev) => <EventRow key={ev.id} event={ev} />)}</div>
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
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  <svg className="h-7 w-7 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum evento realizado ainda</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Eventos aparecerão aqui quando a data passar ou o status for alterado no Admin.</p>
              </div>
            ) : (
              <div>{realizadosFiltrados.map((ev) => <EventRealizadoRow key={ev.id} event={ev} />)}</div>
            )
          )}
        </section>

        <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800 text-center text-xs text-gray-400 dark:text-gray-600">
          Circuito Nacional Jurídico Agro 2026 · Dashboard interno
        </footer>
      </div>
    </div>
  );
}
