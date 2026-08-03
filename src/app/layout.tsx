import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/auth";

export const metadata: Metadata = {
  title: "ECAP Attendance Tracker — IIM Bodh Gaya",
  description: "Attendance marking + analytics for DBM/MBA/HHM electives",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  return (
    <html lang="en">
      <body>
        <header className="border-b border-line">
          <div className="max-w-6xl mx-auto flex items-center gap-4 px-4 py-3">
            <Link href="/" className="font-semibold text-neutral-100 no-underline">📋 ECAP Attendance</Link>
            {session?.user && (
              <nav className="flex gap-3 text-sm flex-wrap">
                <Link href="/classes">Classes</Link>
                <Link href="/subjects">Subjects</Link>
                <Link href="/students">Students</Link>
                <Link href="/compare">Compare</Link>
                {role === "student" && <><Link href="/me">My attendance</Link><Link href="/me/subjects">My subjects</Link><Link href="/me/mark">Mark me</Link></>}
                {role === "admin" && <><Link href="/admin">Dashboard</Link><Link href="/admin/mark">Roster mark</Link><Link href="/admin/analytics">Analytics</Link></>}
              </nav>
            )}
            <div className="ml-auto flex items-center gap-3 text-sm">
              {session?.user ? (
                <>
                  <span className="text-neutral-400">{session.user.email}</span>
                  <span className="pill border-line">{role}</span>
                  <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
                    <button className="btn">Sign out</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="btn btn-accent no-underline">Sign in</Link>
              )}
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
