import "./globals.css";
import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Nav } from "@/components/Nav";

const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space", weight: ["500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Register — ECAP Attendance, IIM Bodh Gaya",
  description: "Track your electives, attendance and how you compare across the cohort.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  const items = session?.user
    ? role === "admin"
      ? [
          { href: "/admin", label: "Overview", group: "Cohort" },
          { href: "/admin/analytics", label: "Analytics" },
          { href: "/classes", label: "Timetable" },
          { href: "/subjects", label: "Subjects" },
          { href: "/students", label: "Students" },
          { href: "/compare", label: "Compare" },
          { href: "/admin/mark", label: "Mark roster", group: "Actions" },
        ]
      : [
          { href: "/me", label: "My standing", group: "Me" },
          { href: "/me/subjects", label: "My subjects" },
          { href: "/me/mark", label: "Mark me" },
          { href: "/classes", label: "Timetable", group: "Cohort" },
          { href: "/subjects", label: "Subjects" },
          { href: "/students", label: "Students" },
          { href: "/compare", label: "Compare" },
        ]
    : [];

  return (
    <html lang="en" className={`${space.variable} ${inter.variable} ${mono.variable}`}>
      <body>
        {session?.user ? (
          <div className="shell">
            <aside className="spine">
              <Link href="/" className="brand">
                <span className="brand-mark">▦</span>
                <span className="brand-txt">Register<span className="brand-sub">IIM BODH GAYA · ECAP</span></span>
              </Link>
              <Nav items={items} />
              <div className="spine-foot">
                <div className="who">
                  <div className="who-name">{session.user.name || session.user.email}</div>
                  <div className="who-role"><span className={"pill " + (role === "admin" ? "pill-warn" : "")}>{role}</span></div>
                </div>
                <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
                  <button className="btn btn-ghost" style={{ width: "100%", marginTop: ".5rem" }}>Sign out</button>
                </form>
              </div>
            </aside>
            <main className="content">{children}</main>
          </div>
        ) : (
          <main>{children}</main>
        )}
        <style>{`
          .shell { display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; }
          .spine {
            position: sticky; top: 0; align-self: start; height: 100vh;
            display: flex; flex-direction: column; gap: .4rem;
            padding: 1.1rem 0.85rem; border-right: 1px solid var(--line);
            background: linear-gradient(180deg, var(--surface), var(--ink));
          }
          .brand { display: flex; align-items: center; gap: .6rem; padding: .3rem .5rem 1rem; text-decoration: none; color: var(--paper); }
          .brand-mark { color: var(--accent); font-size: 1.15rem; }
          .brand-txt { font-family: var(--font-space); font-weight: 700; font-size: 1.05rem; letter-spacing: -.02em; display: flex; flex-direction: column; line-height: 1.05; }
          .brand-sub { font-family: var(--font-mono); font-weight: 400; font-size: .53rem; letter-spacing: .18em; color: var(--faint); margin-top: 3px; }
          .spine-foot { margin-top: auto; padding-top: .8rem; border-top: 1px solid var(--line); }
          .who-name { font-size: .82rem; color: var(--paper); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .who-role { margin-top: .35rem; }
          .content { padding: 2rem 2.2rem; max-width: 1180px; }
          @media (max-width: 820px) {
            .shell { grid-template-columns: 1fr; }
            .spine { position: static; height: auto; flex-direction: column; border-right: none; border-bottom: 1px solid var(--line); }
            .content { padding: 1.2rem 1.1rem; }
          }
        `}</style>
      </body>
    </html>
  );
}
