import Link from "next/link";

export function Tabs({ tabs, base, active }: { tabs: { key: string; label: string }[]; base: string; active: string }) {
  return (
    <div className="scroll-x" style={{ marginBottom: "1.6rem" }}>
      <div style={{ display: "inline-flex", gap: 5, padding: 5, borderRadius: 14, background: "var(--bg)", boxShadow: "inset 4px 4px 9px var(--nm-dk), inset -4px -4px 9px var(--nm-lt)", minWidth: "min-content" }}>
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <Link
              key={t.key}
              href={`${base}?tab=${t.key}`}
              style={{
                whiteSpace: "nowrap", padding: ".5rem .95rem", borderRadius: 10, fontSize: ".85rem",
                fontWeight: on ? 600 : 400, color: on ? "var(--accent)" : "var(--muted)", textDecoration: "none",
                boxShadow: on ? "3px 3px 7px var(--nm-dk), -3px -3px 7px var(--nm-lt)" : "none",
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
