"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ADMIN_NAV } from "@/components/admin/nav";
import Icon from "@/components/admin/Icon";

const CSS = `
/* The console is dense with tables and numbers, so the aurora drops to a hum —
   the rule unmounts with the shell, leaving the seeker-facing app untouched. */
.bgfx{opacity:.38}
.ashell{display:grid;grid-template-columns:246px minmax(0,1fr);min-height:100dvh}
.arail{position:sticky;top:0;height:100dvh;overflow-y:auto;display:flex;flex-direction:column;gap:2px;padding:18px 13px;
  background:color-mix(in srgb, var(--bg) 62%, transparent);
  -webkit-backdrop-filter:blur(26px) saturate(1.5);backdrop-filter:blur(26px) saturate(1.5);
  border-right:1px solid var(--divider)}
.abrand{display:flex;align-items:center;gap:9px;padding:5px 9px 17px}
.abrand .mk{color:var(--accent);font-size:1.15rem;line-height:1}
.abrand .nm{font-family:var(--font-display);font-size:1.06rem;font-weight:700;letter-spacing:-.02em;color:var(--text)}
.abrand .tg{font-family:var(--font-mono);font-size:.5rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent-2);
  border:1px solid color-mix(in srgb, var(--accent) 40%, transparent);border-radius:5px;padding:2px 5px;margin-left:2px}
.agrp{display:flex;flex-direction:column;gap:1px;margin-top:9px}
.agt{font-family:var(--font-mono);font-size:.54rem;letter-spacing:.2em;text-transform:uppercase;color:var(--faint);padding:9px 10px 5px}
.alink{display:flex;align-items:center;gap:11px;padding:.5rem .68rem;border-radius:11px;text-decoration:none;
  color:var(--muted);font-size:.855rem;font-weight:500;border:1px solid transparent;
  transition:background .16s,color .16s,border-color .16s}
.alink:hover{color:var(--text);background:var(--glass);text-decoration:none}
.alink.on{color:var(--accent);font-weight:600;background:var(--glass-strong);border-color:var(--edge);
  box-shadow:inset 0 1px 0 var(--edge-hi),0 2px 12px color-mix(in srgb, var(--accent) 20%, transparent)}
.alink .ico{flex:none;opacity:.92}
.abadge{margin-left:auto;font-family:var(--font-mono);font-size:.6rem;font-weight:600;line-height:1;
  padding:3px 6px;border-radius:999px;color:var(--warn);
  background:color-mix(in srgb, var(--warn) 16%, transparent);
  border:1px solid color-mix(in srgb, var(--warn) 38%, transparent)}
.afoot{margin-top:auto;padding-top:13px;border-top:1px solid var(--divider);display:flex;flex-direction:column;gap:9px}
.awho{display:flex;flex-direction:column;line-height:1.35;padding:1px 4px;min-width:0}
.awho .em{font-size:.76rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.awho .rl{font-family:var(--font-mono);font-size:.56rem;letter-spacing:.14em;text-transform:uppercase;color:var(--accent-2);margin-top:2px}
.arow{display:flex;gap:7px}
.arow .btn{flex:1;padding:.45rem;font-size:.74rem;gap:6px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px}
.amain{min-width:0;padding:26px clamp(16px,3vw,34px) 72px;max-width:1240px}
.atop{display:none}
.ascrim{display:none}
@media(max-width:900px){
  .ashell{grid-template-columns:1fr}
  .arail{position:fixed;left:0;top:0;z-index:80;width:246px;transform:translateX(-100%);
    transition:transform .24s cubic-bezier(.16,1,.3,1);box-shadow:var(--shadow);
    background:color-mix(in srgb, var(--bg) 94%, transparent)}
  .arail.open{transform:translateX(0)}
  .atop{position:sticky;top:0;z-index:70;display:flex;align-items:center;gap:11px;padding:.7rem 1rem;
    background:color-mix(in srgb, var(--bg) 62%, transparent);
    -webkit-backdrop-filter:blur(26px) saturate(1.5);backdrop-filter:blur(26px) saturate(1.5);
    border-bottom:1px solid var(--divider)}
  .atop .nm{font-family:var(--font-display);font-weight:700;font-size:1rem}
  .ascrim.show{display:block;position:fixed;inset:0;background:rgba(4,6,12,.5);z-index:75}
}
`;

export function AdminShell({
  email,
  root,
  isStudent,
  badges = {},
  children,
}: {
  email: string;
  root: boolean;
  isStudent: boolean;
  /** href -> count, drawn on the rail so a full queue is visible from anywhere. */
  badges?: Record<string, number>;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => setTheme((document.documentElement.getAttribute("data-theme") as "dark" | "light") || "dark"), []);
  useEffect(() => setOpen(false), [path]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch {}
    window.dispatchEvent(new Event("themechange"));
    setTheme(next);
  };

  // "/admin" must match exactly or every child would light it up too.
  const on = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

  return (
    <div className="ashell">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="atop">
        <button className="btn icon-btn" style={{ width: 36, height: 36 }} onClick={() => setOpen(true)} aria-label="Open menu">
          <Icon name="menu" />
        </button>
        <span className="nm">Register <span style={{ color: "var(--accent-2)", fontSize: ".72rem" }}>Admin</span></span>
      </div>
      <div className={"ascrim" + (open ? " show" : "")} onClick={() => setOpen(false)} />

      <aside className={"arail" + (open ? " open" : "")}>
        <div className="abrand">
          <span className="mk">▦</span>
          <span className="nm">Register</span>
          <span className="tg">Admin</span>
        </div>

        {ADMIN_NAV.map((g, i) => (
          <div className="agrp" key={i}>
            {g.title && <div className="agt">{g.title}</div>}
            {g.items.map((it) => (
              <Link key={it.href} href={it.href} className={"alink" + (on(it.href) ? " on" : "")} title={it.hint}>
                <Icon name={it.icon} />
                {it.label}
                {!!badges[it.href] && <span className="abadge">{badges[it.href]}</span>}
              </Link>
            ))}
          </div>
        ))}

        <div className="afoot">
          <div className="awho">
            <span className="em">{email}</span>
            <span className="rl">{root ? "root admin" : "admin"}</span>
          </div>
          <div className="arow">
            <button className="btn" onClick={toggleTheme} aria-label="Toggle theme">
              <Icon name={theme === "dark" ? "sun" : "moon"} size={14} />
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <Link className="btn" href={isStudent ? "/student" : "/cohort"} style={{ textDecoration: "none" }}>
              <Icon name="back" size={14} />
              App
            </Link>
          </div>
        </div>
      </aside>

      <main className="amain">{children}</main>
    </div>
  );
}
