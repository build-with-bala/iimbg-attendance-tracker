import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { compareStudents } from "@/lib/insights";

export const dynamic = "force-dynamic";

export default async function Compare({ searchParams }: { searchParams: { a?: string; b?: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const students = await prisma.student.findMany({ orderBy: { studentId: "asc" }, select: { id: true, name: true, studentId: true } });
  const cmp = searchParams.a && searchParams.b && searchParams.a !== searchParams.b ? await compareStudents(searchParams.a, searchParams.b) : null;

  return (
    <div className="space-y-4">
      <form className="card flex flex-wrap items-end gap-3" method="GET">
        <label className="text-sm">Student A
          <select name="a" defaultValue={searchParams.a} className="block bg-ink border border-line rounded-lg px-3 py-1.5 text-sm min-w-64 mt-1">
            <option value="">— pick —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.studentId} — {s.name}</option>)}
          </select>
        </label>
        <span className="pb-2 text-neutral-500">vs</span>
        <label className="text-sm">Student B
          <select name="b" defaultValue={searchParams.b} className="block bg-ink border border-line rounded-lg px-3 py-1.5 text-sm min-w-64 mt-1">
            <option value="">— pick —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.studentId} — {s.name}</option>)}
          </select>
        </label>
        <button className="btn btn-accent">Compare</button>
      </form>

      {!cmp && <div className="card text-neutral-500 text-sm">Pick two different students to see their subject overlap, unique choices, and attendance differences.</div>}

      {cmp && (
        <>
          <div className="card">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-semibold">{cmp.a.name} <span className="text-neutral-500">vs</span> {cmp.b.name}</div>
                <div className="text-neutral-500 text-sm">{cmp.a.studentId} · {cmp.b.studentId}</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-accent">{cmp.jaccard}%</div>
                <div className="text-xs text-neutral-500">subject similarity ({cmp.sharedCount}/{cmp.unionCount} shared)</div>
              </div>
              <div className="text-right">
                <div className="text-sm">Overall attendance</div>
                <div className="font-semibold">{cmp.overallA ?? "—"}% <span className="text-neutral-500">vs</span> {cmp.overallB ?? "—"}%</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-2">Shared subjects ({cmp.shared.length}) — attendance side by side</h2>
            <table><thead><tr><th>T</th><th>Code</th><th>Course</th><th className="text-right">A%</th><th className="text-right">B%</th><th className="text-right">Δ</th></tr></thead><tbody>
              {cmp.shared.map((c) => (
                <tr key={c.code}><td className="text-neutral-500">{c.term}</td><td className="text-neutral-500">{c.code}</td><td>{c.name}</td>
                  <td className="text-right">{c.pa ?? "—"}{c.pa != null ? "%" : ""}</td><td className="text-right">{c.pb ?? "—"}{c.pb != null ? "%" : ""}</td>
                  <td className={"text-right font-medium " + (c.diff == null ? "text-neutral-600" : c.diff < 0 ? "text-bad" : c.diff > 0 ? "text-good" : "")}>{c.diff != null ? (c.diff > 0 ? "+" : "") + c.diff : "—"}</td></tr>
              ))}
              {cmp.shared.length === 0 && <tr><td colSpan={6} className="text-neutral-500">No subjects in common.</td></tr>}
            </tbody></table>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card"><h2 className="font-semibold mb-2">Only {cmp.a.name} ({cmp.onlyA.length})</h2>
              <table><tbody>{cmp.onlyA.map((c) => <tr key={c.code}><td className="text-neutral-500">T{c.term}</td><td>{c.code}</td><td>{c.name}</td></tr>)}{cmp.onlyA.length === 0 && <tr><td className="text-neutral-500">—</td></tr>}</tbody></table>
            </div>
            <div className="card"><h2 className="font-semibold mb-2">Only {cmp.b.name} ({cmp.onlyB.length})</h2>
              <table><tbody>{cmp.onlyB.map((c) => <tr key={c.code}><td className="text-neutral-500">T{c.term}</td><td>{c.code}</td><td>{c.name}</td></tr>)}{cmp.onlyB.length === 0 && <tr><td className="text-neutral-500">—</td></tr>}</tbody></table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
