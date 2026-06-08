"use client";

import { useState, useEffect, useCallback } from "react";
import { NavBar } from "./NavBar";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type ApiCampaign = {
  city: string;
  state: string;
  utm_nomenclatura: string;
  invested: number;
  revenue: number;
  roi: number;
  cpa: number;
  individualTickets: number;
  doubleTickets: number;
  trackedCount: number;
  trackedRevenue: number;
  buggedCount: number;
  buggedRevenue: number;
  unknownCount: number;
  attribution: { tracked: number; buggedUtm: number; unknown: number };
};

type ApiResponse = {
  totalInvested: number;
  totalRevenue: number;
  totalTickets: number;
  roi: number;
  averageCpa: number;
  attribution: {
    tracked:   { count: number; revenue: number; percentage: number };
    buggedUtm: { count: number; revenue: number; percentage: number };
    unknown:   { count: number; revenue: number; percentage: number };
  };
  campaigns: ApiCampaign[];
};

// ── Filtros rápidos ────────────────────────────────────────────────────────────

const QUICK_FILTERS = [
  { label: "Todas (REGIONAL)", value: "" },
  { label: "Cuiabá",           value: "CUIABA" },
  { label: "Rio Verde",        value: "RIOVERDE" },
  { label: "Cascavel",         value: "CASCAVEL" },
  { label: "Uberlândia",       value: "UBERLANDIA" },
  { label: "Campo Grande",     value: "CAMPOGRANDE" },
  { label: "L.E. Magalhães",   value: "LUISEDUARDO" },
  { label: "Ribeirão Preto",   value: "RIBEIRAO" },
  { label: "Sorriso",          value: "SORRISO" },
];

// ── Formatadores ───────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);
}

function fmtDec(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v);
}

// ── Componente ─────────────────────────────────────────────────────────────────

export function AnalysisPage() {
  const [inputValue, setInputValue]   = useState("REGIONAL");
  const [selectedCity, setSelectedCity] = useState("");   // "" = todas
  const [data, setData]               = useState<ApiResponse | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (city: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date_preset: "this_month" });
      if (city) params.set("city", city);
      const res = await fetch(`/api/utm/analysis?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(selectedCity); }, [selectedCity, fetchData]);

  // ── Aplicar filtro ────────────────────────────────────────────────────────
  function applyFilter(value: string) {
    const v = value.trim().toUpperCase();
    const city = v === "REGIONAL" || v === "" ? "" : v;
    setInputValue(city || "REGIONAL");
    setSelectedCity(city);
  }

  const campaigns = data?.campaigns ?? [];
  const attribution = data?.attribution;
  const activeLabel = QUICK_FILTERS.find((f) => f.value === selectedCity)?.label
    ?? (selectedCity || "REGIONAL");

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0f1117]">
      <NavBar />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">

        {/* Cabeçalho */}
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-white">
            Análise de Investimento por Campanha
            <span className="text-emerald-600 dark:text-emerald-400"> · UTM</span>
          </h1>
          <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">
            Rastreamento de origem de vendas por parâmetros UTM das campanhas de tráfego pago
          </p>
        </header>

        {/* Filtros */}
        <section className="mb-8 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800/50 p-5">
          <p className="mb-3 text-sm font-semibold text-[#475569] dark:text-slate-300">
            Filtrar por nomenclatura de campanha
          </p>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && applyFilter(inputValue)}
              placeholder="Ex: REGIONAL, UBERLANDIA, CUIABA..."
              className="flex-1 rounded-lg border border-[#E2E8F0] dark:border-slate-600 bg-[#F8FAFC] dark:bg-slate-900 text-[#0F172A] dark:text-slate-100 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button
              onClick={() => applyFilter(inputValue)}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold transition-colors"
            >
              Aplicar filtro
            </button>
          </div>

          {/* Pills */}
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_FILTERS.map((qf) => (
              <button
                key={qf.value}
                onClick={() => applyFilter(qf.value || "REGIONAL")}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  selectedCity === qf.value
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white dark:bg-slate-700 text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-slate-600 hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400"
                }`}
              >
                {qf.label}
              </button>
            ))}
          </div>

          {/* Chip filtro ativo */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748B] dark:text-slate-400">Filtrando:</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              {activeLabel}
              {!loading && campaigns.length > 0 && selectedCity !== "" && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  · {campaigns.length} campanha{campaigns.length !== 1 ? "s" : ""}
                </span>
              )}
            </span>
            {loading && (
              <span className="h-3.5 w-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </section>

        {/* Estado de erro */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            Erro ao carregar dados: {error}
          </div>
        )}

        {/* Cards de métricas */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#64748B] dark:text-slate-400">
            Métricas do período filtrado
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Investido */}
            <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-lg bg-red-100 dark:bg-red-900/50 p-2 text-red-600 dark:text-red-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">Investido</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-red-700 dark:text-red-400">
                {loading ? "—" : fmt(data?.totalInvested ?? 0)}
              </p>
              <p className="text-xs text-red-600/70 dark:text-red-500 mt-1">Tráfego pago</p>
            </div>

            {/* Faturamento */}
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/50 p-2 text-emerald-600 dark:text-emerald-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Faturamento</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {loading ? "—" : fmt(data?.totalRevenue ?? 0)}
              </p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-500 mt-1">Receita total</p>
            </div>

            {/* ROI */}
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/50 p-2 text-emerald-600 dark:text-emerald-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">ROI rastreado</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {loading ? "—" : <>{(data?.roi ?? 0).toFixed(1)}<span className="text-lg">x</span></>}
              </p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-500 mt-1">Retorno sobre ad spend</p>
            </div>

            {/* CPA */}
            <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800/60 p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-lg bg-white dark:bg-slate-700/80 p-2 text-[#475569] dark:text-slate-300 shadow-sm">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B] dark:text-slate-400">CPA médio</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-[#0F172A] dark:text-slate-100">
                {loading ? "—" : fmtDec(data?.averageCpa ?? 0)}
              </p>
              <p className="text-xs text-[#64748B] dark:text-slate-500 mt-1">Por ingresso vendido</p>
            </div>
          </div>
        </section>

        {/* Atribuição */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#64748B] dark:text-slate-400">
            Atribuição das vendas
          </h2>
          <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800/50 p-5">
            {/* Barra stacked */}
            <div className="mb-5">
              <div className="flex rounded-full overflow-hidden h-4 gap-0.5">
                <div
                  className="bg-emerald-500 transition-all duration-700"
                  style={{ width: `${attribution?.tracked.percentage ?? 0}%` }}
                  title={`Rastreadas: ${attribution?.tracked.percentage ?? 0}%`}
                />
                <div
                  className="bg-amber-400 transition-all duration-700"
                  style={{ width: `${attribution?.buggedUtm.percentage ?? 0}%` }}
                  title={`UTM bugada: ${attribution?.buggedUtm.percentage ?? 0}%`}
                />
                <div
                  className="bg-slate-300 dark:bg-slate-600 transition-all duration-700"
                  style={{ width: `${attribution?.unknown.percentage ?? 0}%` }}
                  title={`Desconhecida: ${attribution?.unknown.percentage ?? 0}%`}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-[#64748B] dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  Rastreadas {attribution?.tracked.percentage ?? 0}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                  UTM bugada {attribution?.buggedUtm.percentage ?? 0}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                  Desconhecida {attribution?.unknown.percentage ?? 0}%
                </span>
              </div>
            </div>

            {/* 3 cards de atribuição */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Rastreadas */}
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/50 p-2">
                    <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Rastreadas</span>
                </div>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {loading ? "—" : fmt(attribution?.tracked.revenue ?? 0)}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                  {attribution?.tracked.percentage ?? 0}% · {attribution?.tracked.count ?? 0} ingressos
                </p>
                <p className="text-xs text-emerald-700/60 dark:text-emerald-600 mt-2">
                  UTM completa e atribuída corretamente
                </p>
              </div>

              {/* UTM bugada */}
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-lg bg-amber-100 dark:bg-amber-900/50 p-2">
                    <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Tráfego pago UTM bugada</span>
                </div>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                  {loading ? "—" : fmt(attribution?.buggedUtm.revenue ?? 0)}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                  {attribution?.buggedUtm.percentage ?? 0}% · {attribution?.buggedUtm.count ?? 0} ingressos
                </p>
                <p className="text-xs text-amber-700/60 dark:text-amber-600 mt-2">
                  Clique rastreado porém parâmetros UTM incompletos
                </p>
              </div>

              {/* Desconhecida */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-lg bg-slate-100 dark:bg-slate-700 p-2">
                    <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-[#475569] dark:text-slate-300">Origem desconhecida</span>
                </div>
                <p className="text-xl font-bold text-[#475569] dark:text-slate-300 tabular-nums">
                  {loading ? "—" : fmt(0)}
                </p>
                <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                  {attribution?.unknown.percentage ?? 0}% · {attribution?.unknown.count ?? 0} ingressos
                </p>
                <p className="text-xs text-[#94A3B8] dark:text-slate-500 mt-2">
                  Sem parâmetros UTM — tráfego orgânico ou direto
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tabela detalhada */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#64748B] dark:text-slate-400">
            Detalhamento por campanha
          </h2>
          <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-[#94A3B8] dark:text-slate-500 animate-pulse">
                Carregando dados…
              </div>
            ) : campaigns.length === 0 ? (
              <p className="p-8 text-center text-[#94A3B8] dark:text-slate-500">
                Nenhuma campanha encontrada para o filtro &ldquo;{activeLabel}&rdquo;.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-900/60">
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] dark:text-slate-400">Cidade / Campanha</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] dark:text-slate-400">Investido</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] dark:text-slate-400">Faturamento</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] dark:text-slate-400">ROI</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] dark:text-slate-400">CPA</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] dark:text-slate-400">Atribuição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] dark:divide-slate-700/60">
                    {campaigns.map((c) => {
                      const roiColor =
                        c.roi >= 5 ? "text-emerald-700 dark:text-emerald-400"
                        : c.roi >= 2 ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400";

                      return (
                        <tr key={c.utm_nomenclatura} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-[#0F172A] dark:text-slate-100">{c.city} · {c.state}</p>
                            <p className="text-xs text-[#64748B] dark:text-slate-400 font-mono mt-0.5">{c.utm_nomenclatura}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400 tabular-nums">
                            {fmt(c.invested)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {fmt(c.revenue)}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold tabular-nums ${roiColor}`}>
                            {c.roi.toFixed(1)}x
                          </td>
                          <td className="px-4 py-3 text-right text-[#475569] dark:text-slate-300 tabular-nums">
                            {fmtDec(c.cpa)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex rounded-full overflow-hidden h-2 w-full min-w-[80px]">
                              <div className="bg-emerald-500" style={{ width: `${c.attribution.tracked}%` }} title={`Rastreado: ${c.attribution.tracked}%`} />
                              <div className="bg-amber-400" style={{ width: `${c.attribution.buggedUtm}%` }} title={`UTM bugada: ${c.attribution.buggedUtm}%`} />
                              <div className="flex-1 bg-slate-200 dark:bg-slate-600" title="Desconhecido" />
                            </div>
                            <p className="text-xs text-[#94A3B8] dark:text-slate-500 mt-1 text-center">
                              {c.trackedCount}·{c.buggedCount}·{c.unknownCount}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {campaigns.length > 1 && data && (
                    <tfoot>
                      <tr className="border-t-2 border-[#E2E8F0] dark:border-slate-600 bg-[#F8FAFC] dark:bg-slate-900/40">
                        <td className="px-4 py-3 font-bold text-[#0F172A] dark:text-slate-100">
                          Total ({campaigns.length} campanhas)
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400 tabular-nums">
                          {fmt(data.totalInvested)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {fmt(data.totalRevenue)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#0F172A] dark:text-slate-100 tabular-nums">
                          {data.roi.toFixed(1)}x
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#475569] dark:text-slate-300 tabular-nums">
                          {fmtDec(data.averageCpa)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </section>

        <footer className="mt-12 pt-6 border-t border-[#E2E8F0] dark:border-slate-800 text-center text-xs text-[#94A3B8] dark:text-slate-600">
          Circuito Nacional Jurídico Agro 2026 · Análise UTM
        </footer>
      </div>
    </div>
  );
}
