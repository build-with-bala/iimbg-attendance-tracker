import Link from "next/link";

export function Tabs({ tabs, base, active }: { tabs: { key: string; label: string }[]; base: string; active: string }) {
  return (
    <div className="scroll-x" style={{ marginBottom: "1.6rem" }}>
      <div className="seg">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <Link key={t.key} href={`${base}?tab=${t.key}`} className={"seg-it" + (on ? " seg-on" : "")} style={{ padding: ".5rem .95rem" }}>
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
