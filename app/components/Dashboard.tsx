"use client";

import { useState, useMemo } from "react";
import { NavBar } from "./NavBar";
import { FinancialCard } from "./FinancialCard";
import { IndicatorCard } from "./IndicatorCard";
import { EventRow } from "./EventRow";
import { EventRealizadoRow } from "./EventRealizadoRow";
import type { AppEvent } from "../types";

type Financials = {
  trafficInvestment: number;
  grossRevenue: number;
  netRevenue: number;
  averageCPA: number;
  totalBalance: number;
};

type Props = {
  events: AppEvent[];
  financials: Financials;
};

type Tab = "proximos" | "realizados";

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

export function Dashboard({ events, financials }: Props) {
  const [tab, setTab] = useState<Tab>("proximos");
  const [cityFilter, setCityFilter] = useState("all");

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

  const totalIndividual = events.reduce((s, e) => s + e.individualTickets, 0);
  const totalDouble = events.reduce((s, e) => s + e.doubleTickets, 0);
  const totalPeople = totalIndividual + totalDouble * 2;
  const totalCapacity = events.length * 350;
  const occupancyPct = Math.round((totalPeople / totalCapacity) * 100);

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

        {/* Cards financeiros */}
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Financeiro</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FinancialCard title="Investimento em Tráfego" value={financials.trafficInvestment} color="gold" subtitle="Soma de todos os eventos"
              icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
            <FinancialCard title="Faturamento Bruto" value={financials.grossRevenue} color="blue" subtitle="Receita total gerada"
              icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <FinancialCard title="Faturamento Líquido" value={financials.netRevenue} color="green" subtitle="Após deduções e custos"
              icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>} />
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
            <IndicatorCard title="CPA Médio" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(financials.averageCPA)} trend="neutral"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
            <IndicatorCard title="Balanço Geral" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(financials.totalBalance)} trend="up"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>} />
          </div>
        </section>

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
