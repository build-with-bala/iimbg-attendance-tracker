// Additive per-programme loader, run INSIDE the app container
// (uses the container's own DATABASE_URL + prisma client):
//   node _load-payload.mjs /tmp/mba.json
// Replaces ONLY the payload's programme via cascade; guards against collisions.
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const { program, term, courses, students, sels, sessions } = JSON.parse(readFileSync(process.argv[2], "utf8"));

async function main() {
  const codeClash = await prisma.course.findMany({
    where: { code: { in: courses.map((c) => c.code) }, NOT: { program } },
    select: { code: true, program: true },
  });
  if (codeClash.length) { console.error("ABORT: course code(s) under another programme:", codeClash); process.exit(1); }
  const emailClash = await prisma.student.findMany({
    where: { email: { in: students.map((s) => s.email.toLowerCase()) }, NOT: { program } },
    select: { email: true, program: true },
  });
  if (emailClash.length) { console.error("ABORT: student email(s) under another programme:", emailClash); process.exit(1); }

  const delS = await prisma.student.deleteMany({ where: { program } });
  const delC = await prisma.course.deleteMany({ where: { program } });
  console.log(`Cleared ${program}: ${delS.count} students, ${delC.count} courses (cascaded)`);

  const courseId = new Map();
  for (const c of courses) {
    const rec = await prisma.course.create({ data: { code: c.code, name: c.name.trim(), credits: Number(c.credits) || 0, term, program } });
    courseId.set(c.code, rec.id);
  }
  const studentId = new Map();
  for (const s of students) {
    const rec = await prisma.student.create({ data: { studentId: s.student_id, name: s.name, email: s.email.toLowerCase(), program, batch: s.student_id.split("/").pop() } });
    studentId.set(s.student_id, rec.id);
  }
  let enr = 0;
  for (const e of sels) {
    if (!studentId.has(e.student_id) || !courseId.has(e.code)) continue;
    await prisma.enrollment.create({ data: { studentId: studentId.get(e.student_id), courseId: courseId.get(e.code) } }).then(() => enr++).catch(() => {});
  }
  let ses = 0;
  for (const s of sessions) {
    if (!courseId.has(s.code)) continue;
    await prisma.session.create({ data: { courseId: courseId.get(s.code), date: new Date(s.date), slot: s.slot, professor: s.professor } }).then(() => ses++).catch(() => {});
  }
  console.log(`Seeded ${program}: ${courseId.size} courses, ${studentId.size} students, ${enr} enrollments, ${ses} sessions`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
