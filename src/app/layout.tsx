import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Nav, BottomNav } from "@/components/Nav";
import { Tilt } from "@/components/Tilt";

const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space", weight: ["500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600"] });

export const metadata: Metadata = { title: "Register — ECAP Attendance, IIM Bodh Gaya", description: "Track your electives, attendance and how you compare across the cohort." };
export const viewport: Viewport = { themeColor: "#0b0d12", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const items = role === "admin"
    ? [{ href: "/cohort", label: "Cohort", ico: "▦" }]
    : [{ href: "/student", label: "Student", ico: "◎" }, { href: "/cohort", label: "Cohort", ico: "▦" }];

  return (
    <html lang="en" className={`${space.variable} ${inter.variable} ${mono.variable}`}>
      <body>
        {session?.user ? (
          <div className="shell">
            <aside className="spine">
              <Link href="/" className="brand"><span className="brand-mark">▦</span><span className="brand-txt">Register<span className="brand-sub">IIM BODH GAYA · ECAP</span></span></Link>
              <Nav items={items} />
              <div className="spine-foot">
                <div className="who-name">{session.user.name || session.user.email}</div>
                <div style={{ marginTop: ".35rem" }}><span className={"pill " + (role === "admin" ? "pill-warn" : "")}>{role}</span></div>
                <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><button className="btn btn-ghost" style={{ width: "100%", marginTop: ".5rem" }}>Sign out</button></form>
              </div>
            </aside>

            <header className="topbar">
              <Link href="/" className="brand" style={{ padding: 0 }}><span className="brand-mark">▦</span><span className="brand-txt" style={{ fontSize: ".95rem" }}>Register</span></Link>
              <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><button className="btn btn-ghost">Sign out</button></form>
            </header>

            <main className="content"><Tilt>{children}</Tilt></main>
            <BottomNav items={items} />
          </div>
        ) : (<main>{children}</main>)}

        <style>{`
          .shell { display: grid; grid-template-columns: 240px 1fr; min-height: 100dvh; }
          .spine { position: sticky; top: 0; align-self: start; height: 100dvh; display: flex; flex-direction: column; gap: .5rem; padding: 1.1rem .85rem; border-right: 1px solid var(--line); background: linear-gradient(180deg, var(--surface), var(--ink)); }
          .brand { display: flex; align-items: center; gap: .6rem; padding: .3rem .5rem 1rem; text-decoration: none; color: var(--paper); }
          .brand-mark { color: var(--accent); font-size: 1.15rem; }
          .brand-txt { font-family: var(--font-space); font-weight: 700; font-size: 1.05rem; letter-spacing: -.02em; display: flex; flex-direction: column; line-height: 1.05; }
          .brand-sub { font-family: var(--font-mono); font-weight: 400; font-size: .53rem; letter-spacing: .18em; color: var(--faint); margin-top: 3px; }
          .spine-foot { margin-top: auto; padding-top: .8rem; border-top: 1px solid var(--line); }
          .who-name { font-size: .82rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .topbar { display: none; }
          .content { padding: 2rem 2.2rem; max-width: 1180px; width: 100%; }
          .space-y-4 > * + * { margin-top: 1rem; } .space-y-5 > * + * { margin-top: 1.25rem; }
          .scroll-x { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          @media (max-width: 820px) {
            .shell { grid-template-columns: 1fr; }
            .spine { display: none; }
            .topbar { display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 40; padding: .7rem 1rem; border-bottom: 1px solid var(--line); background: color-mix(in srgb, var(--surface) 90%, transparent); backdrop-filter: blur(12px); }
            .content { padding: 1.1rem 1rem 5.5rem; }
            .two-col, .stat-grid, .ov-grid2, .me-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </body>
    </html>
  );
}
