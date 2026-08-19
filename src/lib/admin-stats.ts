import { prisma } from "./prisma";
import { isPresent, isOD } from "./status";
import { todayKey, sessionKey } from "./dates";
import { effectiveSessionTotals } from "./insights";
import { POLICY, gradeStatus } from "./grades";

const pct = (p: number, t: number) => (t === 0 ? null : Math.round((p / t) * 1000) / 10);

/** One pass over a programme's attendance, reused by every console page. */
export async function consoleFacts(program: string) {
  const [courses, students, sessions, enrollments, attendance] = await Promise.all([
    prisma.course.findMany({ where: { program }, orderBy: [{ term: "asc" }, { code: "asc" }] }),
    prisma.student.findMany({ where: { program }, orderBy: { studentId: "asc" } }),
    prisma.session.findMany({ where: { course: { program } }, include: { course: true }, orderBy: [{ date: "asc" }, { slot: "asc" }] }),
    prisma.enrollment.findMany({ where: { course: { program } } }),
    prisma.attendance.findMany({
      where: { session: { course: { program } } },
      include: { session: { select: { id: true, courseId: true, date: true, slot: true, professor: true } } },
    }),
  ]);
  return { courses, students, sessions, enrollments, attendance };
}

export type StudentRow = {
  id: string; studentId: string; name: string; email: string;
  present: number; od: number; held: number; total: number;
  pct: number | null; projected: number | null; subjects: number;
  status: ReturnType<typeof gradeStatus>;
};

/** Per-student standing across the whole programme. */
export async function studentStandings(program: string): Promise<StudentRow[]> {
  const { students, enrollments, attendance } = await consoleFacts(program);
  const totals = await effectiveSessionTotals([...new Set(enrollments.map((e) => e.courseId))]);

  const subjCount = new Map<string, number>();
  const termTotal = new Map<string, number>();
  for (const e of enrollments) {
    subjCount.set(e.studentId, (subjCount.get(e.studentId) ?? 0) + 1);
    termTotal.set(e.studentId, (termTotal.get(e.studentId) ?? 0) + (totals.get(e.courseId) ?? 0));
  }

  const acc = new Map<string, { p: number; o: number; h: number }>();
  for (const a of attendance) {
    const v = acc.get(a.studentId) ?? { p: 0, o: 0, h: 0 };
    v.h += 1;
    if (isPresent(a.status)) v.p += 1;
    if (isOD(a.status)) v.o += 1;
    acc.set(a.studentId, v);
  }

  return students
    .map((s) => {
      const v = acc.get(s.id) ?? { p: 0, o: 0, h: 0 };
      const total = termTotal.get(s.id) ?? 0;
      const remaining = Math.max(0, total - v.h);
      const projected = total > 0 ? Math.round(((v.p + remaining) / total) * 1000) / 10 : null;
      return {
        id: s.id, studentId: s.studentId, name: s.name, email: s.email,
        present: v.p, od: v.o, held: v.h, total,
        pct: pct(v.p, v.h), projected,
        subjects: subjCount.get(s.id) ?? 0,
        status: gradeStatus(projected),
      };
    })
    .sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101));
}

/** Per-course attendance, demand and marking coverage. */
export async function courseStandings(program: string) {
  const { courses, sessions, enrollments, attendance } = await consoleFacts(program);
  const totals = await effectiveSessionTotals(courses.map((c) => c.id));

  const opted = new Map<string, number>();
  for (const e of enrollments) opted.set(e.courseId, (opted.get(e.courseId) ?? 0) + 1);

  const acc = new Map<string, { p: number; o: number; h: number }>();
  const markedSessions = new Set<string>();
  for (const a of attendance) {
    const cid = a.session.courseId;
    const v = acc.get(cid) ?? { p: 0, o: 0, h: 0 };
    v.h += 1;
    if (isPresent(a.status)) v.p += 1;
    if (isOD(a.status)) v.o += 1;
    acc.set(cid, v);
    markedSessions.add(a.session.id);
  }

  const sessionCount = new Map<string, number>();
  const markedCount = new Map<string, number>();
  for (const s of sessions) {
    sessionCount.set(s.courseId, (sessionCount.get(s.courseId) ?? 0) + 1);
    if (markedSessions.has(s.id)) markedCount.set(s.courseId, (markedCount.get(s.courseId) ?? 0) + 1);
  }

  return courses
    .map((c) => {
      const v = acc.get(c.id) ?? { p: 0, o: 0, h: 0 };
      return {
        id: c.id, code: c.code, name: c.name, term: c.term, credits: c.credits,
        opted: opted.get(c.id) ?? 0,
        sessions: sessionCount.get(c.id) ?? 0,
        effective: totals.get(c.id) ?? 0,
        marked: markedCount.get(c.id) ?? 0,
        present: v.p, od: v.o, held: v.h,
        pct: pct(v.p, v.h),
      };
    })
    .sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101));
}

/** Headline numbers for the Overview page. */
export async function consoleOverview(program: string) {
  const [{ courses, students, sessions, enrollments, attendance }, rows] = await Promise.all([
    consoleFacts(program),
    studentStandings(program),
  ]);

  let present = 0, od = 0;
  const marked = new Set<string>();
  for (const a of attendance) {
    if (isPresent(a.status)) present += 1;
    if (isOD(a.status)) od += 1;
    marked.add(a.session.id);
  }

  const today = todayKey();
  const held = sessions.filter((s) => sessionKey(s.date) <= today);
  const todays = sessions.filter((s) => sessionKey(s.date) === today);
  const graded = rows.filter((r) => r.projected != null);

  return {
    students: students.length,
    courses: courses.length,
    enrollments: enrollments.length,
    sessions: sessions.length,
    sessionsHeld: held.length,
    sessionsMarked: held.filter((s) => marked.has(s.id)).length,
    todaySessions: todays.length,
    todayMarked: todays.filter((s) => marked.has(s.id)).length,
    marks: attendance.length,
    present, od,
    overallPct: pct(present, attendance.length),
    atRisk: graded.filter((r) => (r.projected ?? 100) < POLICY.safe).length,
    failing: graded.filter((r) => (r.projected ?? 100) < POLICY.drop2).length,
    safe: graded.filter((r) => (r.projected ?? 0) >= POLICY.safe).length,
    unmarkedStudents: rows.filter((r) => r.held === 0).length,
    worst: rows.filter((r) => r.pct != null).slice(0, 8),
  };
}

/** Marking coverage per session — what the committee still has to chase. */
export async function sessionCoverage(program: string) {
  const { sessions, attendance, enrollments } = await consoleFacts(program);
  const enrolledPer = new Map<string, number>();
  for (const e of enrollments) enrolledPer.set(e.courseId, (enrolledPer.get(e.courseId) ?? 0) + 1);

  const acc = new Map<string, { n: number; p: number }>();
  for (const a of attendance) {
    const v = acc.get(a.session.id) ?? { n: 0, p: 0 };
    v.n += 1;
    if (isPresent(a.status)) v.p += 1;
    acc.set(a.session.id, v);
  }

  const today = todayKey();
  return sessions.map((s) => {
    const v = acc.get(s.id) ?? { n: 0, p: 0 };
    return {
      id: s.id, date: sessionKey(s.date), slot: s.slot, section: s.section,
      course: s.course.name, courseId: s.courseId, professor: s.professor,
      enrolled: enrolledPer.get(s.courseId) ?? 0,
      marks: v.n, pct: pct(v.p, v.n),
      past: sessionKey(s.date) <= today,
    };
  });
}
