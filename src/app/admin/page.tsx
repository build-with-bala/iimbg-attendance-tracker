import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { attendanceSummary, weeklyTrend } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { TrendLine } from "@/components/Charts";

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Students", students], ["Courses", courses], ["Sessions", sessions], ["Marks recorded", marks]].map(([k, v]) => (
          <div key={k as string} className="card"><div className="text-neutral-400 text-xs">{k}</div><div className="text-2xl font-semibold">{v as number}</div></div>
        ))}
      </div>

      {marks === 0 && (
        <div className="card border-warn/40">
          <div className="font-medium text-warn">No attendance recorded yet.</div>
          <p className="text-sm text-neutral-400 mt-1">Head to <Link href="/admin/mark">Mark</Link> to record your first session. Analytics populate as you mark.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-2"><h2 className="font-semibold">Class attendance trend</h2><Link href="/admin/analytics" className="text-xs">full analytics →</Link></div>
          {trend.length ? <TrendLine data={trend} /> : <p className="text-neutral-500 text-sm">No data yet.</p>}
        </div>
        <div className="card">
          <h2 className="font-semibold mb-2">⚠️ Below 75% ({atRisk.length})</h2>
          <div className="max-h-56 overflow-auto">
            <table><tbody>
              {atRisk.slice(0, 30).map((s) => (
                <tr key={s.id}><td>{s.name}</td><td className="text-neutral-500">{s.studentId}</td><td className="text-bad text-right font-medium">{s.pct}%</td></tr>
              ))}
              {atRisk.length === 0 && <tr><td className="text-neutral-500">Nobody below 75% — or no data yet.</td></tr>}
            </tbody></table>
          </div>
        </div>
      </div>
    </div>
  );
}
