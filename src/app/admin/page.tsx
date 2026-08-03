import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { attendanceSummary, weeklyTrend } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { TrendLine } from "@/components/Charts";
import { Ring, Meter } from "@/components/Ring";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") redirect("/login");

  const [summary, trend, counts] = await Promise.all([
    attendanceSummary(),
    weeklyTrend(),
    Promise.all([prisma.student.count(), prisma.course.count(), prisma.session.count(), prisma.attendance.count()]),
  ]);
  const [students, courses, sessions, marks] = counts;
  const atRisk = summary.students.filter((s) => s.pct != null && s.pct < 75);
  const classPct = marks ? Math.round((summary.students.reduce((a, s) => a + (s.present || 0), 0) / summary.students.reduce((a, s) => a + (s.total || 0), 0)) * 1000) / 10 : null;

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow">Cohort overview · DBM Term IV</div>
        <h1 style={{ fontSize: "1.7rem", marginTop: 6 }}>The register at a glance</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto repeat(4, 1fr)", gap: "0.9rem", alignItems: "stretch" }} className="ov-grid">
        <div className="card" style={{ display: "grid", placeItems: "center", padding: "1rem" }}><Ring value={classPct} size={132} label="class avg" /></div>
        <Tile k="Students" v={students} />
        <Tile k="Subjects" v={courses} />
        <Tile k="Sessions" v={sessions} />
        <Tile k="Marks" v={marks} />
      </div>

      {marks === 0 && (
        <div className="card" style={{ borderColor: "color-mix(in srgb, var(--warn) 40%, transparent)" }}>
          <div className="pill pill-warn">No data yet</div>
          <p style={{ marginTop: ".6rem", color: "var(--muted)", fontSize: ".9rem" }}>Mark your first session in <Link href="/admin/mark">Mark roster</Link>. Every chart here fills in as attendance is recorded.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.1rem" }} className="ov-grid2">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".7rem" }}>
            <span className="eyebrow">Class attendance trend</span>
            <Link href="/admin/analytics" className="code">full analytics →</Link>
          </div>
          {trend.length ? <TrendLine data={trend} /> : <div style={{ color: "var(--faint)", textAlign: "center", padding: "2rem 0", fontSize: ".85rem" }}>No data yet.</div>}
        </div>
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: ".7rem" }}>Below 75% · {atRisk.length}</div>
          <div style={{ maxHeight: 240, overflow: "auto" }}>
            <table><tbody>
              {atRisk.slice(0, 40).map((s) => (
                <tr key={s.id}><td>{s.name}</td><td className="code">{s.studentId}</td><td style={{ width: 70 }}><Meter value={s.pct} width={56} /></td><td className="num" style={{ textAlign: "right", color: "var(--bad)" }}>{s.pct}%</td></tr>
              ))}
              {atRisk.length === 0 && <tr><td style={{ color: "var(--faint)" }}>Nobody below 75% — or no data yet.</td></tr>}
            </tbody></table>
          </div>
        </div>
      </div>
      <style>{`@media (max-width:820px){.ov-grid{grid-template-columns:repeat(2,1fr)!important}.ov-grid2{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}

function Tile({ k, v }: { k: string; v: number }) {
  return (
    <div className="card-flat" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div className="eyebrow">{k}</div>
      <div className="stat-num num" style={{ fontSize: "2rem", marginTop: 4 }}>{v}</div>
    </div>
  );
}
