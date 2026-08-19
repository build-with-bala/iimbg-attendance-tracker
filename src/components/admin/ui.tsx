import Link from "next/link";
import type { ReactNode } from "react";
import { AnimatedNumber } from "@/components/AnimatedNumber";

export const tone = (t?: string) =>
  t === "good" ? "var(--good)" : t === "warn" ? "var(--warn)" : t === "bad" ? "var(--bad)" : t === "accent" ? "var(--accent-2)" : "var(--text)";

/** Colour by attendance %, using the same thresholds as the grade policy. */
export const pctTone = (p: number | null) => (p == null ? "faint" : p >= 80 ? "good" : p >= 60 ? "warn" : "bad");

export function PageHeader({ title, eyebrow, right, lede }: { title: string; eyebrow?: string; right?: ReactNode; lede?: string }) {
  return (
    <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1.4rem" }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 style={{ fontSize: "clamp(1.65rem,3.2vw,2.15rem)", marginTop: ".45rem" }}>{title}</h1>
        {lede && <p style={{ color: "var(--muted)", fontSize: ".88rem", margin: ".5rem 0 0", maxWidth: "46rem" }}>{lede}</p>}
      </div>
      {right}
    </header>
  );
}

export function Panel({ title, right, children, pad }: { title?: string; right?: ReactNode; children: ReactNode; pad?: string }) {
  return (
    <section className="card" style={pad ? { padding: pad } : undefined}>
      {(title || right) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".7rem", marginBottom: ".95rem", flexWrap: "wrap" }}>
          {title && <div className="eyebrow">{title}</div>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Grid({ min = 220, gap = "1rem", children }: { min?: number; gap?: string; children: ReactNode }) {
  return <div style={{ display: "grid", gap, gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))` }}>{children}</div>;
}

export function Stat({ label, value, hint, t, suffix, decimals = 0 }: { label: string; value: number | string | null; hint?: ReactNode; t?: string; suffix?: string; decimals?: number }) {
  return (
    <div className="card-flat">
      <div className="eyebrow">{label}</div>
      <div className="stat-num num" style={{ fontSize: "1.85rem", marginTop: ".5rem", color: tone(t) }}>
        {typeof value === "number" ? <AnimatedNumber value={value} decimals={decimals} /> : (value ?? "—")}
        {suffix && <span style={{ fontFamily: "var(--font-mono)", fontSize: ".85rem", color: "var(--muted)", marginLeft: 2 }}>{suffix}</span>}
      </div>
      {hint != null && <div className="code" style={{ marginTop: ".4rem", fontSize: ".72rem" }}>{hint}</div>}
    </div>
  );
}

/** Headline tile: one big number plus the parts it breaks into. */
export function MetricCard({ label, value, suffix, t, subs, decimals = 0 }: {
  label: string; value: number; suffix?: string; t?: string; decimals?: number;
  subs: { n: number | string; t: string; tone?: string }[];
}) {
  return (
    <div className="card" style={{ padding: "1.15rem 1.3rem" }}>
      <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: ".45rem" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: tone(t), boxShadow: `0 0 0 3px color-mix(in srgb, ${tone(t)} 20%, transparent)` }} />
        {label}
      </div>
      <div className="stat-num num" style={{ fontSize: "2.3rem", marginTop: ".6rem", color: tone(t) }}>
        <AnimatedNumber value={value} decimals={decimals} />
        {suffix && <span style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", color: "var(--muted)", marginLeft: 2 }}>{suffix}</span>}
      </div>
      <div style={{ display: "flex", gap: ".5rem", marginTop: "1rem" }}>
        {subs.map((s, i) => (
          <div key={i} className="inset" style={{ flex: 1, padding: ".55rem .4rem", textAlign: "center" }}>
            <div className="num" style={{ fontSize: "1.02rem", fontWeight: 600, color: tone(s.tone) }}>{s.n}</div>
            <div className="eyebrow" style={{ fontSize: ".52rem", marginTop: ".2rem", letterSpacing: ".16em" }}>{s.t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Bar({ value, width = "100%", t }: { value: number | null; width?: string | number; t?: string }) {
  return (
    <div className="bar-track" style={{ width }}>
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%`, background: tone(t ?? pctTone(value)), transition: "width 1s cubic-bezier(.2,.7,.3,1)" }} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div style={{ color: "var(--faint)", fontSize: ".85rem", padding: "1.6rem 0", textAlign: "center" }}>{children}</div>;
}

/** Horizontal ranked bars — the console's workhorse chart. */
export function RankBars({ rows, unit = "%", max }: { rows: { label: string; value: number | null; note?: string; href?: string }[]; unit?: string; max?: number }) {
  if (!rows.length) return <Empty>Nothing to chart yet.</Empty>;
  const top = max ?? Math.max(1, ...rows.map((r) => r.value ?? 0));
  return (
    <div style={{ display: "grid", gap: ".55rem" }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 62px", alignItems: "center", gap: ".8rem" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: ".6rem", marginBottom: ".3rem" }}>
              <span style={{ fontSize: ".83rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.href ? <Link href={r.href}>{r.label}</Link> : r.label}
              </span>
              {r.note && <span className="code" style={{ fontSize: ".7rem", flex: "none" }}>{r.note}</span>}
            </div>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${((r.value ?? 0) / top) * 100}%`, background: tone(unit === "%" ? pctTone(r.value) : "accent") }} /></div>
          </div>
          <span className="num" style={{ textAlign: "right", fontSize: ".82rem", fontWeight: 600, color: unit === "%" ? tone(pctTone(r.value)) : "var(--text)" }}>
            {r.value ?? "—"}{r.value != null ? unit : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
