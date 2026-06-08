type Props = {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "green" | "gold" | "blue";
  subtitle?: string;
};

const colorMap = {
  green: {
    bg: "bg-emerald-50 dark:bg-emerald-950",
    border: "border-emerald-200 dark:border-emerald-800/50",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400",
  },
  gold: {
    bg: "bg-amber-50 dark:bg-amber-950",
    border: "border-amber-200 dark:border-amber-800/50",
    text: "text-amber-700 dark:text-amber-400",
    icon: "bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-200 dark:border-blue-800/50",
    text: "text-blue-700 dark:text-blue-400",
    icon: "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400",
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
    <div className={`rounded-2xl border p-3 shadow-sm flex flex-col justify-between ${c.bg} ${c.border}`}>
      <div className="flex items-start justify-between">
        <p className={`text-[9px] font-bold uppercase tracking-widest leading-tight ${c.text}`}>{title}</p>
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ml-2 ${c.icon}`}>
          {icon}
        </div>
      </div>
      <div className="mt-2">
        <p className={`text-lg font-bold tabular-nums leading-none ${c.text}`}>
          {formatCurrency(value)}
        </p>
        {subtitle && (
          <p className={`text-[10px] opacity-70 mt-0.5 ${c.text}`}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}
