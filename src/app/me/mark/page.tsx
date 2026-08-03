import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function markSelf(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.email) throw new Error("unauth");
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student) throw new Error("no student");
  const sessionId = String(formData.get("sessionId"));
  const status = String(formData.get("status")) === "PRESENT" ? "PRESENT" : "ABSENT";
  // guard: student must be enrolled in this session's course
  const ses = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!ses) throw new Error("no session");
  const enrolled = await prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId: student.id, courseId: ses.courseId } } });
  if (!enrolled) throw new Error("not enrolled");
  await prisma.attendance.upsert({
    where: { sessionId_studentId: { sessionId, studentId: student.id } },
    create: { sessionId, studentId: student.id, status, markedBy: "self:" + student.email },
    update: { status, markedBy: "self:" + student.email, markedAt: new Date() },
  });
  revalidatePath("/me/mark");
  revalidatePath("/me");
}

export default async function MarkMe() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const student = await prisma.student.findUnique({ where: { email: session.user.email! } });
  if (!student) return <div className="card">No student record linked to {session.user.email}.</div>;

  const courseIds = (await prisma.enrollment.findMany({ where: { studentId: student.id }, select: { courseId: true } })).map((e) => e.courseId);
  const sessions = await prisma.session.findMany({ where: { courseId: { in: courseIds } }, include: { course: true }, orderBy: [{ date: "asc" }, { slot: "asc" }] });
  const mine = new Map((await prisma.attendance.findMany({ where: { studentId: student.id } })).map((a) => [a.sessionId, a.status]));

  const byDate = new Map<string, typeof sessions>();
  for (const s of sessions) { const k = new Date(s.date).toISOString().slice(0, 10); (byDate.get(k) ?? byDate.set(k, []).get(k)!).push(s); }

  return (
    <div className="space-y-4">
      <div className="card"><h1 className="font-semibold">Mark my attendance</h1>
        <p className="text-neutral-400 text-sm">Your {sessions.length} classes. Tap Present / Absent per session — you can change it anytime.</p></div>
      {[...byDate.entries()].map(([d, list]) => (
        <div key={d} className="card">
          <div className="font-medium mb-2">{new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long" })}</div>
          <table><thead><tr><th>Slot</th><th>Course</th><th className="text-right">Status</th></tr></thead><tbody>
            {list.map((s) => {
              const st = mine.get(s.id);
              return (
                <tr key={s.id}>
                  <td className="whitespace-nowrap">{s.slot}</td>
                  <td>{s.course.code} · {s.course.name}</td>
                  <td className="text-right">
                    <div className="inline-flex gap-1 items-center">
                      {st && <span className={"pill mr-1 " + (st === "PRESENT" ? "border-good/50 text-good" : "border-bad/50 text-bad")}>{st}</span>}
                      <form action={markSelf} className="inline"><input type="hidden" name="sessionId" value={s.id} /><input type="hidden" name="status" value="PRESENT" /><button className="btn" title="Present">✓</button></form>
                      <form action={markSelf} className="inline"><input type="hidden" name="sessionId" value={s.id} /><input type="hidden" name="status" value="ABSENT" /><button className="btn" title="Absent">✕</button></form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody></table>
        </div>
      ))}
    </div>
  );
}
