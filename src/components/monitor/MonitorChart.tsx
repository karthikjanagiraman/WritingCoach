"use client";

interface MonitorChartProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function MonitorChart({
  title,
  subtitle,
  children,
}: MonitorChartProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}
