"use client";
import { useEffect, useRef, useState } from "react";

export function AnimatedNumber({ value, dur = 1000, decimals = 0, prefix = "", suffix = "", className, style }: { value: number | null; dur?: number; decimals?: number; prefix?: string; suffix?: string; className?: string; style?: React.CSSProperties }) {
  const [d, setD] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (value == null) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setD(value); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (now: number) => { const p = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - p, 3); setD(value * e); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, dur]);
  return <span ref={ref} className={className} style={style}>{value == null ? "—" : prefix + d.toFixed(decimals) + suffix}</span>;
}
