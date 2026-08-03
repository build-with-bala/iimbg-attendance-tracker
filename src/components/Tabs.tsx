import Link from "next/link";

export function Tabs({ tabs, base, active }: { tabs: { key: string; label: string }[]; base: string; active: string }) {
  return (
    <div style={{ display: "flex", gap: 2, overflowX: "auto", borderBottom: "1px solid var(--line)", marginBottom: "1.4rem" }}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={`${base}?tab=${t.key}`}
            style={{
              whiteSpace: "nowrap",
              padding: ".55rem .9rem",
              fontSize: ".88rem",
              fontWeight: on ? 600 : 400,
              color: on ? "var(--paper)" : "var(--muted)",
              textDecoration: "none",
              borderBottom: on ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
