"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/viewer";
import { revalidatePath } from "next/cache";
import { normalizeStatus } from "@/lib/status";

// Student marks their own attendance for one session (must be enrolled).
export async function markSelf(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) throw new Error("unauth");
  const student = await prisma.student.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!student) throw new Error("no student");
  const sessionId = String(formData.get("sessionId"));
  const status = normalizeStatus(formData.get("status"));
  const ses = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!ses) throw new Error("no session");
  const enrolled = await prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId: student.id, courseId: ses.courseId } } });
  if (!enrolled) throw new Error("not enrolled");
  await prisma.attendance.upsert({
    where: { sessionId_studentId: { sessionId, studentId: student.id } },
    create: { sessionId, studentId: student.id, status, markedBy: "self:" + student.email },
    update: { status, markedBy: "self:" + student.email, markedAt: new Date() },
  });
  revalidatePath("/student");
}

// Student picks their section for each multi-section elective (onboarding).
// Fields: sec_<courseId> = "A" | "B" | … — validated against that course's
// actual session sections; only the signed-in student's own enrollments move.
export async function saveSections(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) throw new Error("unauth");
  const student = await prisma.student.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!student) throw new Error("no student");
  const enrollments = await prisma.enrollment.findMany({ where: { studentId: student.id }, select: { id: true, courseId: true } });
  const byCourse = new Map(enrollments.map((e) => [e.courseId, e.id]));
  const updates: { id: string; section: string }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("sec_")) continue;
    const courseId = key.slice(4);
    const enrId = byCourse.get(courseId);
    if (!enrId) continue;
    const section = String(value).trim().toUpperCase();
    const valid = await prisma.session.findFirst({ where: { courseId, section }, select: { id: true } });
    if (!valid) continue;
    updates.push({ id: enrId, section });
  }
  await prisma.$transaction(updates.map((u) => prisma.enrollment.update({ where: { id: u.id }, data: { section: u.section } })));
  revalidatePath("/student");
}

// Admin marks a whole roster for a session.
export async function saveRoster(formData: FormData) {
  // requireAdmin, not the JWT role: the JWT only knows ADMIN_EMAILS, so a
  // colleague granted access on the Access page would be refused here.
  const email = (await requireAdmin()).email;
  const sessionId = String(formData.get("sessionId"));
  const ses = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!ses) throw new Error("no session");
  const enrolled = await prisma.enrollment.findMany({ where: { courseId: ses.courseId } });
  await prisma.$transaction(enrolled.map((e) => {
    const status = normalizeStatus(formData.get("s_" + e.studentId));
    return prisma.attendance.upsert({
      where: { sessionId_studentId: { sessionId, studentId: e.studentId } },
      create: { sessionId, studentId: e.studentId, status, markedBy: email },
      update: { status, markedBy: email, markedAt: new Date() },
    });
  }));
  // marking now lives in the console, and the numbers it feeds are read there
  revalidatePath("/admin", "layout");
  revalidatePath("/cohort");
}
