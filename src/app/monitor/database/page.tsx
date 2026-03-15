"use client";

import { useEffect, useState, useCallback } from "react";
import { useMonitor } from "@/components/monitor/MonitorShell";
import DataTable, { DataTableColumn } from "@/components/monitor/DataTable";

interface TableRow {
  table: string;
  count: number;
  error?: string;
}

interface TimestampRow {
  table: string;
  latestCreatedAt: string | null;
}

interface DatabaseData {
  connectionStatus: {
    ok: boolean;
    responseTimeMs: number;
    error?: string;
  };
  connectedDatabase: string;
  tableRowCounts: TableRow[];
  recentTimestamps: TimestampRow[];
}

function rowStatus(count: number): { label: string; color: string } {
  if (count < 0) return { label: "Error", color: "text-red-600 bg-red-50" };
  if (count > 100_000) return { label: "Alert", color: "text-red-600 bg-red-50" };
  if (count >= 10_000)
    return { label: "Warning", color: "text-amber-600 bg-amber-50" };
  return { label: "OK", color: "text-emerald-600 bg-emerald-50" };
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

const tableColumns: DataTableColumn<Record<string, unknown>>[] = [
  { key: "table", label: "Table Name" },
  {
    key: "count",
    label: "Row Count",
    align: "right",
    render: (row) => {
      const count = row.count as number;
      if (count < 0) return <span className="text-red-400">--</span>;
      return count.toLocaleString();
    },
  },
  {
    key: "status",
    label: "Status",
    align: "center",
    render: (row) => {
      const count = row.count as number;
      const { label, color } = rowStatus(count);
      return (
        <span
          className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${color}`}
        >
          {label}
        </span>
      );
    },
  },
];

export default function DatabaseHealthPage() {
  const { env, refreshKey } = useMonitor();
  const [data, setData] = useState<DatabaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/monitor/database?env=${env}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, [env]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading database health...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-sm">
        Failed to load database health: {error}
      </div>
    );
  }

  if (!data) return null;

  const totalRows = data.tableRowCounts.reduce(
    (sum, t) => sum + Math.max(t.count, 0),
    0
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-slate-800">Database Health</h2>

      {/* Connection status card */}
      <div
        className={`rounded-xl border p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
          data.connectionStatus.ok
            ? "bg-white border-slate-200"
            : "bg-red-50 border-red-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`inline-block w-3 h-3 rounded-full ${
              data.connectionStatus.ok ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm font-semibold text-slate-800">
            {data.connectionStatus.ok ? "Connected" : "Connection Failed"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
          {data.connectionStatus.ok && (
            <span>
              Response time:{" "}
              <span className="font-semibold text-slate-700">
                {data.connectionStatus.responseTimeMs}ms
              </span>
            </span>
          )}
          <span>
            Database:{" "}
            <code className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              {data.connectedDatabase}
            </code>
          </span>
          {data.connectionStatus.error && (
            <span className="text-red-600">
              Error: {data.connectionStatus.error}
            </span>
          )}
        </div>

        <div className="sm:ml-auto text-xs text-slate-400">
          {data.tableRowCounts.length} tables | {totalRows.toLocaleString()}{" "}
          total rows
        </div>
      </div>

      {/* Recent timestamps */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Recent Activity
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {data.recentTimestamps.map((ts) => (
            <div
              key={ts.table}
              className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-1"
            >
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                {ts.table}
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {ts.latestCreatedAt ? timeAgo(ts.latestCreatedAt) : "No data"}
              </span>
              {ts.latestCreatedAt && (
                <span className="text-[10px] text-slate-400">
                  {new Date(ts.latestCreatedAt).toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Table row counts */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Table Row Counts
        </h3>
        <DataTable
          columns={tableColumns}
          data={
            data.tableRowCounts as unknown as Record<string, unknown>[]
          }
        />
      </div>

      {loading && (
        <div className="text-xs text-slate-400 text-center">Refreshing...</div>
      )}
    </div>
  );
}
