type Props = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  suffix?: string;
};

export function IndicatorCard({ title, value, icon, trend, suffix }: Props) {
  const suffixColor =
    trend === "up"
      ? "text-green-600 dark:text-green-400"
      : trend === "down"
      ? "text-red-500 dark:text-red-400"
      : "text-gray-400 dark:text-gray-500";

  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="rounded-lg bg-white dark:bg-gray-700 p-2 text-gray-500 dark:text-gray-300 shadow-sm">
          {icon}
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide font-medium">
          {title}
        </p>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-gray-900 dark:text-white font-bold text-2xl tabular-nums">
          {value}
        </span>
        {suffix && (
          <span className={`mb-0.5 text-sm font-medium ${suffixColor}`}>{suffix}</span>
        )}
      </div>
    </div>
  );
}
