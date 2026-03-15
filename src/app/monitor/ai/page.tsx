"use client";

import { useEffect, useState, useCallback } from "react";
import { useMonitor } from "@/components/monitor/MonitorShell";
import KpiCard from "@/components/monitor/KpiCard";
import MonitorChart from "@/components/monitor/MonitorChart";
import DataTable, { type DataTableColumn } from "@/components/monitor/DataTable";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type Period = "24h" | "7d" | "30d";

interface AiData {
  kpis: {
    totalCalls: number;
    tokensToday: number;
    estimatedCost: number;
    errorRate: number;
    avgLatency: number;
    p50: number;
    p95: number;
    cacheHitRate: number;
  };
  callsOverTime: { label: string; count: number }[];
  callsByRequestType: { requestType: string; count: number }[];
  callsByProvider: { provider: string; count: number }[];
  tokenUsage: {
    date: string;
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  }[];
  latencyDistribution: { label: string; count: number }[];
  errorRate: {
    date: string;
    rate: number;
    total: number;
    errors: number;
  }[];
  recentErrors: {
    id: string;
    requestType: string;
    model: string;
    error: string;
    latencyMs: number;
    createdAt: string;
  }[];
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

const REQUEST_TYPE_COLORS: Record<string, string> = {
  lesson_start: "#6C5CE7",
  lesson_message: "#0984E3",
  assessment_eval: "#00B894",
  placement_start: "#FDCB6E",
  placement_analysis: "#E17055",
  curriculum_generate: "#FF6B6B",
  curriculum_revise: "#A29BFE",
  report_summary: "#55EFC4",
};

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "#D4A574",
  google: "#4285F4",
  deepinfra: "#FF6B6B",
  groq: "#F97316",
  novita: "#8B5CF6",
};

export default function AiMonitorPage() {
  const { env, refreshKey } = useMonitor();
  const [period, setPeriod] = useState<Period>("24h");
  const [data, setData] = useState<AiData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/monitor/ai?env=${env}&period=${period}`
      );
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [env, period, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      {/* Header + Period Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          AI & Performance
        </h2>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === opt.value
                  ? "bg-slate-800 text-white"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-5 h-24 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard
            title="Total Calls"
            value={formatNumber(kpis?.totalCalls ?? 0)}
            subtitle={`Period: ${period}`}
          />
          <KpiCard
            title="Tokens Today"
            value={formatTokens(kpis?.tokensToday ?? 0)}
            subtitle="Input + Output"
          />
          <KpiCard
            title="Est. Cost"
            value={`$${(kpis?.estimatedCost ?? 0).toFixed(2)}`}
            subtitle={`Period: ${period}`}
            color="#E17055"
          />
          <KpiCard
            title="Error Rate"
            value={`${kpis?.errorRate ?? 0}%`}
            subtitle={`${period} period`}
            color={
              (kpis?.errorRate ?? 0) > 5
                ? "#e74c3c"
                : (kpis?.errorRate ?? 0) > 1
                  ? "#f39c12"
                  : "#27ae60"
            }
          />
          <KpiCard
            title="Avg Latency"
            value={`${formatMs(kpis?.avgLatency ?? 0)}`}
            subtitle={`p50: ${formatMs(kpis?.p50 ?? 0)} / p95: ${formatMs(kpis?.p95 ?? 0)}`}
          />
          <KpiCard
            title="Cache Hit Rate"
            value={`${kpis?.cacheHitRate ?? 0}%`}
            subtitle="Anthropic prompt cache"
            color="#6C5CE7"
          />
        </div>
      )}

      {/* Charts Row 1: Calls Over Time + Token Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonitorChart
          title="API Calls Over Time"
          subtitle={period === "24h" ? "Grouped by hour" : "Grouped by day"}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.callsOverTime ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6C5CE7"
                  fill="#6C5CE7"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  name="Calls"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </MonitorChart>

        <MonitorChart title="Token Usage" subtitle="Stacked by token type">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.tokenUsage ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  tickLine={false}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  tickLine={false}
                  tickFormatter={formatTokensShort}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                  formatter={(value) => formatTokens(Number(value ?? 0))}
                />
                <Area
                  type="monotone"
                  dataKey="input"
                  stackId="1"
                  stroke="#0984E3"
                  fill="#0984E3"
                  fillOpacity={0.6}
                  name="Input"
                />
                <Area
                  type="monotone"
                  dataKey="output"
                  stackId="1"
                  stroke="#E17055"
                  fill="#E17055"
                  fillOpacity={0.6}
                  name="Output"
                />
                <Area
                  type="monotone"
                  dataKey="cacheRead"
                  stackId="1"
                  stroke="#00B894"
                  fill="#00B894"
                  fillOpacity={0.6}
                  name="Cache Read"
                />
                <Area
                  type="monotone"
                  dataKey="cacheWrite"
                  stackId="1"
                  stroke="#FDCB6E"
                  fill="#FDCB6E"
                  fillOpacity={0.6}
                  name="Cache Write"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </MonitorChart>
      </div>

      {/* Charts Row 2: Calls by Request Type + Latency Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonitorChart
          title="Calls by Request Type"
          subtitle={`${period} period`}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.callsByRequestType ?? []}
                layout="vertical"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  dataKey="requestType"
                  type="category"
                  tick={{ fontSize: 10 }}
                  stroke="#94a3b8"
                  tickLine={false}
                  width={120}
                  tickFormatter={formatRequestType}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                  formatter={(value) => [Number(value ?? 0), "Calls"]}
                  labelFormatter={(label) => formatRequestType(String(label))}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                  fill="#6C5CE7"
                  name="Calls"
                  // Apply per-bar color
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  shape={(props: any) => {
                    const fill =
                      REQUEST_TYPE_COLORS[props.requestType as string] ??
                      "#6C5CE7";
                    return (
                      <rect
                        x={props.x}
                        y={props.y}
                        width={props.width}
                        height={props.height}
                        rx={4}
                        fill={fill}
                      />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </MonitorChart>

        <MonitorChart title="Latency Distribution" subtitle="Response times">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.latencyDistribution ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#0984E3"
                  radius={[4, 4, 0, 0]}
                  name="Calls"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </MonitorChart>
      </div>

      {/* Charts Row 3: Error Rate + Calls by Provider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonitorChart title="Error Rate Over Time" subtitle="Percentage of failed calls">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.errorRate ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  tickLine={false}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  tickLine={false}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                  formatter={(value, name) => {
                    if (name === "rate") return [`${value ?? 0}%`, "Error Rate"];
                    return [value ?? 0, String(name)];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#e74c3c"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#e74c3c" }}
                  name="rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </MonitorChart>

        <MonitorChart
          title="Calls by Provider"
          subtitle={`${period} period`}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.callsByProvider ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="provider"
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  tickLine={false}
                  tickFormatter={capitalize}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  name="Calls"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  shape={(props: any) => {
                    const fill =
                      PROVIDER_COLORS[props.provider as string] ?? "#94a3b8";
                    return (
                      <rect
                        x={props.x}
                        y={props.y}
                        width={props.width}
                        height={props.height}
                        rx={4}
                        fill={fill}
                      />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </MonitorChart>
      </div>

      {/* Recent Errors Table */}
      <MonitorChart
        title="Recent Errors"
        subtitle="Last 20 failed LLM interactions"
      >
        <DataTable
          columns={errorColumns}
          data={(data?.recentErrors ?? []) as unknown as Record<string, unknown>[]}
          maxRows={20}
        />
      </MonitorChart>
    </div>
  );
}

// --- Column definitions ---

const errorColumns: DataTableColumn<Record<string, unknown>>[] = [
  {
    key: "createdAt",
    label: "Time",
    render: (row) => {
      const d = new Date(row.createdAt as string);
      return (
        <span className="text-xs font-mono text-slate-500">
          {d.toLocaleDateString()} {d.toLocaleTimeString()}
        </span>
      );
    },
  },
  {
    key: "requestType",
    label: "Type",
    render: (row) => (
      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
        {formatRequestType(row.requestType as string)}
      </span>
    ),
  },
  { key: "model", label: "Model" },
  {
    key: "latencyMs",
    label: "Latency",
    align: "right",
    render: (row) => (
      <span className="font-mono text-xs">
        {formatMs(row.latencyMs as number)}
      </span>
    ),
  },
  {
    key: "error",
    label: "Error",
    render: (row) => (
      <span className="text-xs text-red-600 max-w-xs truncate block">
        {row.error as string}
      </span>
    ),
  },
];

// --- Formatters ---

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatTokensShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function formatRequestType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
