import { prisma } from "./prisma";
import { isPresent } from "./status";

export type Row = { sessionId: string; studentId: string; status: string };

// Pull all attendance joined with session/course context once, reuse for all stats.
export async function loadFacts() {
  const attendance = await prisma.attendance.findMany({
    include: { session: { include: { course: true } }, student: true },
  });
  const sessions = await prisma.session.findMany({ include: { course: true } });
  const enrollments = await prisma.enrollment.findMany({
    include: { student: true, course: true },
  });
  return { attendance, sessions, enrollments };
}

function pct(present: number, total: number) {
  return total === 0 ? null : Math.round((present / total) * 1000) / 10;
}

// ---- Attendance % : per student, per course, per term ----
export async function attendanceSummary() {
  const { attendance } = await loadFacts();
  const byStudent = new Map<string, { name: string; sid: string; p: number; t: number }>();
  const byCourse = new Map<string, { code: string; name: string; term: number; p: number; t: number }>();
  const byStudentCourse = new Map<string, { p: number; t: number }>();

  for (const a of attendance) {
    const present = isPresent(a.status) ? 1 : 0;
    const s = byStudent.get(a.studentId) ?? { name: a.student.name, sid: a.student.studentId, p: 0, t: 0 };
    s.p += present; s.t += 1; byStudent.set(a.studentId, s);

    const c = byCourse.get(a.session.courseId) ?? { code: a.session.course.code, name: a.session.course.name, term: a.session.course.term, p: 0, t: 0 };
    c.p += present; c.t += 1; byCourse.set(a.session.courseId, c);

    const k = a.studentId + "|" + a.session.courseId;
    const sc = byStudentCourse.get(k) ?? { p: 0, t: 0 };
    sc.p += present; sc.t += 1; byStudentCourse.set(k, sc);
  }

  return {
    students: [...byStudent.entries()].map(([id, v]) => ({ id, name: v.name, studentId: v.sid, present: v.p, total: v.t, pct: pct(v.p, v.t) })).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0)),
    courses: [...byCourse.entries()].map(([id, v]) => ({ id, code: v.code, name: v.name, term: v.term, present: v.p, total: v.t, pct: pct(v.p, v.t) })).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0)),
    studentCourse: byStudentCourse,
  };
}

// ---- Pearson correlation helper ----
function pearson(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; num += a * b; dx += a * a; dy += b * b; }
  if (dx === 0 || dy === 0) return null;
  return Math.round((num / Math.sqrt(dx * dy)) * 100) / 100;
}

// ---- Correlation: course x course (per-student attendance %) ----
export async function courseCorrelations() {
  const { attendance } = await loadFacts();
  // student -> course -> {p,t}
  const map = new Map<string, Map<string, { p: number; t: number }>>();
  const courses = new Map<string, string>();
  for (const a of attendance) {
    courses.set(a.session.courseId, a.session.course.code);
    if (!map.has(a.studentId)) map.set(a.studentId, new Map());
    const cm = map.get(a.studentId)!;
    const v = cm.get(a.session.courseId) ?? { p: 0, t: 0 };
    v.p += isPresent(a.status) ? 1 : 0; v.t += 1; cm.set(a.session.courseId, v);
  }
  const courseIds = [...courses.keys()];
  const matrix: { a: string; b: string; r: number | null; n: number }[] = [];
  for (let i = 0; i < courseIds.length; i++) {
    for (let j = i + 1; j < courseIds.length; j++) {
      const xs: number[] = [], ys: number[] = [];
      for (const [, cm] of map) {
        const x = cm.get(courseIds[i]); const y = cm.get(courseIds[j]);
        if (x && y && x.t && y.t) { xs.push(x.p / x.t); ys.push(y.p / y.t); }
      }
      matrix.push({ a: courses.get(courseIds[i])!, b: courses.get(courseIds[j])!, r: pearson(xs, ys), n: xs.length });
    }
  }
  return { codes: courseIds.map((id) => courses.get(id)!), matrix: matrix.sort((x, y) => (Math.abs(y.r ?? 0) - Math.abs(x.r ?? 0))) };
}

// ---- Correlation drivers: time-slot & professor effect on attendance ----
export async function attendanceDrivers() {
  const { attendance } = await loadFacts();
  const slotBucket = (slot: string) => (parseInt(slot.slice(0, 2)) < 13 ? "Morning" : "Afternoon/Evening");
  const bySlot = new Map<string, { p: number; t: number }>();
  const byProf = new Map<string, { p: number; t: number }>();
  for (const a of attendance) {
    const present = isPresent(a.status) ? 1 : 0;
    const sb = slotBucket(a.session.slot);
    const s = bySlot.get(sb) ?? { p: 0, t: 0 }; s.p += present; s.t += 1; bySlot.set(sb, s);
    const pf = a.session.professor || "—";
    const p = byProf.get(pf) ?? { p: 0, t: 0 }; p.p += present; p.t += 1; byProf.set(pf, p);
  }
  return {
    slots: [...bySlot.entries()].map(([k, v]) => ({ label: k, pct: pct(v.p, v.t), total: v.t })),
    professors: [...byProf.entries()].map(([k, v]) => ({ label: k, pct: pct(v.p, v.t), total: v.t })).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0)),
  };
}

// ---- Trend: weekly attendance % (whole class or one student) ----
export async function weeklyTrend(studentId?: string) {
  const { attendance } = await loadFacts();
  const weeks = new Map<string, { p: number; t: number }>();
  for (const a of attendance) {
    if (studentId && a.studentId !== studentId) continue;
    const d = new Date(a.session.date);
    const onejan = new Date(d.getFullYear(), 0, 1);
    const wk = Math.ceil((((d as any) - (onejan as any)) / 86400000 + onejan.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-W${String(wk).padStart(2, "0")}`;
    const v = weeks.get(key) ?? { p: 0, t: 0 }; v.p += isPresent(a.status) ? 1 : 0; v.t += 1; weeks.set(key, v);
  }
  return [...weeks.entries()].sort().map(([week, v]) => ({ week, pct: pct(v.p, v.t), total: v.t }));
}

// ---- Comparison: a student vs class average, per course ----
export async function studentVsClass(studentId: string) {
  const s = await attendanceSummary();
  const courseAvg = new Map(s.courses.map((c) => [c.id, c.pct]));
  const out: { code: string; name: string; mine: number | null; classAvg: number | null; diff: number | null }[] = [];
  const { attendance } = await loadFacts();
  const courseMeta = new Map<string, { code: string; name: string }>();
  const mine = new Map<string, { p: number; t: number }>();
  for (const a of attendance) {
    courseMeta.set(a.session.courseId, { code: a.session.course.code, name: a.session.course.name });
    if (a.studentId !== studentId) continue;
    const v = mine.get(a.session.courseId) ?? { p: 0, t: 0 }; v.p += isPresent(a.status) ? 1 : 0; v.t += 1; mine.set(a.session.courseId, v);
  }
  for (const [cid, v] of mine) {
    const m = pct(v.p, v.t); const ca = courseAvg.get(cid) ?? null;
    out.push({ code: courseMeta.get(cid)!.code, name: courseMeta.get(cid)!.name, mine: m, classAvg: ca, diff: m != null && ca != null ? Math.round((m - ca) * 10) / 10 : null });
  }
  return out.sort((a, b) => (a.diff ?? 0) - (b.diff ?? 0));
}
