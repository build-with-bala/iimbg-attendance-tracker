import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { allClasses } from "@/lib/insights";

export const dynamic = "force-dynamic";

export default async function Classes() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sessions = await allClasses();

  // group by date
  const byDate = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const k = new Date(s.date).toISOString().slice(0, 10);
    (byDate.get(k) ?? byDate.set(k, []).get(k)!).push(s);
  }

  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between">
        <div><h1 className="font-semibold">All classes</h1><p className="text-neutral-400 text-sm">{sessions.length} scheduled sessions across {new Set(sessions.map((s) => s.courseId)).size} courses.</p></div>
      </div>
      {[...byDate.entries()].map(([d, list]) => (
        <div key={d} className="card">
          <div className="font-medium mb-2">{new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long" })}</div>
          <table><thead><tr><th>Slot</th><th>Course</th><th>Professor</th><th className="text-right">Marked</th></tr></thead><tbody>
            {list.sort((a, b) => a.slot.localeCompare(b.slot)).map((s) => (
              <tr key={s.id}>
                <td className="whitespace-nowrap">{s.slot}</td>
                <td><Link href={"/subjects?course=" + s.courseId}>{s.course.code}</Link> · {s.course.name}</td>
                <td className="text-neutral-500">{s.professor || "—"}</td>
                <td className="text-right">{s._count.attendance > 0 ? <span className="pill border-good/50 text-good">{s._count.attendance}</span> : <span className="text-neutral-600">—</span>}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
      ))}
    </div>
  );
}
