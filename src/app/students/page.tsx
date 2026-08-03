import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { studentDirectory } from "@/lib/insights";

export const dynamic = "force-dynamic";

export default async function Students() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const students = await studentDirectory();

  return (
    <div className="card">
      <h1 className="font-semibold mb-1">Students ({students.length})</h1>
      <p className="text-neutral-400 text-sm mb-3">Pick anyone to compare their subject choices & attendance.</p>
      <div className="max-h-[75vh] overflow-auto">
        <table><thead><tr><th>Roll</th><th>Name</th><th>Subjects</th><th></th></tr></thead><tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td className="text-neutral-500">{s.studentId}</td>
              <td>{s.name}</td>
              <td className="text-neutral-500">{s._count.enrollments}</td>
              <td className="text-right"><Link href={"/compare?a=" + s.id} className="text-xs">compare →</Link></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}
