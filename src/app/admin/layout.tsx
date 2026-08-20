import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { isRootAdmin } from "@/lib/admins";
import { AdminShell } from "@/components/admin/AdminShell";
import { ticketCounts } from "@/lib/ticket-data";
import { Backdrop } from "@/components/Backdrop";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  // Signed in but not on the console: say so plainly rather than bouncing them
  // to a page that looks like a failed login.
  if (!viewer.isAdmin) {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "1.5rem" }}>
        <Backdrop variant="ambient" />
        <div className="card" style={{ maxWidth: 430, textAlign: "center" }}>
          <div className="eyebrow">Register · Admin</div>
          <h1 style={{ fontSize: "1.3rem", margin: ".7rem 0 .5rem" }}>No console access</h1>
          <p style={{ color: "var(--muted)", fontSize: ".88rem", margin: "0 0 1.2rem" }}>
            <span style={{ color: "var(--accent-2)" }}>{viewer.email}</span> isn&apos;t on the admin list. Ask a committee
            admin to add you from the Access page.
          </p>
          <Link className="btn" href={viewer.student ? "/student" : "/cohort"} style={{ textDecoration: "none" }}>
            Back to the app
          </Link>
        </div>
      </main>
    );
  }

  const counts = await ticketCounts();

  return (
    <>
      <Backdrop variant="ambient" />
      <AdminShell
        email={viewer.email}
        root={isRootAdmin(viewer.email)}
        isStudent={!!viewer.student}
        badges={{ "/admin/queries": counts.open }}
      >
        {children}
      </AdminShell>
    </>
  );
}
