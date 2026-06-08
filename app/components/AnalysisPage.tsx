"use client";

import { useState, useEffect, useCallback } from "react";
import { NavBar } from "./NavBar";

type ApiCampaign = {
  city: string; state: string; utm_nomenclatura: string;
  invested: number; revenue: number; roi: number; cpa: number;
  individualTickets: number; doubleTickets: number;
  trackedCount: number; trackedRevenue: number;
  buggedCount: number; buggedRevenue: number;
  unknownCount: number;
  attribution: { tracked: number; buggedUtm: number; unknown: number };
};

type ApiResponse = {
  totalInvested: number; totalRevenue: number; totalTickets: number;
  roi: number; averageCpa: number;
  attribution: {
    tracked:   { count: number; revenue: number; percentage: number };
    buggedUtm: { count: number; revenue: number; percentage: number };
    unknown:   { count: number; revenue: number; percentage: number };
  };
  campaigns: ApiCampaign[];
};

type DateFilter = "today" | "yesterday" | "7days" | "month" | "custom";

const DATE_PRESETS: Record<Exclude<DateFilter, "custom">, string> = {
  today: "today", yesterday: "yesterday", "7days": "last_7d", month: "this_month",
};

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

function fmtDec(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v);
}

export function AnalysisPage() {
  const [inputValue, setInputValue]   = useState("REGIONAL");
  const [selectedCity, setSelectedCity] = useState("");
  const [dateFilter, setDateFilter]   = useState<DateFilter>("month");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [data, setData]               = useState<ApiResponse | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCity) params.set("city", selectedCity);
      if (dateFilter === "custom") {
        if (dateFrom) params.set("from", dateFrom);
        if (dateTo)   params.set("to", dateTo);
      } else {
        params.set("date_preset", DATE_PRESETS[dateFilter]);
      }
      const res = await fetch(`/api/utm/analysis?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [selectedCity, dateFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function applyFilter(value: string) {
    const v = value.trim().toUpperCase();
    const city = v === "REGIONAL" || v === "" ? "" : v;
    setInputValue(city || "REGIONAL");
    setSelectedCity(city);
  }

  const DATE_FILTER_LABELS: Record<DateFilter, string> = {
    today: "Hoje", yesterday: "Ontem", "7days": "Últimos 7 dias",
    month: "Este mês", custom: "Personalizado",
  };

  const campaigns  = data?.campaigns ?? [];
  const attribution = data?.attribution;
  const activeLabel = QUICK_FILTERS.find((f) => f.value === selectedCity)?.label ?? (selectedCity || "REGIONAL");

  // ROAS card — inline style logic
  const roasVal      = data?.roi ?? 0;
  const roasInvested = data?.totalInvested ?? 0;
  const roasNoData   = !loading && roasInvested === 0;
  const roasGood     = !loading && !roasNoData && roasVal >= 1;
  const roasBad      = !loading && !roasNoData && roasVal < 1;

  const roasCardStyle: React.CSSProperties = roasNoData
    ? { background: "#161616", border: "1px solid #252525" }
    : roasGood
    ? { background: "#0f1f0f", border: "1px solid #166534" }
    : { background: "#1f0a0a", border: "1px solid #7f1d1d" };
  const roasIconStyle: React.CSSProperties = roasNoData
    ? { background: "#1f1f1f", color: "#6b7280" }
    : roasGood
    ? { background: "#052e16", color: "#22c55e" }
    : { background: "#2d0f0f", color: "#ef4444" };
  const roasLabelColor = roasNoData ? "#6b7280" : roasGood ? "#22c55e" : "#ef4444";
  const roasValColor   = roasNoData ? "#6b7280" : roasGood ? "#22c55e" : "#ef4444";
  const roasSubColor   = roasNoData ? "#4b5563" : roasGood ? "#166534" : "#991b1b";
  const roasDisplay    = loading || roasNoData ? "—" : roasBad ? `−${roasVal.toFixed(1)}x` : `${roasVal.toFixed(1)}x`;

  const sectionLabel: React.CSSProperties = {
    marginBottom: 10, fontSize: 9, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.2em", color: "#4b5563",
  };

  const inputStyle: React.CSSProperties = {
    borderRadius: 10, border: "1px solid #333", background: "#0d0d0d",
    color: "white", padding: "6px 12px", fontSize: 13, outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d" }}>
      <NavBar />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">

        {/* Cabeçalho */}
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 700, color: "white" }}>
            Análise de Investimento por Campanha
            <span style={{ color: "#22c55e" }}> · UTM</span>
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: "#6b7280" }}>
            Rastreamento de origem de vendas por parâmetros UTM das campanhas de tráfego pago
          </p>
        </header>

        {/* Filtro de período */}
        <section style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <div style={{ display: "inline-flex", background: "#161616", border: "1px solid #1f1f1f", borderRadius: 14, padding: 4, gap: 2 }}>
              {(["today", "yesterday", "7days", "month", "custom"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setDateFilter(key)}
                  style={{
                    borderRadius: 10, padding: "6px 12px", fontSize: 12, whiteSpace: "nowrap",
                    fontWeight: dateFilter === key ? 700 : 500,
                    background: dateFilter === key ? "#22c55e" : "transparent",
                    color: dateFilter === key ? "white" : "#6b7280",
                    border: "none", cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {DATE_FILTER_LABELS[key]}
                </button>
              ))}
            </div>

            {dateFilter === "custom" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
                <span style={{ fontSize: 12, color: "#4b5563" }}>até</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
              </div>
            )}
          </div>
        </section>

        {/* Filtro de nomenclatura */}
        <section style={{ marginBottom: 32, borderRadius: 16, border: "1px solid #252525", background: "#161616", padding: 20 }}>
          <p style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: "#9ca3af" }}>
            Filtrar por nomenclatura de campanha
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && applyFilter(inputValue)}
              placeholder="Ex: REGIONAL, UBERLANDIA, CUIABA..."
              style={{ flex: 1, borderRadius: 10, border: "1px solid #333", background: "#0d0d0d", color: "white", padding: "8px 12px", fontSize: 13, outline: "none" }}
            />
            <button
              onClick={() => applyFilter(inputValue)}
              style={{ borderRadius: 10, background: "#22c55e", color: "white", padding: "8px 16px", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}
            >
              Aplicar filtro
            </button>
          </div>

          {/* Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {QUICK_FILTERS.map((qf) => (
              <button
                key={qf.value}
                onClick={() => applyFilter(qf.value || "REGIONAL")}
                style={{
                  borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 500,
                  border: selectedCity === qf.value ? "1px solid #22c55e" : "1px solid #252525",
                  background: selectedCity === qf.value ? "#22c55e" : "#0d0d0d",
                  color: selectedCity === qf.value ? "white" : "#9ca3af",
                  cursor: "pointer",
                }}
              >
                {qf.label}
              </button>
            ))}
          </div>

          {/* Chip filtro ativo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#4b5563" }}>Filtrando:</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 99, background: "#052e16", padding: "3px 10px", fontSize: 12, fontWeight: 600, color: "#22c55e" }}>
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              {activeLabel}
              {!loading && campaigns.length > 0 && selectedCity !== "" && (
                <span style={{ color: "#16a34a" }}>· {campaigns.length} campanha{campaigns.length !== 1 ? "s" : ""}</span>
              )}
            </span>
            {loading && <span className="h-3.5 w-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
          </div>
        </section>

        {/* Erro */}
        {error && (
          <div style={{ marginBottom: 24, borderRadius: 14, border: "1px solid #7f1d1d", background: "#2d0f0f", padding: "10px 14px", fontSize: 13, color: "#f87171" }}>
            Erro ao carregar dados: {error}
          </div>
        )}

        {/* Cards de métricas */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionLabel}>Métricas do período filtrado</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

            {/* Investido */}
            <div style={{ background: "#1f0a0a", border: "1px solid #252525", borderLeft: "3px solid #ef4444", borderRadius: "0 12px 12px 0", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
              <div style={{ position: "absolute", top: 12, right: 12, background: "#1f1f1f", borderRadius: 8, padding: 6, display: "flex", color: "#ef4444" }}>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
              </div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#991b1b", paddingRight: 32 }}>Investido</p>
              <p style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1, color: "#ef4444" }}>
                {loading ? "—" : fmtDec(data?.totalInvested ?? 0)}
              </p>
              <p style={{ fontSize: 10, color: "#4b5563" }}>Tráfego pago</p>
            </div>

            {/* Faturamento */}
            <div style={{ background: "#0f1f0f", border: "1px solid #252525", borderLeft: "3px solid #22c55e", borderRadius: "0 12px 12px 0", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
              <div style={{ position: "absolute", top: 12, right: 12, background: "#1f1f1f", borderRadius: 8, padding: 6, display: "flex", color: "#22c55e" }}>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#15803d", paddingRight: 32 }}>Faturamento</p>
              <p style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1, color: "#22c55e" }}>
                {loading ? "—" : fmtDec(data?.totalRevenue ?? 0)}
              </p>
              <p style={{ fontSize: 10, color: "#4b5563" }}>Receita total</p>
            </div>

            {/* ROAS */}
            <div style={{ ...roasCardStyle, borderLeft: `3px solid ${roasValColor}`, borderRadius: "0 12px 12px 0", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
              <div style={{ position: "absolute", top: 12, right: 12, ...roasIconStyle, borderRadius: 8, padding: 6, display: "flex" }}>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: roasLabelColor, paddingRight: 32 }}>ROAS rastreado</p>
              <p style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1, color: roasValColor }}>{roasDisplay}</p>
              <p style={{ fontSize: 10, color: roasSubColor }}>Retorno sobre o investimento</p>
            </div>

            {/* CPA */}
            <div style={{ background: "#161616", border: "1px solid #252525", borderLeft: "3px solid #374151", borderRadius: "0 12px 12px 0", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
              <div style={{ position: "absolute", top: 12, right: 12, background: "#1f1f1f", borderRadius: 8, padding: 6, display: "flex", color: "#6b7280" }}>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#374151", paddingRight: 32 }}>CPA médio</p>
              <p style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1, color: "#6b7280" }}>
                {loading ? "—" : fmtDec(data?.averageCpa ?? 0)}
              </p>
              <p style={{ fontSize: 10, color: "#4b5563" }}>Por ingresso vendido</p>
            </div>
          </div>
        </section>

        {/* Atribuição */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionLabel}>Atribuição das vendas</h2>
          <div style={{ borderRadius: 16, border: "1px solid #252525", background: "#161616", padding: 20 }}>
            {/* Barra stacked */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", borderRadius: 99, overflow: "hidden", height: 14, gap: 2 }}>
                <div style={{ background: "#22c55e", width: `${attribution?.tracked.percentage ?? 0}%`, transition: "width 0.7s" }} title={`Rastreadas: ${attribution?.tracked.percentage ?? 0}%`} />
                <div style={{ background: "#eab308", width: `${attribution?.buggedUtm.percentage ?? 0}%`, transition: "width 0.7s" }} title={`UTM bugada: ${attribution?.buggedUtm.percentage ?? 0}%`} />
                <div style={{ background: "#374151", width: `${attribution?.unknown.percentage ?? 0}%`, transition: "width 0.7s" }} title={`Desconhecida: ${attribution?.unknown.percentage ?? 0}%`} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#6b7280" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ display: "inline-block", height: 8, width: 8, borderRadius: 99, background: "#22c55e" }} />
                  Rastreadas {attribution?.tracked.percentage ?? 0}%
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ display: "inline-block", height: 8, width: 8, borderRadius: 99, background: "#eab308" }} />
                  UTM bugada {attribution?.buggedUtm.percentage ?? 0}%
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ display: "inline-block", height: 8, width: 8, borderRadius: 99, background: "#374151" }} />
                  Desconhecida {attribution?.unknown.percentage ?? 0}%
                </span>
              </div>
            </div>

            {/* 3 sub-cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Rastreadas */}
              <div style={{ borderRadius: 12, border: "1px solid #166534", background: "#0f1f0f", padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ borderRadius: 8, background: "#052e16", padding: 8 }}>
                    <svg className="h-4 w-4" style={{ color: "#22c55e" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#4ade80" }}>Rastreadas</span>
                </div>
                <p style={{ fontSize: 19, fontWeight: 700, color: "#22c55e", fontVariantNumeric: "tabular-nums" }}>
                  {loading ? "—" : fmtDec(attribution?.tracked.revenue ?? 0)}
                </p>
                <p style={{ fontSize: 12, color: "#15803d", marginTop: 2 }}>
                  {attribution?.tracked.percentage ?? 0}% · {attribution?.tracked.count ?? 0} ingressos
                </p>
                <p style={{ fontSize: 11, color: "#166534", marginTop: 8 }}>UTM completa e atribuída corretamente</p>
              </div>

              {/* UTM bugada */}
              <div style={{ borderRadius: 12, border: "1px solid #92400e", background: "#1f1a0a", padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ borderRadius: 8, background: "#292100", padding: 8 }}>
                    <svg className="h-4 w-4" style={{ color: "#eab308" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24" }}>Tráfego pago UTM bugada</span>
                </div>
                <p style={{ fontSize: 19, fontWeight: 700, color: "#eab308", fontVariantNumeric: "tabular-nums" }}>
                  {loading ? "—" : fmtDec(attribution?.buggedUtm.revenue ?? 0)}
                </p>
                <p style={{ fontSize: 12, color: "#a16207", marginTop: 2 }}>
                  {attribution?.buggedUtm.percentage ?? 0}% · {attribution?.buggedUtm.count ?? 0} ingressos
                </p>
                <p style={{ fontSize: 11, color: "#92400e", marginTop: 8 }}>Clique rastreado porém parâmetros UTM incompletos</p>
              </div>

              {/* Desconhecida */}
              <div style={{ borderRadius: 12, border: "1px solid #252525", background: "#161616", padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ borderRadius: 8, background: "#1f1f1f", padding: 8 }}>
                    <svg className="h-4 w-4" style={{ color: "#6b7280" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af" }}>Origem desconhecida</span>
                </div>
                <p style={{ fontSize: 19, fontWeight: 700, color: "#6b7280", fontVariantNumeric: "tabular-nums" }}>
                  {loading ? "—" : fmtDec(0)}
                </p>
                <p style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>
                  {attribution?.unknown.percentage ?? 0}% · {attribution?.unknown.count ?? 0} ingressos
                </p>
                <p style={{ fontSize: 11, color: "#374151", marginTop: 8 }}>Sem parâmetros UTM — tráfego orgânico ou direto</p>
              </div>
            </div>
          </div>
        </section>

        {/* Tabela detalhada */}
        <section>
          <h2 style={sectionLabel}>Detalhamento por campanha</h2>
          <div style={{ borderRadius: 16, border: "1px solid #252525", background: "#161616", overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: "center", color: "#4b5563" }} className="animate-pulse">
                Carregando dados…
              </div>
            ) : campaigns.length === 0 ? (
              <p style={{ padding: 32, textAlign: "center", color: "#4b5563" }}>
                Nenhuma campanha encontrada para o filtro &ldquo;{activeLabel}&rdquo;.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#111", borderBottom: "1px solid #252525" }}>
                      {["Cidade / Campanha", "Investido", "Faturamento", "ROAS", "CPA", "Atribuição"].map((h, i) => (
                        <th key={h} style={{ padding: "10px 16px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#4b5563", textAlign: i === 0 ? "left" : i === 5 ? "center" : "right" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => {
                      const rowRoasColor = c.invested === 0 ? "#4b5563" : c.roi >= 1 ? "#22c55e" : "#ef4444";
                      const rowRoasText  = c.invested === 0 ? "—" : c.roi >= 1 ? `${c.roi.toFixed(1)}x` : `−${c.roi.toFixed(1)}x`;
                      return (
                        <tr key={c.utm_nomenclatura} style={{ borderBottom: "1px solid #1f1f1f" }}>
                          <td style={{ padding: "10px 16px" }}>
                            <p style={{ fontWeight: 600, color: "white" }}>{c.city} · {c.state}</p>
                            <p style={{ fontSize: 11, color: "#4b5563", fontFamily: "monospace", marginTop: 2 }}>{c.utm_nomenclatura}</p>
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 500, color: "#ef4444", fontVariantNumeric: "tabular-nums" }}>
                            {fmtDec(c.invested)}
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#22c55e", fontVariantNumeric: "tabular-nums" }}>
                            {fmtDec(c.revenue)}
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: rowRoasColor, fontVariantNumeric: "tabular-nums" }}>
                            {rowRoasText}
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "right", color: "#9ca3af", fontVariantNumeric: "tabular-nums" }}>
                            {fmtDec(c.cpa)}
                          </td>
                          <td style={{ padding: "10px 16px" }}>
                            <div style={{ display: "flex", borderRadius: 99, overflow: "hidden", height: 8, minWidth: 80 }}>
                              <div style={{ background: "#22c55e", width: `${c.attribution.tracked}%` }} title={`Rastreado: ${c.attribution.tracked}%`} />
                              <div style={{ background: "#eab308", width: `${c.attribution.buggedUtm}%` }} title={`UTM bugada: ${c.attribution.buggedUtm}%`} />
                              <div style={{ flex: 1, background: "#374151" }} title="Desconhecido" />
                            </div>
                            <p style={{ fontSize: 11, color: "#4b5563", marginTop: 4, textAlign: "center" }}>
                              {c.trackedCount}·{c.buggedCount}·{c.unknownCount}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {campaigns.length > 1 && data && (
                    <tfoot>
                      <tr style={{ borderTop: "2px solid #252525", background: "#111" }}>
                        <td style={{ padding: "10px 16px", fontWeight: 700, color: "white" }}>
                          Total ({campaigns.length} campanhas)
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: "#ef4444", fontVariantNumeric: "tabular-nums" }}>
                          {fmtDec(data.totalInvested)}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: "#22c55e", fontVariantNumeric: "tabular-nums" }}>
                          {fmtDec(data.totalRevenue)}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: data.totalInvested === 0 ? "#4b5563" : data.roi >= 1 ? "#22c55e" : "#ef4444" }}>
                          {data.totalInvested === 0 ? "—" : data.roi >= 1 ? `${data.roi.toFixed(1)}x` : `−${data.roi.toFixed(1)}x`}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: "#9ca3af", fontVariantNumeric: "tabular-nums" }}>
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

        <footer style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #1f1f1f", textAlign: "center", fontSize: 12, color: "#4b5563" }}>
          Circuito Nacional Jurídico Agro 2026 · Análise UTM
        </footer>
      </div>
    </div>
  );
}
