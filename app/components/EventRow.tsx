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

function getAutoStatus(occupancy: number) {
  if (occupancy >= 0.85) return { label: "Quase lotado", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" };
  if (occupancy >= 0.5)  return { label: "Vendendo bem", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" };
  if (occupancy >= 0.2)  return { label: "Em andamento", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" };
  return { label: "Início das vendas", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" };
}

function getBarFillColor(occupancy: number): string {
  if (occupancy >= 0.85) return "bg-red-500";
  if (occupancy >= 0.5)  return "bg-orange-500";
  return "bg-green-500";
}

function getPctTextClass(occupancy: number): string {
  if (occupancy >= 0.85) return "text-red-500 dark:text-red-400 text-xs font-semibold";
  if (occupancy >= 0.5)  return "text-orange-500 dark:text-orange-400 text-xs font-semibold";
  return "text-green-600 dark:text-green-400 text-xs font-semibold";
}

export function EventRow({ event }: { event: AppEvent }) {
  const [days, setDays] = useState<number>(0);

  useEffect(() => {
    setDays(getDaysUntil(event.date));
  }, [event.date]);

  const totalPeople = event.individualTickets + event.doubleTickets * 2;
  const occupancy = totalPeople / event.capacity;
  const pct = Math.min(100, Math.round(occupancy * 100));
  const barFill = getBarFillColor(occupancy);
  const pctClass = getPctTextClass(occupancy);

  // Badge: adiado sobrepõe o automático
  const badge = event.status === "adiado"
    ? { label: "Adiado", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" }
    : getAutoStatus(occupancy);

  const dateObj = new Date(event.date + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-3 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">

        {/* Bandeira + Cidade */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <StateFlagSVG
            state={event.state}
            size={32}
            bandeira_tipo={event.bandeira_tipo}
            bandeira_url={event.bandeira_url}
            bandeira_custom={event.bandeira_custom}
          />
          <div>
            <p className="text-gray-900 dark:text-white font-semibold text-base leading-tight">
              {event.city}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{event.state}</p>
          </div>
        </div>

        {/* Data + Countdown */}
        <div className="min-w-[130px]">
          <p className="text-gray-700 dark:text-gray-300 text-sm">{formattedDate}</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs">
            {days === 0 ? "Hoje!" : days > 0 ? `em ${days} dias` : `há ${Math.abs(days)} dias`}
          </p>
        </div>

        {/* Ingressos */}
        <div className="flex gap-4 min-w-[160px]">
          <div className="text-center">
            <p className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wide">Individual</p>
            <p className="text-gray-900 dark:text-white font-bold text-xl tabular-nums">{event.individualTickets}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wide">Duplo</p>
            <p className="text-gray-900 dark:text-white font-bold text-xl tabular-nums">{event.doubleTickets}</p>
          </div>
        </div>

        {/* Barra de capacidade */}
        <div className="flex-1 min-w-[140px]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-500 dark:text-gray-400 text-xs">{totalPeople} / {event.capacity} pessoas</span>
            <span className={pctClass}>{pct}%</span>
          </div>
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div className={`h-2 rounded-full progress-bar ${barFill}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Badge de status */}
        <div className="flex items-center">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${badge.color}`}>
            {badge.label}
          </span>
        </div>
      </div>
    </div>
  );
}
