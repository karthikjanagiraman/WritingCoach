"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMonitor } from "@/components/monitor/MonitorShell";
import KpiCard from "@/components/monitor/KpiCard";
import MonitorChart from "@/components/monitor/MonitorChart";

interface OverviewData {
  kpis: {
    totalUsers: number;
    totalChildren: number;
    activeChildren7d: number;
    lessonsCompletedToday: number;
    lessonsCompletedThisWeek: number;
    lessonsCompletedThisMonth: number;
    avgScore30d: number;
    aiCallsToday: number;
    avgLatency24h: number;
    tokensToday: number;
    aiErrorRate24h: number;
  };
  timeSeries: {
    lessonsPerDay: { date: string; value: number }[];
    activeChildrenPerDay: { date: string; value: number }[];
  };
}

export default function MonitorOverviewPage() {
  const { env, refreshKey } = useMonitor();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/monitor/overview?env=${env}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [env, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-slate-800">Overview</h2>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-5 h-24 animate-pulse"
            >
              <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
              <div className="h-6 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-5 h-72 animate-pulse"
            >
              <div className="h-3 w-32 bg-slate-200 rounded mb-4" />
              <div className="h-48 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-slate-800">Overview</h2>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-sm text-red-700">
          Failed to load overview data: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, timeSeries } = data;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-800">Overview</h2>

      {/* Top row: 4 large KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title="Total Users"
          value={kpis.totalUsers.toLocaleString()}
          subtitle={`${kpis.totalChildren} children`}
          color="#6C5CE7"
        />
        <KpiCard
          title="Active Children (7d)"
          value={kpis.activeChildren7d.toLocaleString()}
          subtitle="Unique children with lesson activity"
          color="#00B894"
        />
        <KpiCard
          title="Lessons Today"
          value={kpis.lessonsCompletedToday.toLocaleString()}
          subtitle="Completed lessons"
          color="#0984E3"
        />
        <KpiCard
          title="AI Calls Today"
          value={kpis.aiCallsToday.toLocaleString()}
          subtitle="LLM interactions"
          color="#E17055"
        />
      </div>

      {/* Middle row: 4 medium KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title="Avg Score (30d)"
          value={kpis.avgScore30d > 0 ? kpis.avgScore30d.toFixed(1) : "--"}
          subtitle="Assessment average"
        />
        <KpiCard
          title="Lessons This Week"
          value={kpis.lessonsCompletedThisWeek.toLocaleString()}
        />
        <KpiCard
          title="Lessons This Month"
          value={kpis.lessonsCompletedThisMonth.toLocaleString()}
        />
        <KpiCard
          title="Tokens Today"
          value={formatTokens(kpis.tokensToday)}
          subtitle={
            kpis.avgLatency24h > 0 ? `Avg latency: ${kpis.avgLatency24h}ms` : undefined
          }
        />
      </div>

      {/* Bottom: 2-column chart grid */}
      <div className="grid grid-cols-2 gap-4">
        <MonitorChart
          title="Lessons Completed / Day"
          subtitle="Last 30 days"
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={timeSeries.lessonsPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={fmtDate}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                allowDecimals={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                }}
                labelFormatter={fmtDateFull}
              />
              <Line
                type="monotone"
                dataKey="value"
                name="Lessons"
                stroke="#6C5CE7"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </MonitorChart>

        <MonitorChart
          title="Daily Active Children"
          subtitle="Last 30 days"
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={timeSeries.activeChildrenPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={fmtDate}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                allowDecimals={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                }}
                labelFormatter={fmtDateFull}
              />
              <Line
                type="monotone"
                dataKey="value"
                name="Children"
                stroke="#00B894"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </MonitorChart>
      </div>
    </div>
  );
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fmtDateFull(label: unknown) {
  const dateStr = String(label ?? "");
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
