"use client";
import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Cell } from "recharts";

function useThemeColors() {
  const read = () => {
    if (typeof window === "undefined") return { axis: "#8b93a3", grid: "rgba(255,255,255,.06)", accent: "#7f8dff", good: "#5cc98a", warn: "#e3b552", bad: "#f2745d", panel: "#23272f" };
    const cs = getComputedStyle(document.documentElement);
    const g = (n: string, f: string) => (cs.getPropertyValue(n).trim() || f);
    return { axis: g("--muted", "#8b93a3"), grid: g("--divider", "rgba(255,255,255,.06)"), accent: g("--accent", "#7f8dff"), good: g("--good", "#5cc98a"), warn: g("--warn", "#e3b552"), bad: g("--bad", "#f2745d"), panel: g("--bg", "#23272f") };
  };
  const [c, setC] = useState(read);
  useEffect(() => { const h = () => setC(read()); h(); window.addEventListener("themechange", h); return () => window.removeEventListener("themechange", h); }, []);
  return c;
}

export function TrendLine({ data }: { data: { week: string; pct: number | null }[] }) {
  const c = useThemeColors();
  const tip = { background: c.panel, border: "none", borderRadius: 12, fontSize: 12, fontFamily: "var(--font-mono)", boxShadow: "4px 4px 12px var(--nm-dk)", color: c.axis } as any;
  return (
    <ResponsiveContainer width="100%" height={210}>
      <AreaChart data={data} margin={{ top: 8, right: 10, bottom: 4, left: -20 }}>
        <defs><linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.accent} stopOpacity={0.35} /><stop offset="100%" stopColor={c.accent} stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="week" tick={{ fill: c.axis, fontSize: 10, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={{ stroke: c.grid }} />
        <YAxis domain={[0, 100]} tick={{ fill: c.axis, fontSize: 10, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tip} cursor={{ stroke: c.grid }} />
        <Area type="monotone" dataKey="pct" stroke={c.accent} strokeWidth={2.5} fill="url(#gArea)" dot={{ r: 2, fill: c.accent }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarPct({ data, keyName = "label" }: { data: { pct: number | null }[]; keyName?: string }) {
  const c = useThemeColors();
  const color = (p: number | null) => (p == null ? c.axis : p >= 85 ? c.good : p >= 75 ? c.warn : c.bad);
  const tip = { background: c.panel, border: "none", borderRadius: 12, fontSize: 12, fontFamily: "var(--font-mono)", boxShadow: "4px 4px 12px var(--nm-dk)" } as any;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ top: 2, right: 20, bottom: 2, left: 6 }}>
        <CartesianGrid stroke={c.grid} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: c.axis, fontSize: 10, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={{ stroke: c.grid }} />
        <YAxis type="category" dataKey={keyName} width={64} tick={{ fill: c.axis, fontSize: 11, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tip} cursor={{ fill: c.grid }} />
        <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={13}>{data.map((d, i) => <Cell key={i} fill={color(d.pct)} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
