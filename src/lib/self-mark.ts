import { prisma } from "@/lib/prisma";
import type { AttStatus } from "@/lib/status";

export class MarkError extends Error {}

// A student marks their own attendance for one session they're enrolled in.
// Shared by the web action (cookie session) and the app (bearer token) — kept
// out of actions.ts because every export of a "use server" file is callable
// from the browser, and this one trusts its email argument.
export async function markOwnAttendance(email: string, sessionId: string, status: AttStatus) {
  const student = await prisma.student.findUnique({ where: { email: email.toLowerCase() } });
  if (!student) throw new MarkError("no student");
  const ses = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!ses) throw new MarkError("no session");
  const enrolled = await prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId: student.id, courseId: ses.courseId } } });
  if (!enrolled) throw new MarkError("not enrolled");
  await prisma.attendance.upsert({
    where: { sessionId_studentId: { sessionId, studentId: student.id } },
    create: { sessionId, studentId: student.id, status, markedBy: "self:" + student.email },
    update: { status, markedBy: "self:" + student.email, markedAt: new Date() },
  });
}
