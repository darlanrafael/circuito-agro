import { StateFlagSVG } from "./StateFlagSVG";
import type { AppEvent } from "../types";

function fmtBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value);
}

export function EventRealizadoRow({ event }: { event: AppEvent }) {
  const pct = Math.min(100, Math.round((event.participantes_final / event.capacity) * 100));
  const roas = event.trafficInvestment > 0 ? event.faturamento_bruto / event.trafficInvestment : 0;
  const hasData = event.participantes_final > 0 || event.faturamento_bruto > 0;

  const dateObj       = new Date(event.date + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const isCancelled   = event.status === "cancelado";

  const badge = isCancelled
    ? { label: "Cancelado", bg: "#1f0a0a", color: "#9ca3af", border: "#374151" }
    : { label: "Realizado", bg: "#0a0a1f", color: "#818cf8", border: "#3730a3" };

  const roasColor = !hasData ? "#4b5563"
    : roas >= 1   ? "#22c55e"
    : roas >= 1.5 ? "#eab308"
    : "#ef4444";
  const roasText = !hasData ? "—"
    : roas >= 1 ? `${roas.toFixed(1)}x`
    : `−${roas.toFixed(1)}x`;

  return (
    <div style={{
      background: "#161616",
      border: "1px solid #252525",
      borderRadius: 14,
      padding: "14px 18px",
      marginBottom: 6,
    }}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">

        {/* Bandeira + Cidade */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 190 }}>
          <StateFlagSVG
            state={event.state}
            size={28}
            bandeira_tipo={event.bandeira_tipo}
            bandeira_url={event.bandeira_url}
            bandeira_custom={event.bandeira_custom}
          />
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "white", lineHeight: 1.2 }}>{event.city}</p>
            <p style={{ fontSize: 11, color: "#6b7280" }}>{event.state} · {formattedDate}</p>
          </div>
        </div>

        {/* Badge */}
        <div style={{ flexShrink: 0 }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: badge.bg,
            color: badge.color,
            border: `1px solid ${badge.border}`,
            fontSize: 10,
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: 6,
          }}>
            {!isCancelled && (
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {badge.label}
          </span>
        </div>

        {/* Participantes */}
        <div style={{ flexShrink: 0 }}>
          <p style={{ fontSize: 9, textTransform: "uppercase", color: "#4b5563", letterSpacing: "0.1em" }}>Participantes</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>
            {hasData ? event.participantes_final.toLocaleString("pt-BR") : "—"}
          </p>
        </div>

        {/* Métricas */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 9, textTransform: "uppercase", color: "#4b5563", letterSpacing: "0.1em" }}>Faturamento</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#22c55e", fontVariantNumeric: "tabular-nums" }}>
              {hasData ? fmtBRL(event.faturamento_bruto) : "—"}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 9, textTransform: "uppercase", color: "#4b5563", letterSpacing: "0.1em" }}>Investimento</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#eab308", fontVariantNumeric: "tabular-nums" }}>
              {fmtBRL(event.trafficInvestment)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 9, textTransform: "uppercase", color: "#4b5563", letterSpacing: "0.1em" }}>ROAS</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: roasColor, fontVariantNumeric: "tabular-nums" }}>
              {roasText}
            </p>
          </div>
        </div>

        {/* Barra de ocupação */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: "#4b5563" }}>{event.participantes_final} / {event.capacity}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280" }}>{pct}%</span>
          </div>
          <div style={{ height: 4, background: "#1f1f1f", borderRadius: 2, overflow: "hidden" }}>
            <div
              className="progress-bar"
              style={{ height: "100%", width: `${pct}%`, background: isCancelled ? "#374151" : "#22c55e", borderRadius: 2 }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
