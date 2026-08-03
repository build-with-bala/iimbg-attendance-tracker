"use client";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Cell } from "recharts";

const AX = "#5f6879";
const GRID = "#1f2531";
const ACCENT = "#7c8cff";
const tip = { background: "#12151d", border: "1px solid #242b39", borderRadius: 10, fontSize: 12, fontFamily: "var(--font-mono)" };

export function TrendLine({ data }: { data: { week: string; pct: number | null }[] }) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <AreaChart data={data} margin={{ top: 8, right: 10, bottom: 4, left: -20 }}>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="week" tick={{ fill: AX, fontSize: 10, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis domain={[0, 100]} tick={{ fill: AX, fontSize: 10, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tip} cursor={{ stroke: GRID }} />
        <Area type="monotone" dataKey="pct" stroke={ACCENT} strokeWidth={2} fill="url(#g)" dot={{ r: 2, fill: ACCENT }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarPct({ data, keyName = "label" }: { data: { pct: number | null }[]; keyName?: string }) {
  const color = (p: number | null) => (p == null ? "#3a4150" : p >= 85 ? "#4bc46e" : p >= 75 ? "#e3ac35" : "#f26144");
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ top: 2, right: 20, bottom: 2, left: 6 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: AX, fontSize: 10, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis type="category" dataKey={keyName} width={64} tick={{ fill: AX, fontSize: 11, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tip} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="pct" radius={[0, 5, 5, 0]} barSize={13}>
          {data.map((d, i) => <Cell key={i} fill={color(d.pct)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
