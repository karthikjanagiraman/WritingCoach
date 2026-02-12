"use client";

import { useEffect, useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

interface SkillRadarChartProps {
  categories: {
    name: string;
    displayName: string;
    avgScore: number;
    skills: {
      name: string;
      displayName: string;
      score: number;
      level: string;
      totalAttempts: number;
    }[];
  }[];
}

export default function SkillRadarChart({ categories }: SkillRadarChartProps) {
  const [primaryColor, setPrimaryColor] = useState("#FF6B6B");

  useEffect(() => {
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-active-primary")
      .trim();
    if (color) setPrimaryColor(color);
  }, []);

  const hasData = categories.some((c) => c.avgScore > 0);

  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-active-primary/10 flex flex-col items-center justify-center min-h-[240px]">
        <span className="text-4xl mb-3">{"📊"}</span>
        <p className="text-sm font-semibold text-active-text/60 text-center">
          Complete a lesson to see your skill chart!
        </p>
      </div>
    );
  }

  // Ensure all 4 writing types appear even if no data yet
  const ALL_TYPES = [
    { name: "narrative", displayName: "Narrative" },
    { name: "persuasive", displayName: "Persuasive" },
    { name: "expository", displayName: "Expository" },
    { name: "descriptive", displayName: "Descriptive" },
  ];

  const chartData = ALL_TYPES.map((type) => {
    const found = categories.find((c) => c.name === type.name);
    return {
      subject: found?.displayName ?? type.displayName,
      score: found?.avgScore ?? 0,
      fullMark: 5,
    };
  });

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-active-primary/10">
      <h3 className="text-sm font-bold text-active-text mb-2">Writing Skills</h3>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 11, fill: "#636e72", fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tickCount={6}
            tick={{ fontSize: 9, fill: "#b2bec3" }}
            axisLine={false}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke={primaryColor}
            fill={primaryColor}
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
