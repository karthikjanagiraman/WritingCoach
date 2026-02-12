"use client";

import { useEffect, useMemo, useState } from "react";
import {
  startOfWeek,
  eachDayOfInterval,
  subDays,
  format,
  getDay,
} from "date-fns";

interface ActivityHeatmapProps {
  data: { date: string; count: number }[];
}

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const [primaryColor, setPrimaryColor] = useState("#FF6B6B");

  useEffect(() => {
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-active-primary")
      .trim();
    if (color) setPrimaryColor(color);
  }, []);

  // Build a map of date string -> count
  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of data) {
      map.set(item.date, item.count);
    }
    return map;
  }, [data]);

  // Generate grid: last ~90 days aligned to week boundaries
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(subDays(today, 89), { weekStartsOn: 0 });
    const allDays = eachDayOfInterval({ start, end: today });

    // Group into weeks (columns)
    const weeksArr: { date: Date; dateStr: string; count: number }[][] = [];
    let currentWeek: { date: Date; dateStr: string; count: number }[] = [];

    for (const day of allDays) {
      const dayOfWeek = getDay(day); // 0 = Sunday
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }
      const dateStr = format(day, "yyyy-MM-dd");
      currentWeek.push({
        date: day,
        dateStr,
        count: countMap.get(dateStr) || 0,
      });
    }
    if (currentWeek.length > 0) {
      weeksArr.push(currentWeek);
    }

    // Build month labels from first day of each week
    const labels: { text: string; colIndex: number }[] = [];
    let lastMonth = "";
    for (let i = 0; i < weeksArr.length; i++) {
      const firstDay = weeksArr[i][0];
      const monthStr = format(firstDay.date, "MMM");
      if (monthStr !== lastMonth) {
        labels.push({ text: monthStr, colIndex: i });
        lastMonth = monthStr;
      }
    }

    return { weeks: weeksArr, monthLabels: labels };
  }, [countMap]);

  // Color function based on count
  function getCellColor(count: number): string {
    if (count === 0) return "#f3f4f6"; // gray-100
    if (count === 1) return `${primaryColor}40`; // 25% opacity
    if (count === 2) return `${primaryColor}80`; // 50% opacity
    return `${primaryColor}cc`; // 80% opacity for 3+
  }

  const CELL_SIZE = 13;
  const CELL_GAP = 3;
  const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-active-primary/10">
      <h3 className="text-sm font-bold text-active-text mb-4">
        Activity (Last 90 Days)
      </h3>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1">
          {/* Month labels */}
          <div className="flex ml-8" style={{ gap: `${CELL_GAP}px` }}>
            {weeks.map((_, colIdx) => {
              const label = monthLabels.find((l) => l.colIndex === colIdx);
              return (
                <div
                  key={`month-${colIdx}`}
                  style={{ width: CELL_SIZE, minWidth: CELL_SIZE }}
                  className="text-center"
                >
                  {label && (
                    <span className="text-[9px] font-semibold text-active-text/40">
                      {label.text}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grid rows (7 days) */}
          <div className="flex gap-0">
            {/* Day-of-week labels */}
            <div
              className="flex flex-col justify-between pr-1"
              style={{ gap: `${CELL_GAP}px` }}
            >
              {DAY_LABELS.map((label, i) => (
                <div
                  key={`day-${i}`}
                  className="flex items-center justify-end"
                  style={{ height: CELL_SIZE }}
                >
                  <span className="text-[9px] font-semibold text-active-text/40 w-6 text-right">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Week columns */}
            <div className="flex" style={{ gap: `${CELL_GAP}px` }}>
              {weeks.map((week, colIdx) => (
                <div
                  key={`week-${colIdx}`}
                  className="flex flex-col"
                  style={{ gap: `${CELL_GAP}px` }}
                >
                  {Array.from({ length: 7 }, (_, rowIdx) => {
                    const day = week.find(
                      (d) => getDay(d.date) === rowIdx
                    );
                    if (!day) {
                      return (
                        <div
                          key={`empty-${colIdx}-${rowIdx}`}
                          style={{
                            width: CELL_SIZE,
                            height: CELL_SIZE,
                          }}
                        />
                      );
                    }
                    return (
                      <div
                        key={day.dateStr}
                        style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          backgroundColor: getCellColor(day.count),
                          borderRadius: 3,
                        }}
                        title={`${format(day.date, "MMM d, yyyy")}: ${day.count} ${day.count === 1 ? "activity" : "activities"}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-2 ml-8">
            <span className="text-[9px] text-active-text/40 font-semibold">
              Less
            </span>
            {[0, 1, 2, 3].map((level) => (
              <div
                key={`legend-${level}`}
                style={{
                  width: CELL_SIZE - 2,
                  height: CELL_SIZE - 2,
                  backgroundColor: getCellColor(level),
                  borderRadius: 2,
                }}
              />
            ))}
            <span className="text-[9px] text-active-text/40 font-semibold">
              More
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
