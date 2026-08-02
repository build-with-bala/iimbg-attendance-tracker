import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function saveAttendance(formData: FormData) {
  "use server";
  const session = await auth();
  const email = session?.user?.email;
  if ((session?.user as any)?.role !== "admin") throw new Error("forbidden");
  const sessionId = String(formData.get("sessionId"));
  const ses = await prisma.session.findUnique({ include: { course: true }, where: { id: sessionId } });
  if (!ses) throw new Error("no session");
  const enrolled = await prisma.enrollment.findMany({ where: { courseId: ses.courseId } });
  const ops = enrolled.map((e) => {
    const status = formData.get("s_" + e.studentId) === "on" ? "PRESENT" : "ABSENT";
    return prisma.attendance.upsert({
      where: { sessionId_studentId: { sessionId, studentId: e.studentId } },
      create: { sessionId, studentId: e.studentId, status, markedBy: email || "admin" },
      update: { status, markedBy: email || "admin", markedAt: new Date() },
    });
  });
  await prisma.$transaction(ops);
  revalidatePath("/admin");
  redirect("/admin/mark?sessionId=" + sessionId + "&saved=1");
}

export default async function Mark({ searchParams }: { searchParams: { sessionId?: string; saved?: string } }) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") redirect("/login");

  const sid = searchParams.sessionId;
  if (!sid) {
    const sessions = await prisma.session.findMany({
      include: { course: true, _count: { select: { attendance: true } } },
      orderBy: [{ date: "asc" }, { slot: "asc" }],
    });
    return (
      <div className="card">
        <h1 className="font-semibold mb-3">Pick a session to mark ({sessions.length})</h1>
        <div className="max-h-[70vh] overflow-auto">
          <table><thead><tr><th>Date</th><th>Slot</th><th>Course</th><th>Prof</th><th>Marked</th></tr></thead><tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.date).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}</td>
                <td>{s.slot}</td>
                <td><Link href={"/admin/mark?sessionId=" + s.id}>{s.course.code} · {s.course.name}</Link></td>
                <td className="text-neutral-500">{s.professor || "—"}</td>
                <td>{s._count.attendance > 0 ? <span className="pill border-good/50 text-good">{s._count.attendance}</span> : <span className="pill border-line text-neutral-500">—</span>}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>
    );
  }

  const ses = await prisma.session.findUnique({ where: { id: sid }, include: { course: true } });
  if (!ses) return <div className="card">Session not found. <Link href="/admin/mark">Back</Link></div>;
  const enrolled = await prisma.enrollment.findMany({
    where: { courseId: ses.courseId },
    include: { student: true },
    orderBy: { student: { studentId: "asc" } },
  });
  const existing = new Map((await prisma.attendance.findMany({ where: { sessionId: sid } })).map((a) => [a.studentId, a.status]));
  const firstTime = existing.size === 0;

  return (
    <form action={saveAttendance} className="card">
      <input type="hidden" name="sessionId" value={sid} />
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-semibold">{ses.course.code} · {ses.course.name}</h1>
        <Link href="/admin/mark" className="text-xs">← all sessions</Link>
      </div>
      <p className="text-neutral-400 text-sm mb-4">{new Date(ses.date).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long" })} · {ses.slot} · {ses.professor || "—"} · {enrolled.length} enrolled</p>
      {searchParams.saved && <div className="pill border-good/50 text-good mb-3 inline-block">✓ Saved</div>}
      <div className="max-h-[60vh] overflow-auto mb-4">
        <table><thead><tr><th>Roll</th><th>Name</th><th className="text-right">Present</th></tr></thead><tbody>
          {enrolled.map((e) => {
            const on = firstTime ? true : existing.get(e.studentId) === "PRESENT";
            return (
              <tr key={e.studentId}>
                <td className="text-neutral-500">{e.student.studentId}</td>
                <td>{e.student.name}</td>
                <td className="text-right"><input type="checkbox" name={"s_" + e.studentId} defaultChecked={on} className="w-4 h-4 accent-[#2ecc71]" /></td>
              </tr>
            );
          })}
        </tbody></table>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-accent">Save attendance</button>
        <span className="text-xs text-neutral-500">Unchecked = absent. Defaults to all-present on a fresh session.</span>
      </div>
    </form>
  );
}
