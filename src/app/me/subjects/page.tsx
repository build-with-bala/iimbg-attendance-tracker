import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { mySubjects } from "@/lib/insights";

export const dynamic = "force-dynamic";

export default async function MySubjects() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const student = await prisma.student.findUnique({ where: { email: session.user.email! } });
  if (!student) return <div className="card">No student record linked to {session.user.email}.</div>;

  const subs = await mySubjects(student.id);
  const byTerm = new Map<number, typeof subs>();
  for (const s of subs) (byTerm.get(s.term) ?? byTerm.set(s.term, []).get(s.term)!).push(s);

  return (
    <div className="space-y-4">
      <div className="card"><h1 className="font-semibold">{student.name} — my {subs.length} subjects</h1>
        <p className="text-neutral-400 text-sm">For each subject you opted, here's how many students in total opted it (popularity) and how many classes it has.</p></div>
      {[...byTerm.entries()].sort().map(([t, list]) => (
        <div key={t} className="card">
          <h2 className="font-semibold mb-2">Term {t}</h2>
          <table><thead><tr><th>Code</th><th>Course</th><th>Credits</th><th>Peers opted</th><th>Classes</th><th></th></tr></thead><tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td className="text-neutral-500">{c.code}</td>
                <td>{c.name}</td>
                <td className="text-neutral-500">{c.credits}</td>
                <td><span className="font-medium">{c.opted}</span> <span className="text-neutral-500 text-xs">({c.share}% of class)</span></td>
                <td className="text-neutral-500">{c.sessions}</td>
                <td className="text-right text-xs"><Link href={"/subjects?course=" + c.id}>who else →</Link></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      ))}
    </div>
  );
}
