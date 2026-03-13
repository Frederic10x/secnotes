"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface ChartPoint {
  day: string;
  count: number;
}

export function ActivityChart({ data }: { data: ChartPoint[] }) {
  const ticks = [data[0]?.day, data[14]?.day, data[29]?.day].filter(
    (d): d is string => Boolean(d),
  );

  function formatTick(value: string) {
    const d = new Date(value + "T12:00:00");
    const day = String(d.getDate()).padStart(2, "0");
    const month = d
      .toLocaleString("fr-FR", { month: "short" })
      .toUpperCase()
      .replace(".", "");
    return `${day} ${month}`;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <CartesianGrid
          stroke="#1E2235"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="day"
          ticks={ticks}
          tickFormatter={formatTick}
          tick={{ fontSize: 11, fill: "#64748B" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            backgroundColor: "#141624",
            border: "1px solid #1E2235",
            borderRadius: "6px",
            fontSize: "12px",
          }}
          labelStyle={{ color: "#64748B" }}
          itemStyle={{ color: "#E2E8F0" }}
          formatter={(value) => [value, "Révisions"]}
          labelFormatter={(label) => typeof label === "string" ? formatTick(label) : String(label)}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#6366F1"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#6366F1" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
