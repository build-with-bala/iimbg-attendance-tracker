import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { coursePopularity, courseRoster } from "@/lib/insights";

export const dynamic = "force-dynamic";

export default async function Subjects({ searchParams }: { searchParams: { course?: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const pop = await coursePopularity();
  const roster = searchParams.course ? await courseRoster(searchParams.course) : null;
  const maxOpted = Math.max(1, ...pop.map((p) => p.opted));

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="card md:col-span-2">
        <h1 className="font-semibold mb-1">Subject popularity</h1>
        <p className="text-neutral-400 text-sm mb-3">How many students opted each elective. Click a row to see who.</p>
        <table><thead><tr><th>Code</th><th>Course</th><th>T</th><th>Opted</th><th></th></tr></thead><tbody>
          {pop.map((c) => (
            <tr key={c.id} className={searchParams.course === c.id ? "bg-line/40" : ""}>
              <td className="text-neutral-500">{c.code}</td>
              <td><Link href={"/subjects?course=" + c.id}>{c.name}</Link></td>
              <td className="text-neutral-500">{c.term}</td>
              <td className="w-40">
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded bg-accent" style={{ width: `${(c.opted / maxOpted) * 100}%`, minWidth: 4 }} />
                  <span className="text-xs">{c.opted} <span className="text-neutral-500">({c.share}%)</span></span>
                </div>
              </td>
              <td className="text-neutral-600 text-xs">{c.sessions} cls</td>
            </tr>
          ))}
        </tbody></table>
      </div>

      <div className="card">
        {roster?.course ? (
          <>
            <h2 className="font-semibold">{roster.course.code} · {roster.course.name}</h2>
            <p className="text-neutral-400 text-sm mb-3">{roster.students.length} students opted</p>
            <div className="max-h-[70vh] overflow-auto"><table><tbody>
              {roster.students.map((s) => (<tr key={s.id}><td className="text-neutral-500">{s.studentId}</td><td>{s.name}</td></tr>))}
            </tbody></table></div>
          </>
        ) : <p className="text-neutral-500 text-sm">Select a subject to list the students who opted it.</p>}
      </div>
    </div>
  );
}
