type Props = {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "green" | "gold" | "blue";
  subtitle?: string;
};

const colorMap = {
  green: {
    bg: "bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950 dark:to-teal-950",
    border: "border-emerald-200 dark:border-white/10",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: "bg-emerald-200 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400",
  },
  gold: {
    bg: "bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950",
    border: "border-amber-200 dark:border-white/10",
    text: "text-amber-700 dark:text-amber-400",
    icon: "bg-amber-200 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400",
  },
  blue: {
    bg: "bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-950",
    border: "border-blue-200 dark:border-white/10",
    text: "text-blue-700 dark:text-blue-400",
    icon: "bg-blue-200 dark:bg-blue-900/60 text-blue-700 dark:text-blue-400",
  },
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
    <div className={`rounded-2xl border p-5 shadow-md min-h-[120px] flex flex-col justify-between ${c.bg} ${c.border}`}>
      <div className="flex items-start justify-between">
        <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${c.text}`}>{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ml-2 ${c.icon}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className={`text-2xl font-bold tabular-nums leading-none mt-2 ${c.text}`}>
          {formatCurrency(value)}
        </p>
        {subtitle && (
          <p className={`text-[11px] opacity-70 mt-1 ${c.text}`}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}
