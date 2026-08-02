import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { attendanceSummary, courseCorrelations, attendanceDrivers, weeklyTrend } from "@/lib/analytics";
import { TrendLine, BarPct } from "@/components/Charts";

export const dynamic = "force-dynamic";

function rColor(r: number | null) {
  if (r == null) return "text-neutral-600";
  if (r >= 0.5) return "text-good";
  if (r <= -0.5) return "text-bad";
  return "text-neutral-300";
}

export default async function Analytics() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") redirect("/login");

  const [summary, corr, drivers, trend] = await Promise.all([
    attendanceSummary(), courseCorrelations(), attendanceDrivers(), weeklyTrend(),
  ]);

  if (summary.courses.length === 0)
    return <div className="card">No attendance recorded yet — analytics appear once you start marking sessions.</div>;

  return (
    <div className="space-y-6">
      <section className="grid md:grid-cols-2 gap-4">
        <div className="card"><h2 className="font-semibold mb-2">Attendance % by course</h2><BarPct data={summary.courses.map((c) => ({ label: c.code, pct: c.pct }))} /></div>
        <div className="card"><h2 className="font-semibold mb-2">Weekly trend (whole class)</h2><TrendLine data={trend} /><p className="text-xs text-neutral-500 mt-1">Watch for dips around exams / placement weeks.</p></div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-semibold mb-1">Morning vs Afternoon/Evening</h2>
          <p className="text-xs text-neutral-500 mb-2">Does slot timing drive attendance?</p>
          <table><tbody>{drivers.slots.map((s) => (<tr key={s.label}><td>{s.label}</td><td className="text-neutral-500">{s.total} marks</td><td className="text-right font-medium">{s.pct}%</td></tr>))}</tbody></table>
        </div>
        <div className="card">
          <h2 className="font-semibold mb-1">Attendance by professor</h2>
          <div className="max-h-56 overflow-auto"><table><tbody>{drivers.professors.map((p) => (<tr key={p.label}><td>{p.label}</td><td className="text-right font-medium">{p.pct}%</td></tr>))}</tbody></table></div>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-1">Course ↔ Course attendance correlation</h2>
        <p className="text-xs text-neutral-500 mb-3">Pearson r across students who take both. r → +1 = students attend both similarly; r → −1 = they trade off. (min 3 shared students)</p>
        <div className="max-h-72 overflow-auto">
          <table><thead><tr><th>Course A</th><th>Course B</th><th>r</th><th>students</th></tr></thead><tbody>
            {corr.matrix.filter((m) => m.r != null).slice(0, 40).map((m, i) => (
              <tr key={i}><td>{m.a}</td><td>{m.b}</td><td className={"font-semibold " + rColor(m.r)}>{m.r}</td><td className="text-neutral-500">{m.n}</td></tr>
            ))}
            {corr.matrix.filter((m) => m.r != null).length === 0 && <tr><td className="text-neutral-500" colSpan={4}>Not enough overlapping data yet.</td></tr>}
          </tbody></table>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-2">Student ranking (lowest first)</h2>
        <div className="max-h-96 overflow-auto">
          <table><thead><tr><th>Roll</th><th>Name</th><th>Present/Total</th><th className="text-right">%</th></tr></thead><tbody>
            {summary.students.map((s) => (
              <tr key={s.id}><td className="text-neutral-500">{s.studentId}</td><td>{s.name}</td><td className="text-neutral-500">{s.present}/{s.total}</td>
                <td className={"text-right font-semibold " + (s.pct != null && s.pct < 75 ? "text-bad" : s.pct != null && s.pct >= 85 ? "text-good" : "text-warn")}>{s.pct ?? "—"}%</td></tr>
            ))}
          </tbody></table>
        </div>
      </section>
    </div>
  );
}
