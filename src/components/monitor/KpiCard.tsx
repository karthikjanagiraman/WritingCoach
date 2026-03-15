"use client";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    direction: "up" | "down" | "flat";
    value: string;
  };
  color?: string;
}

export default function KpiCard({
  title,
  value,
  subtitle,
  trend,
  color,
}: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {title}
      </span>
      <div className="flex items-end gap-2">
        <span
          className="text-2xl font-bold"
          style={{ color: color || "#1e293b" }}
        >
          {value}
        </span>
        {trend && <TrendBadge direction={trend.direction} value={trend.value} />}
      </div>
      {subtitle && (
        <span className="text-[11px] text-slate-400">{subtitle}</span>
      )}
    </div>
  );
}

function TrendBadge({
  direction,
  value,
}: {
  direction: "up" | "down" | "flat";
  value: string;
}) {
  const color =
    direction === "up"
      ? "text-emerald-600"
      : direction === "down"
        ? "text-red-500"
        : "text-slate-400";

  const arrow =
    direction === "up" ? "\u2191" : direction === "down" ? "\u2193" : "\u2192";

  return (
    <span className={`text-xs font-semibold ${color} mb-0.5`}>
      {arrow} {value}
    </span>
  );
}
