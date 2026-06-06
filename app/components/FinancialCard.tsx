type Props = {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "green" | "gold" | "blue";
  subtitle?: string;
};

const colorMap = {
  green: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400",
    value: "text-emerald-800 dark:text-emerald-400",
    title: "text-emerald-900 dark:text-emerald-300",
    subtitle: "text-emerald-700/70 dark:text-emerald-500",
  },
  gold: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    icon: "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400",
    value: "text-amber-900 dark:text-amber-400",
    title: "text-amber-900 dark:text-amber-300",
    subtitle: "text-amber-700/70 dark:text-amber-500",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
    icon: "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-400",
    value: "text-blue-900 dark:text-blue-400",
    title: "text-blue-900 dark:text-blue-300",
    subtitle: "text-blue-700/70 dark:text-blue-500",
  },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function FinancialCard({ title, value, icon, color, subtitle }: Props) {
  const c = colorMap[color];
  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${c.bg} ${c.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider ${c.title}`}>{title}</p>
          <p className={`mt-2 text-3xl font-bold tabular-nums ${c.value}`}>
            {formatCurrency(value)}
          </p>
          {subtitle && (
            <p className={`mt-1 text-xs ${c.subtitle}`}>{subtitle}</p>
          )}
        </div>
        <div className={`rounded-xl p-3 ${c.icon}`}>{icon}</div>
      </div>
    </div>
  );
}
