import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getViewer, sectionsFor } from "@/lib/viewer";
import { SectionSwitch, BottomNav } from "@/components/Nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tilt } from "@/components/Tilt";
import { Backdrop } from "@/components/Backdrop";

// The seeker-facing chrome: topbar + bottom nav. /admin deliberately does not
// share this — it gets the console rail instead.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const items = sectionsFor(viewer);

  return (
    <div className="app">
      <Backdrop variant="ambient" />
      <header className="topbar">
        <Link href="/" className="brand"><span className="brand-mark">▦</span><span className="brand-txt">Register</span></Link>
        <div className="topbar-center"><SectionSwitch items={items} /></div>
        <div className="topbar-right">
          <ThemeToggle />
          <div className="who">
            <span className="who-name">{viewer.name}</span>
            {viewer.isAdmin && <Link href="/admin" className="pill pill-warn" style={{ textDecoration: "none" }}>admin ↗</Link>}
            {viewer.student && <span className="pill">student</span>}
          </div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><button className="btn icon-btn" title="Sign out" aria-label="Sign out">⏻</button></form>
        </div>
      </header>
      <main className="content"><Tilt><div className="content-anim">{children}</div></Tilt></main>
      <BottomNav items={items} />

      {/* injected raw: as JSX children React escapes the `>` in selectors server-side
          only, which breaks hydration and downgrades the whole root to client rendering */}
      <style dangerouslySetInnerHTML={{ __html: `
        .app { min-height: 100dvh; }
        .topbar { position: sticky; top: 0; z-index: 40; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
          gap: 1rem; padding: 0.9rem clamp(1rem, 4vw, 2.2rem);
          background: color-mix(in srgb, var(--bg) 55%, transparent);
          -webkit-backdrop-filter: blur(26px) saturate(1.5); backdrop-filter: blur(26px) saturate(1.5);
          border-bottom: 1px solid var(--divider); box-shadow: var(--shadow-sm); }
        .brand { display: flex; align-items: center; gap: .55rem; text-decoration: none; color: var(--text); justify-self: start; }
        .brand-mark { color: var(--accent); font-size: 1.2rem; }
        .brand-txt { font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; letter-spacing: -.02em; }
        .topbar-center { justify-self: center; }
        .topbar-right { justify-self: end; display: flex; align-items: center; gap: .8rem; }
        .who { display: flex; align-items: center; gap: .5rem; }
        .who-name { font-size: .82rem; color: var(--muted); max-width: 15ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .content { max-width: 1120px; margin: 0 auto; padding: clamp(1.4rem, 3vw, 2.4rem) clamp(1rem, 4vw, 2.2rem) 3rem; }
        .space-y-4 > * + * { margin-top: 1.1rem; } .space-y-5 > * + * { margin-top: 1.35rem; }
        @media (max-width: 860px) {
          .topbar { grid-template-columns: 1fr auto; }
          .topbar-center { display: none; }
          .who-name { display: none; }
          .content { padding-bottom: 6rem; }
        }
      ` }} />
    </div>
  );
}
