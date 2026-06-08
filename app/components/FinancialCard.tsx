type Props = {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "green" | "gold" | "blue" | "red" | "gray";
  subtitle?: string;
};

const colorMap = {
  green: { border: "#22c55e", text: "#22c55e",  textMuted: "#15803d" },
  gold:  { border: "#eab308", text: "#eab308",  textMuted: "#a16207" },
  blue:  { border: "#3b82f6", text: "#60a5fa",  textMuted: "#1d4ed8" },
  red:   { border: "#ef4444", text: "#ef4444",  textMuted: "#991b1b" },
  gray:  { border: "#374151", text: "#6b7280",  textMuted: "#374151" },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value);
}

export function FinancialCard({ title, value, icon, color, subtitle }: Props) {
  const c = colorMap[color];
  return (
    <div
      className="relative flex flex-col p-3 sm:py-[14px] sm:px-4"
      style={{
        background: "#161616",
        border: "1px solid #252525",
        borderLeft: `3px solid ${c.border}`,
        borderRadius: "0 12px 12px 0",
        gap: 4,
      }}
    >
      {/* Ícone */}
      <div
        className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 flex items-center justify-center"
        style={{
          background: "#1f1f1f",
          borderRadius: 8,
          padding: 5,
          color: c.border,
        }}
      >
        {icon}
      </div>

      {/* Label */}
      <p
        className="text-[8px] sm:text-[9px] pr-7"
        style={{
          fontWeight: 700,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: c.textMuted,
        }}
      >
        {title}
      </p>

      {/* Valor */}
      <p
        className="text-base sm:text-[20px] leading-none"
        style={{
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: c.text,
        }}
      >
        {formatCurrency(value)}
      </p>

      {/* Subtítulo */}
      {subtitle && (
        <p className="text-[9px] sm:text-[10px]" style={{ color: "#4b5563" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
