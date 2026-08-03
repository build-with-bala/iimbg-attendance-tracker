"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; ico: string };

export function Nav({ items }: { items: Item[] }) {
  const path = usePathname();
  return (
    <nav className="nav">
      {items.map((it) => {
        const active = path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={"nav-link" + (active ? " nav-link-active" : "")}>
            <span className="nav-ico">{it.ico}</span><span>{it.label}</span>
          </Link>
        );
      })}
      <style jsx>{`
        .nav { display: flex; flex-direction: column; gap: 3px; }
        .nav-link { display: flex; align-items: center; gap: .6rem; padding: .6rem .7rem; border-radius: 10px; color: var(--muted); font-size: .95rem; text-decoration: none; border: 1px solid transparent; transition: background .14s, color .14s; }
        .nav-link:hover { color: var(--paper); background: rgba(255,255,255,.03); text-decoration: none; }
        .nav-link-active { color: var(--paper); background: var(--accent-soft); border-color: color-mix(in srgb, var(--accent) 35%, transparent); }
        .nav-ico { width: 1.2rem; text-align: center; color: var(--accent-2); }
        .nav-link-active .nav-ico { color: var(--accent); }
      `}</style>
    </nav>
  );
}

export function BottomNav({ items }: { items: Item[] }) {
  const path = usePathname();
  return (
    <nav className="bnav">
      {items.map((it) => {
        const active = path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={"bnav-link" + (active ? " bnav-active" : "")}>
            <span className="bnav-ico">{it.ico}</span><span className="bnav-lbl">{it.label}</span>
          </Link>
        );
      })}
      <style jsx>{`
        .bnav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; display: none;
          grid-auto-flow: column; grid-auto-columns: 1fr; align-items: center;
          background: color-mix(in srgb, var(--surface) 90%, transparent); backdrop-filter: blur(12px);
          border-top: 1px solid var(--line); padding: .35rem .4rem calc(.35rem + env(safe-area-inset-bottom)); }
        .bnav-link { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: .4rem; color: var(--muted); text-decoration: none; font-size: .68rem; }
        .bnav-ico { font-size: 1.1rem; line-height: 1; }
        .bnav-active { color: var(--accent-2); }
        @media (max-width: 820px) { .bnav { display: grid; } }
      `}</style>
    </nav>
  );
}
