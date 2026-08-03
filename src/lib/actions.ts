"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Student marks their own attendance for one session (must be enrolled).
export async function markSelf(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) throw new Error("unauth");
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student) throw new Error("no student");
  const sessionId = String(formData.get("sessionId"));
  const status = String(formData.get("status")) === "PRESENT" ? "PRESENT" : "ABSENT";
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

// Admin marks a whole roster for a session.
export async function saveRoster(formData: FormData) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") throw new Error("forbidden");
  const email = session!.user!.email!;
  const sessionId = String(formData.get("sessionId"));
  const ses = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!ses) throw new Error("no session");
  const enrolled = await prisma.enrollment.findMany({ where: { courseId: ses.courseId } });
  await prisma.$transaction(enrolled.map((e) => {
    const status = formData.get("s_" + e.studentId) === "on" ? "PRESENT" : "ABSENT";
    return prisma.attendance.upsert({
      where: { sessionId_studentId: { sessionId, studentId: e.studentId } },
      create: { sessionId, studentId: e.studentId, status, markedBy: email },
      update: { status, markedBy: email, markedAt: new Date() },
    });
  }));
  revalidatePath("/cohort");
}
