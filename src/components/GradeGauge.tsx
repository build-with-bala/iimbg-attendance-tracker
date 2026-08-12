"use client";
import { useEffect, useState } from "react";

// Horizontal grade-risk gauge: F | −2 | −1 | Safe, with a needle at your %.
const ZONES = [
  { to: 50, color: "var(--bad)", label: "F" },
  { to: 60, color: "color-mix(in srgb, var(--bad) 65%, var(--warn))", label: "−2" },
  { to: 80, color: "var(--warn)", label: "−1" },
  { to: 100, color: "var(--good)", label: "Safe" },
];

export function GradeGauge({ pct }: { pct: number | null }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    if (pct == null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setW(pct); return; }
    const id = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  let prev = 0;
  return (
    <div>
      <div style={{ position: "relative", height: 16, borderRadius: 999, overflow: "hidden", display: "flex", boxShadow: "inset 2px 2px 5px var(--nm-dk), inset -2px -2px 5px var(--nm-lt)" }}>
        {ZONES.map((z, i) => { const width = z.to - prev; prev = z.to; return <div key={i} style={{ width: `${width}%`, background: z.color, opacity: 0.85 }} />; })}
        {/* needle */}
        {pct != null && (
          <div style={{ position: "absolute", top: -3, bottom: -3, left: `calc(${w}% - 1px)`, width: 2, background: "var(--text)", transition: "left 1.1s cubic-bezier(.2,.7,.3,1)", boxShadow: "0 0 4px var(--nm-dk)" }}>
            <div style={{ position: "absolute", top: -6, left: -4, width: 10, height: 10, borderRadius: "50%", background: "var(--text)", boxShadow: "0 0 6px var(--nm-dk)" }} />
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: ".6rem", color: "var(--faint)", letterSpacing: ".05em" }}>
        <span>0</span><span style={{ marginLeft: "40%" }}>50</span><span>60</span><span style={{ marginRight: "9%" }}>80</span><span>100</span>
      </div>
    </div>
  );
}
