// Attendance ring — the signature element. Pure SVG, colored by health.
export function Ring({ value, size = 168, label }: { value: number | null; size?: number; label?: string }) {
  const v = value ?? 0;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, v)) / 100) * c;
  const col = value == null ? "#5f6879" : v >= 85 ? "#4bc46e" : v >= 75 ? "#e3ac35" : "#f26144";
  return (
    <div className="attring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${dash} ${c}`}
          style={{ filter: `drop-shadow(0 0 6px ${col}55)` }}
        />
      </svg>
      <div className="attring-mid">
        <div className="stat-num" style={{ fontSize: size * 0.28, color: col }}>{value ?? "—"}<span style={{ fontSize: size * 0.13, color: "var(--muted)" }}>%</span></div>
        {label && <div className="eyebrow" style={{ marginTop: 4 }}>{label}</div>}
      </div>
    </div>
  );
}

// slim linear meter used in lists
export function Meter({ value, width = 120 }: { value: number | null; width?: number }) {
  const v = value ?? 0;
  const col = value == null ? "var(--faint)" : v >= 85 ? "var(--good)" : v >= 75 ? "var(--warn)" : "var(--bad)";
  return (
    <div className="bar-track" style={{ width }}>
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, v))}%`, background: col }} />
    </div>
  );
}
