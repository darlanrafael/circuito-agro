"use client";

import { useEffect, useState } from "react";
import { StateFlagSVG } from "./StateFlagSVG";
import type { AppEvent } from "../types";

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

type BadgeStyle = { label: string; bg: string; color: string; border: string };

function getAutoStatus(occupancy: number): BadgeStyle {
  if (occupancy >= 0.85) return { label: "Quase lotado",      bg: "#1f0a0a", color: "#f87171", border: "#7f1d1d" };
  if (occupancy >= 0.5)  return { label: "Vendendo bem",      bg: "#1f1a0a", color: "#fbbf24", border: "#92400e" };
  if (occupancy >= 0.2)  return { label: "Em andamento",      bg: "#0f1a0f", color: "#86efac", border: "#15803d" };
  return                        { label: "Início das vendas", bg: "#0f1f0f", color: "#4ade80", border: "#166534" };
}

function getBarColor(occupancy: number): string {
  if (occupancy >= 0.85) return "#ef4444";
  if (occupancy >= 0.5)  return "#eab308";
  return "#22c55e";
}

export function EventRow({ event, periodIndividual, periodDouble }: { event: AppEvent; periodIndividual?: number; periodDouble?: number }) {
  const [days, setDays] = useState<number>(0);

  useEffect(() => {
    setDays(getDaysUntil(event.date));
  }, [event.date]);

  // Badge always uses historical totals from event table
  const historicalPeople    = event.individualTickets + event.doubleTickets * 2;
  const historicalOccupancy = historicalPeople / event.capacity;

  // Display/bar uses period data when provided, historical otherwise
  const displayIndividual = periodIndividual ?? event.individualTickets;
  const displayDouble     = periodDouble     ?? event.doubleTickets;
  const totalPeople = displayIndividual + displayDouble * 2;
  const occupancy   = totalPeople / event.capacity;
  const pct         = Math.min(100, Math.round(occupancy * 100));
  const barColor    = getBarColor(occupancy);
  const pctColor    = barColor;

  const badge: BadgeStyle = event.status === "adiado"
    ? { label: "Adiado", bg: "#1f1a0a", color: "#fbbf24", border: "#92400e" }
    : getAutoStatus(historicalOccupancy);

  const dateObj       = new Date(event.date + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const daysLabel = days === 0 ? "Hoje!" : days > 0 ? `em ${days} dias` : `há ${Math.abs(days)} dias`;

  const badgeEl = (
    <span style={{
      background: badge.bg,
      color: badge.color,
      border: `1px solid ${badge.border}`,
      fontSize: 9,
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 6,
      whiteSpace: "nowrap",
    }}>
      {badge.label}
    </span>
  );

  return (
    <div
      className="p-3 md:p-[14px_18px]"
      style={{
        background: "#161616",
        border: "1px solid #252525",
        borderRadius: 12,
        marginBottom: 6,
        transition: "border-color 0.2s",
        cursor: "default",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#333"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#252525"; }}
    >
      {/* ── Desktop layout (md+) ── */}
      <div className="hidden md:flex items-center gap-3.5">
        <div style={{ flexShrink: 0 }}>
          <StateFlagSVG state={event.state} size={32} bandeira_tipo={event.bandeira_tipo} bandeira_url={event.bandeira_url} bandeira_custom={event.bandeira_custom} />
        </div>

        <div style={{ minWidth: 160 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "white", lineHeight: 1.2 }}>{event.city}</p>
          <p style={{ fontSize: 11, color: "#6b7280" }}>{event.state}</p>
        </div>

        <div style={{ minWidth: 90, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#6b7280" }}>{formattedDate}</p>
          <p style={{ fontSize: 10, color: "#4b5563" }}>{daysLabel}</p>
        </div>

        <div style={{ display: "flex", gap: 16, minWidth: 140 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 9, textTransform: "uppercase", color: "#4b5563", letterSpacing: "0.1em" }}>Individual</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>{displayIndividual}</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 9, textTransform: "uppercase", color: "#4b5563", letterSpacing: "0.1em" }}>Duplo</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>{displayDouble}</p>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 130 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: "#4b5563" }}>{totalPeople} / {event.capacity} pessoas</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: pctColor }}>{pct}%</span>
          </div>
          <div style={{ height: 5, background: "#1f1f1f", borderRadius: 3, overflow: "hidden" }}>
            <div className="progress-bar" style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3 }} />
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          <span style={{
            background: badge.bg, color: badge.color,
            border: `1px solid ${badge.border}`,
            fontSize: 10, fontWeight: 600, padding: "3px 10px",
            borderRadius: 6, whiteSpace: "nowrap",
          }}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* ── Mobile layout (< md) ── */}
      <div className="md:hidden">
        {/* Linha 1: bandeira + cidade + badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StateFlagSVG state={event.state} size={28} bandeira_tipo={event.bandeira_tipo} bandeira_url={event.bandeira_url} bandeira_custom={event.bandeira_custom} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "white", lineHeight: 1.2 }}>{event.city}</p>
              <p style={{ fontSize: 11, color: "#6b7280" }}>{event.state}</p>
            </div>
          </div>
          {badgeEl}
        </div>

        {/* Linha 2: data + ingressos */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <p style={{ fontSize: 11, color: "#6b7280" }}>{formattedDate}</p>
            <p style={{ fontSize: 10, color: "#4b5563" }}>{daysLabel}</p>
          </div>
          <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>
            IND: {displayIndividual} · DUP: {displayDouble}
          </p>
        </div>

        {/* Linha 3: barra de capacidade */}
        <div>
          <div style={{ height: 5, background: "#1f1f1f", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
            <div className="progress-bar" style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, color: "#4b5563" }}>{totalPeople} / {event.capacity} pessoas</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: pctColor }}>{pct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
