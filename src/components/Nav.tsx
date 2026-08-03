"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICON: Record<string, string> = {
  "/me": "◎", "/me/subjects": "❑", "/me/mark": "✓", "/classes": "▤",
  "/subjects": "◇", "/students": "☰", "/compare": "⇄",
  "/admin": "◎", "/admin/mark": "✓", "/admin/analytics": "◈",
};

export function Nav({ items }: { items: { href: string; label: string; group?: string }[] }) {
  const path = usePathname();
  let lastGroup: string | undefined;
  return (
    <nav className="nav">
      {items.map((it) => {
        const active = path === it.href;
        const showGroup = it.group && it.group !== lastGroup;
        lastGroup = it.group;
        return (
          <div key={it.href}>
            {showGroup && <div className="eyebrow" style={{ margin: "1.1rem 0 0.45rem 0.15rem" }}>{it.group}</div>}
            <Link href={it.href} className={"nav-link" + (active ? " nav-link-active" : "")}>
              <span className="nav-ico">{ICON[it.href] || "·"}</span>
              <span>{it.label}</span>
            </Link>
          </div>
        );
      })}
      <style jsx>{`
        .nav { display: flex; flex-direction: column; gap: 2px; }
        .nav-link {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.46rem 0.6rem; border-radius: 9px;
          color: var(--muted); font-size: 0.88rem; text-decoration: none;
          border: 1px solid transparent; transition: background .14s, color .14s;
        }
        .nav-link:hover { color: var(--paper); background: rgba(255,255,255,0.03); text-decoration: none; }
        .nav-link-active { color: var(--paper); background: var(--accent-soft); border-color: color-mix(in srgb, var(--accent) 35%, transparent); }
        .nav-ico { width: 1.1rem; text-align: center; color: var(--accent-2); font-size: 0.9rem; }
        .nav-link-active .nav-ico { color: var(--accent); }
      `}</style>
    </nav>
  );
}
