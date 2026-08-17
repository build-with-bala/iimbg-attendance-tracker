"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; ico: string };

// Desktop segmented section switch (recessed glass track, frosted active chip)
export function SectionSwitch({ items }: { items: Item[] }) {
  const path = usePathname();
  if (items.length < 2) return null;
  return (
    <div className="seg">
      {items.map((it) => {
        const on = path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={"seg-it" + (on ? " seg-on" : "")}>
            <span style={{ fontSize: ".95rem" }}>{it.ico}</span>{it.label}
          </Link>
        );
      })}
    </div>
  );
}

// Mobile floating glass dock (styles in globals.css — styled-jsx can't scope
// the computed className on the links)
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
    </nav>
  );
}
