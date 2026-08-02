import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { weeklyTrend, studentVsClass } from "@/lib/analytics";
import { TrendLine, BarPct } from "@/components/Charts";

export const dynamic = "force-dynamic";

export default async function Me() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const email = session.user.email!;
  const student = await prisma.student.findUnique({ where: { email } });

  if (!student)
    return <div className="card">No student record is linked to <b>{email}</b>. If you're a committee admin, use the <a href="/admin">admin dashboard</a>. Otherwise contact the ECAP committee.</div>;

  const [trend, vs, rows] = await Promise.all([
    weeklyTrend(student.id),
    studentVsClass(student.id),
    prisma.attendance.findMany({ where: { studentId: student.id }, include: { session: { include: { course: true } } } }),
  ]);
  const present = rows.filter((r) => r.status === "PRESENT").length;
  const overall = rows.length ? Math.round((present / rows.length) * 1000) / 10 : null;

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between">
        <div><div className="text-lg font-semibold">{student.name}</div><div className="text-neutral-500 text-sm">{student.studentId}</div></div>
        <div className="text-right"><div className="text-3xl font-bold">{overall ?? "—"}%</div><div className="text-xs text-neutral-500">{present}/{rows.length} sessions</div></div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card"><h2 className="font-semibold mb-2">My weekly trend</h2>{trend.length ? <TrendLine data={trend} /> : <p className="text-neutral-500 text-sm">No attendance recorded yet.</p>}</div>
        <div className="card"><h2 className="font-semibold mb-2">My % vs class average</h2>
          {vs.length ? (
            <table><thead><tr><th>Course</th><th className="text-right">Me</th><th className="text-right">Class</th><th className="text-right">Δ</th></tr></thead><tbody>
              {vs.map((c) => (<tr key={c.code}><td>{c.code}</td><td className="text-right">{c.mine ?? "—"}%</td><td className="text-right text-neutral-500">{c.classAvg ?? "—"}%</td>
                <td className={"text-right font-medium " + ((c.diff ?? 0) < 0 ? "text-bad" : "text-good")}>{c.diff != null ? (c.diff > 0 ? "+" : "") + c.diff : "—"}</td></tr>))}
            </tbody></table>
          ) : <p className="text-neutral-500 text-sm">No data yet.</p>}
        </div>
      </div>
    </div>
  );
}
