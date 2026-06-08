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
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function FinancialCard({ title, value, icon, color, subtitle }: Props) {
  const c = colorMap[color];
  return (
    <div
      style={{
        background: "#161616",
        border: "1px solid #252525",
        borderLeft: `3px solid ${c.border}`,
        borderRadius: "0 12px 12px 0",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        position: "relative",
      }}
    >
      {/* Ícone */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: "#1f1f1f",
          borderRadius: 8,
          padding: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: c.border,
        }}
      >
        {icon}
      </div>

      {/* Label */}
      <p style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: c.textMuted,
        paddingRight: 32,
      }}>
        {title}
      </p>

      {/* Valor */}
      <p style={{
        fontSize: 20,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1,
        color: c.text,
      }}>
        {formatCurrency(value)}
      </p>

      {/* Subtítulo */}
      {subtitle && (
        <p style={{ fontSize: 10, color: "#4b5563" }}>{subtitle}</p>
      )}
    </div>
  );
}
