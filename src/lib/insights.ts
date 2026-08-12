import { prisma } from "./prisma";
import { isPresent, isOD } from "./status";
import { todayKey, sessionKey } from "./dates";
import { programName } from "./programs";

function pct(p: number, t: number) {
  return t === 0 ? null : Math.round((p / t) * 1000) / 10;
}

// ---- Course popularity: how many students opted each subject ----
export async function coursePopularity() {
  const courses = await prisma.course.findMany({
    include: { _count: { select: { enrollments: true, sessions: true } } },
    orderBy: [{ term: "asc" }, { code: "asc" }],
  });
  const total = await prisma.student.count();
  return courses
    .map((c) => ({ id: c.id, code: c.code, name: c.name, credits: c.credits, term: c.term, opted: c._count.enrollments, sessions: c._count.sessions, share: total ? Math.round((c._count.enrollments / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.opted - a.opted);
}

// roster of students who opted a subject
export async function courseRoster(courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  const enr = await prisma.enrollment.findMany({
    where: { courseId },
    include: { student: true },
    orderBy: { student: { studentId: "asc" } },
  });
  return { course, students: enr.map((e) => e.student) };
}

// ---- Student directory ----
export async function studentDirectory() {
  return prisma.student.findMany({
    orderBy: { studentId: "asc" },
    include: { _count: { select: { enrollments: true } } },
  });
}

// ---- My subjects: for one student, each chosen subject + how many peers opted + peers list ----
export async function mySubjects(studentId: string) {
  const enr = await prisma.enrollment.findMany({
    where: { studentId },
    include: { course: { include: { _count: { select: { enrollments: true, sessions: true } } } } },
    orderBy: { course: { term: "asc" } },
  });
  const total = await prisma.student.count();
  return enr.map((e) => ({
    id: e.course.id, code: e.course.code, name: e.course.name, credits: e.course.credits, term: e.course.term,
    opted: e.course._count.enrollments, sessions: e.course._count.sessions,
    share: total ? Math.round((e.course._count.enrollments / total) * 1000) / 10 : 0,
  }));
}

// ---- Compare two students: subject similarity + differences + attendance diff ----
export async function compareStudents(aId: string, bId: string) {
  const [a, b] = await Promise.all([
    prisma.student.findUnique({ where: { id: aId }, include: { enrollments: { include: { course: true } } } }),
    prisma.student.findUnique({ where: { id: bId }, include: { enrollments: { include: { course: true } } } }),
  ]);
  if (!a || !b) return null;

  const setA = new Map(a.enrollments.map((e) => [e.course.code, e.course]));
  const setB = new Map(b.enrollments.map((e) => [e.course.code, e.course]));
  const shared = [...setA.keys()].filter((c) => setB.has(c));
  const onlyA = [...setA.keys()].filter((c) => !setB.has(c));
  const onlyB = [...setB.keys()].filter((c) => !setA.has(c));
  const union = new Set([...setA.keys(), ...setB.keys()]);
  const jaccard = union.size ? Math.round((shared.length / union.size) * 1000) / 10 : 0;

  // attendance per student per course (for shared courses)
  const att = await prisma.attendance.findMany({
    where: { studentId: { in: [aId, bId] } },
    include: { session: { include: { course: true } } },
  });
  const acc = new Map<string, { p: number; t: number }>(); // key sid|code
  for (const r of att) {
    const k = r.studentId + "|" + r.session.course.code;
    const v = acc.get(k) ?? { p: 0, t: 0 }; v.p += isPresent(r.status) ? 1 : 0; v.t += 1; acc.set(k, v);
  }
  const attRow = (code: string) => {
    const va = acc.get(aId + "|" + code); const vb = acc.get(bId + "|" + code);
    const pa = va ? pct(va.p, va.t) : null; const pb = vb ? pct(vb.p, vb.t) : null;
    return { pa, pb, diff: pa != null && pb != null ? Math.round((pa - pb) * 10) / 10 : null };
  };

  const overall = (id: string) => {
    let p = 0, t = 0;
    for (const [k, v] of acc) if (k.startsWith(id + "|")) { p += v.p; t += v.t; }
    return pct(p, t);
  };

  return {
    a: { id: a.id, name: a.name, studentId: a.studentId },
    b: { id: b.id, name: b.name, studentId: b.studentId },
    jaccard, sharedCount: shared.length, unionCount: union.size,
    shared: shared.map((c) => ({ code: c, name: setA.get(c)!.name, term: setA.get(c)!.term, ...attRow(c) })).sort((x, y) => x.term - y.term),
    onlyA: onlyA.map((c) => ({ code: c, name: setA.get(c)!.name, term: setA.get(c)!.term })).sort((x, y) => x.term - y.term),
    onlyB: onlyB.map((c) => ({ code: c, name: setB.get(c)!.name, term: setB.get(c)!.term })).sort((x, y) => x.term - y.term),
    overallA: overall(aId), overallB: overall(bId),
  };
}

// ---- Student skip-budget / grade safety (per course + overall) ----
import { safety } from "./grades";
export async function studentSafety(studentId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: { course: { include: { _count: { select: { sessions: true } } } } },
  });
  const att = await prisma.attendance.findMany({
    where: { studentId },
    include: { session: { select: { courseId: true } } },
  });
  // per course tallies — OD is credited as present (see lib/status)
  const held = new Map<string, number>(), present = new Map<string, number>(), od = new Map<string, number>();
  for (const a of att) {
    const cid = a.session.courseId;
    held.set(cid, (held.get(cid) ?? 0) + 1);
    if (isPresent(a.status)) present.set(cid, (present.get(cid) ?? 0) + 1);
    if (isOD(a.status)) od.set(cid, (od.get(cid) ?? 0) + 1);
  }
  const courses = enrollments.map((e) => {
    const total = e.course._count.sessions;
    const s = safety(present.get(e.courseId) ?? 0, held.get(e.courseId) ?? 0, total, od.get(e.courseId) ?? 0);
    return { id: e.course.id, name: e.course.name, code: e.course.code, term: e.course.term, credits: e.course.credits, ...s };
  }).filter((c) => c.total > 0);

  const totP = courses.reduce((a, c) => a + c.present, 0);
  const totH = courses.reduce((a, c) => a + c.held, 0);
  const totT = courses.reduce((a, c) => a + c.total, 0);
  const totOD = courses.reduce((a, c) => a + c.od, 0);
  const overall = safety(totP, totH, totT, totOD);
  // sort per-course by urgency (least safe first)
  courses.sort((a, b) => (a.skipSafe - b.skipSafe) || ((a.pct ?? 100) - (b.pct ?? 100)));
  return { overall, courses };
}

// ---- One student's day: today's classes, or the next day that has any ----
export async function studentDay(studentId: string) {
  const courseIds = (await prisma.enrollment.findMany({ where: { studentId }, select: { courseId: true } })).map((e) => e.courseId);
  const [all, marks] = await Promise.all([
    prisma.session.findMany({ where: { courseId: { in: courseIds } }, include: { course: true }, orderBy: [{ date: "asc" }, { slot: "asc" }] }),
    prisma.attendance.findMany({ where: { studentId }, select: { sessionId: true, status: true } }),
  ]);
  const today = todayKey();
  let day = today;
  let list = all.filter((s) => sessionKey(s.date) === today);
  const isToday = list.length > 0;
  if (!isToday) {
    const next = all.find((s) => sessionKey(s.date) > today);
    if (next) { day = sessionKey(next.date); list = all.filter((s) => sessionKey(s.date) === day); }
    else { day = today; list = []; }
  }
  const status = new Map(marks.map((a) => [a.sessionId, a.status]));
  return {
    day, isToday, hasAny: list.length > 0,
    sessions: list.sort((a, b) => a.slot.localeCompare(b.slot)).map((s) => ({ ...s, status: status.get(s.id) ?? null })),
  };
}

// ---- Cohort label: which programme(s)/term(s) are actually loaded ----
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
export async function cohortLabel() {
  const groups = await prisma.course.findMany({ select: { program: true, term: true }, distinct: ["program", "term"] });
  if (groups.length === 0) return "Cohort";
  const programs = [...new Set(groups.map((g) => programName(g.program)))];
  const terms = [...new Set(groups.map((g) => g.term))].sort((a, b) => a - b);
  const termLabel = terms.map((t) => ROMAN[t] ?? t).join(" / ");
  return `${programs.join(" · ")} · Term ${termLabel}`;
}

// ---- All classes (sessions) for the browser ----
export async function allClasses() {
  const sessions = await prisma.session.findMany({
    include: { course: true, _count: { select: { attendance: true } } },
    orderBy: [{ date: "asc" }, { slot: "asc" }],
  });
  return sessions;
}
