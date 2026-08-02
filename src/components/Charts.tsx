"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Cell } from "recharts";

const AX = "#8b949e";

export function TrendLine({ data }: { data: { week: string; pct: number | null }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
        <CartesianGrid stroke="#232a34" strokeDasharray="3 3" />
        <XAxis dataKey="week" tick={{ fill: AX, fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fill: AX, fontSize: 11 }} />
        <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #232a34", borderRadius: 8 }} />
        <Line type="monotone" dataKey="pct" stroke="#4f8cff" strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarPct({ data, keyName = "label" }: { data: { pct: number | null }[]; keyName?: string }) {
  const color = (p: number | null) => (p == null ? "#555" : p >= 85 ? "#2ecc71" : p >= 75 ? "#f1c40f" : "#e74c3c");
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 26)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid stroke="#232a34" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: AX, fontSize: 11 }} />
        <YAxis type="category" dataKey={keyName} width={150} tick={{ fill: AX, fontSize: 11 }} />
        <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #232a34", borderRadius: 8 }} />
        <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => <Cell key={i} fill={color(d.pct)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
