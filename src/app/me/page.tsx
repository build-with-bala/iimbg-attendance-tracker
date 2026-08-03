import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { weeklyTrend, studentVsClass } from "@/lib/analytics";
import { TrendLine } from "@/components/Charts";
import { Ring, Meter } from "@/components/Ring";

export const dynamic = "force-dynamic";

export default async function Me() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const student = await prisma.student.findUnique({ where: { email: session.user.email! } });
  if (!student)
    return <div className="card">No student record is linked to <b>{session.user.email}</b>. If you're on the committee, use the <a href="/admin">overview</a>.</div>;

  const [trend, vs, rows] = await Promise.all([
    weeklyTrend(student.id),
    studentVsClass(student.id),
    prisma.attendance.findMany({ where: { studentId: student.id }, include: { session: { include: { course: true } } } }),
  ]);
  const present = rows.filter((r) => r.status === "PRESENT").length;
  const overall = rows.length ? Math.round((present / rows.length) * 1000) / 10 : null;
  const enrolled = await prisma.enrollment.count({ where: { studentId: student.id } });
  const best = [...vs].sort((a, b) => (b.diff ?? -99) - (a.diff ?? -99))[0];
  const worst = [...vs].sort((a, b) => (a.diff ?? 99) - (b.diff ?? 99))[0];

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow">{student.studentId} · {student.program}</div>
        <h1 style={{ fontSize: "1.8rem", marginTop: 6 }}>{student.name}</h1>
      </div>

      <div className="card" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "1.8rem", alignItems: "center" }}>
        <Ring value={overall} label="attendance" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "0.9rem" }}>
          <Stat k="Sessions attended" v={`${present}`} sub={`of ${rows.length} held`} />
          <Stat k="Subjects opted" v={`${enrolled}`} sub="this term" />
          <Stat k="Strongest vs class" v={best?.diff != null ? `${best.diff > 0 ? "+" : ""}${best.diff}` : "—"} sub={best?.code || "no data"} tone="good" />
          <Stat k="Needs attention" v={worst?.diff != null ? `${worst.diff}` : "—"} sub={worst?.code || "no data"} tone="bad" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "1.1rem" }} className="me-grid">
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: ".7rem" }}>Weekly trend</div>
          {trend.length ? <TrendLine data={trend} /> : <Empty>Mark a class to start your trend.</Empty>}
        </div>
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: ".7rem" }}>My % vs class average</div>
          {vs.length ? (
            <table><thead><tr><th>Course</th><th>Me</th><th style={{ width: 90 }}></th><th style={{ textAlign: "right" }}>Δ</th></tr></thead><tbody>
              {vs.map((c) => (
                <tr key={c.code}>
                  <td className="code">{c.code}</td>
                  <td className="num">{c.mine ?? "—"}%</td>
                  <td><Meter value={c.mine} width={80} /></td>
                  <td className="num" style={{ textAlign: "right", color: (c.diff ?? 0) < 0 ? "var(--bad)" : "var(--good)" }}>{c.diff != null ? (c.diff > 0 ? "+" : "") + c.diff : "—"}</td>
                </tr>
              ))}
            </tbody></table>
          ) : <Empty>No attendance recorded yet.</Empty>}
        </div>
      </div>

      <div className="card" style={{ display: "flex", gap: ".7rem", alignItems: "center", flexWrap: "wrap" }}>
        <span className="eyebrow">Quick actions</span>
        <Link href="/me/mark" className="btn btn-accent" style={{ textDecoration: "none" }}>Mark today's classes</Link>
        <Link href="/me/subjects" className="btn" style={{ textDecoration: "none" }}>My subjects</Link>
        <Link href="/compare" className="btn" style={{ textDecoration: "none" }}>Compare with a peer</Link>
      </div>
      <style>{`@media (max-width:820px){.me-grid{grid-template-columns:1fr!important}.card [style*="grid-template-columns: auto"]{grid-template-columns:1fr!important;justify-items:center}}`}</style>
    </div>
  );
}

function Stat({ k, v, sub, tone }: { k: string; v: string; sub?: string; tone?: "good" | "bad" }) {
  const col = tone === "good" ? "var(--good)" : tone === "bad" ? "var(--bad)" : "var(--paper)";
  return (
    <div className="card-flat" style={{ padding: "0.8rem 0.9rem" }}>
      <div className="eyebrow">{k}</div>
      <div className="stat-num num" style={{ fontSize: "1.7rem", marginTop: 4, color: col }}>{v}</div>
      {sub && <div className="code" style={{ marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "var(--faint)", fontSize: ".85rem", padding: "1.5rem 0", textAlign: "center" }}>{children}</div>;
}
