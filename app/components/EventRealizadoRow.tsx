import { StateFlagSVG } from "./StateFlagSVG";
import type { AppEvent } from "../types";

function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export function EventRealizadoRow({ event }: { event: AppEvent }) {
  const pct = Math.min(100, Math.round((event.participantes_final / event.capacity) * 100));
  const roi = event.trafficInvestment > 0 ? event.faturamento_bruto / event.trafficInvestment : 0;
  const hasData = event.participantes_final > 0 || event.faturamento_bruto > 0;

  const dateObj = new Date(event.date + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const isCancelled = event.status === "cancelado";

  const badge = isCancelled
    ? { label: "Cancelado", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" }
    : { label: "Realizado", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">

        {/* Bandeira + Cidade */}
        <div className="flex items-center gap-3 min-w-[190px]">
          <StateFlagSVG
            state={event.state}
            size={28}
            bandeira_tipo={event.bandeira_tipo}
            bandeira_url={event.bandeira_url}
            bandeira_custom={event.bandeira_custom}
          />
          <div>
            <p className="text-gray-900 dark:text-white font-semibold text-sm leading-tight">{event.city}</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs">{event.state} · {formattedDate}</p>
          </div>
        </div>

        {/* Badge */}
        <div className="flex-shrink-0">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${badge.color}`}>
            {!isCancelled && (
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {badge.label}
          </span>
        </div>

        {/* Participantes */}
        <div className="flex-shrink-0 text-center sm:text-left">
          <p className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wide">Participantes</p>
          <p className="text-gray-900 dark:text-white font-bold text-lg tabular-nums">
            {hasData ? event.participantes_final.toLocaleString("pt-BR") : "—"}
          </p>
        </div>

        {/* Métricas */}
        <div className="flex gap-4 flex-wrap">
          <div>
            <p className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wide">Faturamento</p>
            <p className="text-gray-900 dark:text-white font-semibold text-sm tabular-nums">{hasData ? fmt(event.faturamento_bruto) : "—"}</p>
          </div>
          <div>
            <p className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wide">Investimento</p>
            <p className="text-gray-900 dark:text-white font-semibold text-sm tabular-nums">{fmt(event.trafficInvestment)}</p>
          </div>
          <div>
            <p className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wide">ROI</p>
            <p className={`font-bold text-sm tabular-nums ${
              !hasData ? "text-gray-400 dark:text-gray-500"
              : roi >= 3 ? "text-green-600 dark:text-green-400"
              : roi >= 1.5 ? "text-amber-500 dark:text-amber-400"
              : "text-red-500 dark:text-red-400"
            }`}>
              {hasData ? `${roi.toFixed(1)}x` : "—"}
            </p>
          </div>
        </div>

        {/* Barra de ocupação final */}
        <div className="flex-1 min-w-[120px]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-500 dark:text-gray-400 text-xs">{event.participantes_final} / {event.capacity}</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs font-semibold">{pct}%</span>
          </div>
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div className={`h-1.5 rounded-full progress-bar ${isCancelled ? "bg-red-400" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

      </div>
    </div>
  );
}
