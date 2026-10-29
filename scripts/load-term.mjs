// ADDITIVE term loader, run INSIDE the app container (its own DATABASE_URL + prisma client):
//   node load-term.mjs /tmp/dbm-term5.json            # plan only — prints what would be created
//   node load-term.mjs /tmp/dbm-term5.json --apply    # create it
//
// Unlike load-payload.mjs this never deletes anything: earlier terms, their
// sessions and every attendance mark stay exactly as they are. It only adds
// the payload's courses, any students the tracker has not seen, the
// enrollments for those courses, and their sessions. Re-running is a no-op.
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const { program, term, courses, students, sels, sessions } = JSON.parse(readFileSync(process.argv[2], "utf8"));
if (!program || !term || !courses?.length) throw new Error("payload needs program, term, courses");

async function main() {
  // ---- guards: a code or email already used by ANOTHER programme means the payload is wrong
  const codes = courses.map((c) => c.code);
  const clash = await prisma.course.findMany({ where: { code: { in: codes }, NOT: { program } }, select: { code: true, program: true } });
  if (clash.length) throw new Error("course code(s) belong to another programme: " + JSON.stringify(clash));
  const emails = students.map((s) => s.email.toLowerCase());
  const eclash = await prisma.student.findMany({ where: { email: { in: emails }, NOT: { program } }, select: { email: true, program: true } });
  if (eclash.length) throw new Error("student email(s) belong to another programme: " + JSON.stringify(eclash));

  // ---- courses
  const haveCourses = new Map((await prisma.course.findMany({ where: { code: { in: codes } } })).map((c) => [c.code, c]));
  const newCourses = courses.filter((c) => !haveCourses.has(c.code));
  const changedCourses = courses.filter((c) => haveCourses.has(c.code) && (haveCourses.get(c.code).term !== term || haveCourses.get(c.code).name !== c.name.trim()));

  // ---- students: match by email, then by registration number; create the rest
  const byEmail = new Map((await prisma.student.findMany({ where: { email: { in: emails } } })).map((s) => [s.email.toLowerCase(), s]));
  const byReg = new Map((await prisma.student.findMany({ where: { studentId: { in: students.map((s) => s.student_id) } } })).map((s) => [s.studentId, s]));
  const newStudents = [], mismatched = [];
  for (const s of students) {
    const e = byEmail.get(s.email.toLowerCase()), r = byReg.get(s.student_id);
    if (e && r && e.id !== r.id) mismatched.push(`${s.student_id} ${s.email}: email → ${e.studentId}, reg → ${r.email}`);
    else if (!e && !r) newStudents.push(s);
    else if (e && !r && e.studentId !== s.student_id) mismatched.push(`${s.email}: tracker has reg ${e.studentId}, payload says ${s.student_id}`);
  }
  if (mismatched.length) throw new Error("student identity mismatches — resolve by hand first:\n  " + mismatched.join("\n  "));

  console.log(`${program} term ${term}: payload has ${courses.length} courses, ${students.length} students, ${sels.length} selections, ${sessions.length} sessions`);
  console.log(`  courses to create: ${newCourses.length}${newCourses.length ? "  (" + newCourses.map((c) => c.code).join(", ") + ")" : ""}`);
  if (changedCourses.length) console.log(`  courses that already exist with a different term/name (left untouched): ${changedCourses.map((c) => c.code).join(", ")}`);
  console.log(`  students to create: ${newStudents.length}${newStudents.length ? "  (" + newStudents.map((s) => s.student_id).join(", ") + ")" : ""}`);
  console.log(`  students already known: ${students.length - newStudents.length}`);

  if (!APPLY) {
    // enrollment / session deltas can only be sized exactly once the ids exist; estimate from what is there
    const courseIds = [...haveCourses.values()].map((c) => c.id);
    const haveEnr = courseIds.length ? await prisma.enrollment.count({ where: { courseId: { in: courseIds } } }) : 0;
    const haveSes = courseIds.length ? await prisma.session.count({ where: { courseId: { in: courseIds } } }) : 0;
    console.log(`  enrollments already present for these courses: ${haveEnr} of ${sels.length} wanted`);
    console.log(`  sessions already present for these courses: ${haveSes} of ${sessions.length} wanted`);
    console.log("\nPLAN ONLY — nothing written. Re-run with --apply to create the missing rows.");
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const courseId = new Map([...haveCourses.values()].map((c) => [c.code, c.id]));
    for (const c of newCourses) {
      const rec = await tx.course.create({ data: { code: c.code, name: c.name.trim(), credits: Number(c.credits) || 0, term, program } });
      courseId.set(c.code, rec.id);
    }
    const studentId = new Map();
    for (const s of students) {
      const known = byEmail.get(s.email.toLowerCase()) || byReg.get(s.student_id);
      if (known) { studentId.set(s.student_id, known.id); continue; }
      const rec = await tx.student.create({ data: { studentId: s.student_id, name: s.name, email: s.email.toLowerCase(), program, batch: s.student_id.split("/").pop() } });
      studentId.set(s.student_id, rec.id);
    }
    const enrRows = sels.filter((e) => studentId.has(e.student_id) && courseId.has(e.code)).map((e) => ({ studentId: studentId.get(e.student_id), courseId: courseId.get(e.code) }));
    const enr = await tx.enrollment.createMany({ data: enrRows, skipDuplicates: true });
    const sesRows = sessions.filter((s) => courseId.has(s.code)).map((s) => ({ courseId: courseId.get(s.code), date: new Date(s.date), slot: s.slot, section: s.section ?? "", professor: s.professor ?? null }));
    const ses = await tx.session.createMany({ data: sesRows, skipDuplicates: true });
    return { courses: newCourses.length, students: newStudents.length, enrollments: enr.count, sessions: ses.count, courseIds: [...courseId.values()] };
  }, { timeout: 120_000 });

  console.log(`\nCREATED: ${result.courses} courses, ${result.students} students, ${result.enrollments} enrollments, ${result.sessions} sessions`);
  const rows = await prisma.enrollment.groupBy({ by: ["studentId"], where: { courseId: { in: result.courseIds } }, _count: true });
  const hist = new Map();
  for (const r of rows) hist.set(r._count, (hist.get(r._count) ?? 0) + 1);
  console.log(`term ${term} subjects/student: ${[...hist.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}sub×${v}`).join("  ")}`);
  const totals = await prisma.$queryRawUnsafe(`SELECT c.term, count(DISTINCT c.id)::int AS courses, count(DISTINCT s.id)::int AS sessions, count(a.id)::int AS marks
    FROM "Course" c LEFT JOIN "Session" s ON s."courseId" = c.id LEFT JOIN "Attendance" a ON a."sessionId" = s.id WHERE c.program = $1 GROUP BY c.term ORDER BY c.term`, program);
  console.log(`${program} now:`, totals.map((t) => `term ${t.term}: ${t.courses} courses, ${t.sessions} sessions, ${t.marks} marks`).join(" | "));
}

main().catch((e) => { console.error(e.message || e); process.exit(1); }).finally(() => prisma.$disconnect());
