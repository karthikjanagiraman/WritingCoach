"use client";

import { useState, useMemo } from "react";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  maxRows?: number;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  maxRows,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortAsc ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      return sortAsc ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [data, sortKey, sortAsc]);

  const displayed = maxRows ? sorted.slice(0, maxRows) : sorted;

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  return (
    <div
      className={`overflow-auto rounded-lg border border-slate-200 ${
        maxRows && sorted.length > maxRows ? "max-h-[400px]" : ""
      }`}
    >
      <table className="w-full text-sm">
        <thead className="bg-slate-50 sticky top-0">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-800 transition-colors ${
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                      ? "text-center"
                      : "text-left"
                }`}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1">{sortAsc ? "\u25B2" : "\u25BC"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayed.map((row, idx) => (
            <tr
              key={idx}
              className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-2 text-slate-700 ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left"
                  }`}
                >
                  {col.render
                    ? col.render(row)
                    : (row[col.key] as React.ReactNode) ?? "-"}
                </td>
              ))}
            </tr>
          ))}
          {displayed.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-slate-400 text-xs"
              >
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
