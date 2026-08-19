import { adminRoster } from "@/lib/admins";
import { prisma } from "@/lib/prisma";
import { PageHeader, Panel, Empty } from "@/components/admin/ui";
import { GrantForm, RevokeForm } from "@/components/admin/AccessForms";

export const dynamic = "force-dynamic";

const DOMAIN = (process.env.ALLOWED_HD || "iimbg.ac.in").toLowerCase();

export default async function AdminAccess() {
  const roster = await adminRoster();
  // Flag admins who are also on a roster, so it's obvious who is a student too.
  const students = await prisma.student.findMany({
    where: { email: { in: roster.map((r) => r.email) } },
    select: { email: true, name: true, studentId: true },
  });
  const byEmail = new Map(students.map((s) => [s.email.toLowerCase(), s]));

  return (
    <>
      <PageHeader
        title="Access"
        eyebrow="Console · who gets in"
        lede="Anyone here can open the admin console and mark attendance for the whole batch. Admins keep their own student view as well."
      />

      <Panel title="Grant console access">
        <p className="code" style={{ marginBottom: ".9rem" }}>
          They&apos;ll need to sign in with the same @{DOMAIN} Google account. Access applies the moment they reload.
        </p>
        <GrantForm domain={DOMAIN} />
      </Panel>

      <div style={{ height: "1.15rem" }} />

      <Panel title={`Admins · ${roster.length}`}>
        {roster.length === 0 ? <Empty>Nobody has console access.</Empty> : (
          <div className="scroll-x">
            <table>
              <thead>
                <tr><th>Email</th><th>Also a student</th><th>Source</th><th>Added</th><th></th></tr>
              </thead>
              <tbody>
                {roster.map((a) => {
                  const s = byEmail.get(a.email.toLowerCase());
                  return (
                    <tr key={a.email}>
                      <td style={{ fontWeight: 500 }}>{a.email}</td>
                      <td>{s ? <span className="code">{s.name} · {s.studentId}</span> : <span style={{ color: "var(--faint)" }}>—</span>}</td>
                      <td>
                        {a.root
                          ? <span className="pill pill-warn" title="From ROOT_ADMINS or ADMIN_EMAILS">root</span>
                          : <span className="pill">granted</span>}
                      </td>
                      <td className="code" style={{ whiteSpace: "nowrap" }}>
                        {a.addedAt ? `${a.addedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : "in config"}
                        {a.addedBy && <div style={{ fontSize: ".68rem" }}>by {a.addedBy}</div>}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {a.root ? <span className="code" style={{ color: "var(--faint)" }}>locked</span> : <RevokeForm email={a.email} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="code" style={{ marginTop: "1rem" }}>
          Root admins are set in <code>src/lib/admins.ts</code> and the <code>ADMIN_EMAILS</code> environment variable. They
          can&apos;t be removed here, which is what stops a mistaken revoke locking everyone out.
        </p>
      </Panel>
    </>
  );
}
