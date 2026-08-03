"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; ico: string };

// Desktop segmented section switch (neumorphic pressed track, raised active pill)
export function SectionSwitch({ items }: { items: Item[] }) {
  const path = usePathname();
  if (items.length < 2) return null;
  return (
    <div style={{ display: "inline-flex", gap: 5, padding: 5, borderRadius: 14, background: "var(--bg)", boxShadow: "inset 4px 4px 9px var(--nm-dk), inset -4px -4px 9px var(--nm-lt)" }}>
      {items.map((it) => {
        const on = path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: ".45rem .95rem", borderRadius: 10, fontSize: ".86rem", fontWeight: on ? 600 : 400, color: on ? "var(--accent)" : "var(--muted)", textDecoration: "none", boxShadow: on ? "3px 3px 7px var(--nm-dk), -3px -3px 7px var(--nm-lt)" : "none", transition: "box-shadow .18s, color .18s" }}>
            <span style={{ fontSize: ".95rem" }}>{it.ico}</span>{it.label}
          </Link>
        );
      })}
    </div>
  );
}

export function BottomNav({ items }: { items: Item[] }) {
  const path = usePathname();
  return (
    <nav className="bnav">
      {items.map((it) => {
        const on = path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={"bnav-link" + (on ? " bnav-on" : "")}>
            <span className="bnav-ico">{it.ico}</span><span className="bnav-lbl">{it.label}</span>
          </Link>
        );
      })}
      <style jsx>{`
        .bnav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; display: none;
          grid-auto-flow: column; grid-auto-columns: 1fr; align-items: center; gap: 8px;
          background: var(--bg); box-shadow: 0 -6px 18px var(--nm-dk); padding: .5rem .8rem calc(.5rem + env(safe-area-inset-bottom)); }
        .bnav-link { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: .5rem; border-radius: 12px; color: var(--muted); text-decoration: none; font-size: .68rem; }
        .bnav-on { color: var(--accent); box-shadow: inset 3px 3px 7px var(--nm-dk), inset -3px -3px 7px var(--nm-lt); }
        .bnav-ico { font-size: 1.15rem; line-height: 1; }
        @media (max-width: 860px) { .bnav { display: grid; } }
      `}</style>
    </nav>
  );
}
