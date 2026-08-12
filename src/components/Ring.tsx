"use client";
import { useEffect, useRef, useState } from "react";

// Signature instrument: a pressure-gauge attendance dial that draws + counts on mount.
export function Ring({ value, size = 210, label }: { value: number | null; size?: number; label?: string }) {
  const target = Math.max(0, Math.min(100, value ?? 0));
  const [frac, setFrac] = useState(0);
  useEffect(() => {
    if (value == null) { setFrac(0); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setFrac(1); return; }
    let raf = 0; const t0 = performance.now(), dur = 1200;
    const tick = (now: number) => { const p = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - p, 3); setFrac(e); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const v = target * frac;
  const cx = size / 2, cy = size / 2;
  const stroke = 9;
  const Rarc = size / 2 - 20;
  const C = 2 * Math.PI * Rarc;
  const SPAN = 0.75;
  const col = value == null ? "var(--faint)" : target >= 85 ? "var(--good)" : target >= 75 ? "var(--warn)" : "var(--bad)";
  const N = 41, Rout = size / 2 - 7;
  const ticks = Array.from({ length: N }, (_, i) => {
    const major = i % 10 === 0;
    const a = ((135 + (i / (N - 1)) * 270) * Math.PI) / 180;
    const len = major ? 9 : 5;
    return { x1: cx + Rout * Math.cos(a), y1: cy + Rout * Math.sin(a), x2: cx + (Rout - len) * Math.cos(a), y2: cy + (Rout - len) * Math.sin(a), major };
  });

  return (
    <div className="attring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g>{ticks.map((t, i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="var(--engrave)" strokeWidth={t.major ? 1.6 : 1} strokeLinecap="round" opacity={t.major ? 0.9 : 0.5} />)}</g>
        <g transform={`rotate(135 ${cx} ${cy})`}>
          <circle cx={cx} cy={cy} r={Rarc} fill="none" stroke="var(--track)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${C * SPAN} ${C}`} />
          <circle cx={cx} cy={cy} r={Rarc} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${C * SPAN * (v / 100)} ${C}`} style={{ filter: `drop-shadow(0 0 5px color-mix(in srgb, ${col} 45%, transparent))` }} />
        </g>
      </svg>
      <div className="attring-mid">
        <div className="stat-num" style={{ fontSize: size * 0.32, color: col }}>{value == null ? "—" : Math.round(v)}<span style={{ fontFamily: "var(--font-mono)", fontSize: size * 0.1, color: "var(--muted)", marginLeft: 1 }}>%</span></div>
        {label && <div className="eyebrow" style={{ marginTop: 6 }}>{label}</div>}
      </div>
    </div>
  );
}

export function Meter({ value, width = 120 }: { value: number | null; width?: number }) {
  const v = value ?? 0;
  const col = value == null ? "var(--faint)" : v >= 85 ? "var(--good)" : v >= 75 ? "var(--warn)" : "var(--bad)";
  return (
    <div className="bar-track" style={{ width }}>
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, v))}%`, background: col, transition: "width 1s cubic-bezier(.2,.7,.3,1)" }} />
    </div>
  );
}
