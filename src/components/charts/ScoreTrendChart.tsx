"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ScoreTrendChartProps {
  data: { type: string; avgScore: number; count: number }[];
}

const TYPE_COLORS: Record<string, string> = {
  narrative: "#FF6B6B",
  persuasive: "#6C5CE7",
  expository: "#00B894",
  descriptive: "#FDCB6E",
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ScoreTrendChart({ data }: ScoreTrendChartProps) {
  const [primaryColor, setPrimaryColor] = useState("#FF6B6B");

  useEffect(() => {
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-active-primary")
      .trim();
    if (color) setPrimaryColor(color);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-active-primary/10 flex flex-col items-center justify-center min-h-[240px]">
        <span className="text-4xl mb-3">{"📊"}</span>
        <p className="text-sm font-semibold text-active-text/60 text-center">
          Complete an assessment to see score trends!
        </p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: capitalize(d.type),
    subtitle: `${d.count} ${d.count === 1 ? "lesson" : "lessons"}`,
  }));

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-active-primary/10">
      <h3 className="text-sm font-bold text-active-text mb-4">
        Scores by Writing Type
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 10, left: -10, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#636e72", fontWeight: 600 }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            domain={[0, 4]}
            ticks={[0, 1, 2, 3, 4]}
            tick={{ fontSize: 10, fill: "#b2bec3" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => [Number(value).toFixed(1), "Avg Score"]}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              fontSize: 12,
              fontWeight: 600,
            }}
          />
          <Bar dataKey="avgScore" radius={[6, 6, 0, 0]} barSize={48}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={TYPE_COLORS[entry.type] || primaryColor}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Subtitle row showing lesson counts */}
      <div className="flex justify-around mt-1 px-4">
        {chartData.map((d) => (
          <span
            key={d.type}
            className="text-[10px] text-active-text/40 font-semibold"
          >
            {d.subtitle}
          </span>
        ))}
      </div>
    </div>
  );
}
