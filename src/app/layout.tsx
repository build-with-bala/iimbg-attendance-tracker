import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { SectionSwitch, BottomNav } from "@/components/Nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tilt } from "@/components/Tilt";

// Fraunces is variable: `axes` and `weight` are mutually exclusive — declaring
// the opsz axis gives us the full weight range already.
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600"] });

export const metadata: Metadata = { title: "Register — ECAP Attendance, IIM Bodh Gaya", description: "Track your electives, attendance and how you compare across the cohort." };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');if(!t){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const items = role === "admin"
    ? [{ href: "/cohort", label: "Cohort", ico: "▦" }]
    : [{ href: "/student", label: "Student", ico: "◎" }, { href: "/cohort", label: "Cohort", ico: "▦" }];

  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${mono.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {session?.user ? (
          <div className="app">
            <header className="topbar">
              <Link href="/" className="brand"><span className="brand-mark">▦</span><span className="brand-txt">Register</span></Link>
              <div className="topbar-center"><SectionSwitch items={items} /></div>
              <div className="topbar-right">
                <ThemeToggle />
                <div className="who"><span className="who-name">{session.user.name || session.user.email}</span><span className={"pill " + (role === "admin" ? "pill-warn" : "")}>{role}</span></div>
                <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><button className="btn icon-btn" title="Sign out" aria-label="Sign out">⏻</button></form>
              </div>
            </header>
            <main className="content"><Tilt><div className="content-anim">{children}</div></Tilt></main>
            <BottomNav items={items} />
          </div>
        ) : (<main>{children}</main>)}

        {/* injected raw: as JSX children React escapes the `>` in selectors server-side
            only, which breaks hydration and downgrades the whole root to client rendering */}
        <style dangerouslySetInnerHTML={{ __html: `
          .app { min-height: 100dvh; }
          .topbar { position: sticky; top: 0; z-index: 40; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
            gap: 1rem; padding: 0.9rem clamp(1rem, 4vw, 2.2rem); background: var(--bg); box-shadow: 0 6px 20px var(--nm-dk); }
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
      </body>
    </html>
  );
}
