type Props = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  suffix?: string;
};

export function IndicatorCard({ title, value, icon, trend, suffix }: Props) {
  const suffixColor =
    trend === "up"   ? "#22c55e"
    : trend === "down" ? "#ef4444"
    : "#4b5563";

  return (
    <div
      className="p-3 sm:p-[14px]"
      style={{
        background: "#161616",
        border: "1px solid #252525",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          background: "#1f1f1f",
          borderRadius: 8,
          padding: 6,
          display: "inline-flex",
          color: "#6b7280",
          marginBottom: 8,
        }}
      >
        {icon}
      </div>
      <p
        className="text-[8px] sm:text-[9px]"
        style={{
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#4b5563",
          marginBottom: 4,
        }}
      >
        {title}
      </p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
        <span
          className="text-[17px] sm:text-[22px] leading-none"
          style={{
            fontWeight: 700,
            color: "white",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
        {suffix && (
          <span
            className="mb-0.5 text-[10px] sm:text-[11px]"
            style={{ fontWeight: 600, color: suffixColor }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
