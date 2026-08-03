import { prisma } from "./prisma";

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
    const v = acc.get(k) ?? { p: 0, t: 0 }; v.p += r.status === "PRESENT" ? 1 : 0; v.t += 1; acc.set(k, v);
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

// ---- All classes (sessions) for the browser ----
export async function allClasses() {
  const sessions = await prisma.session.findMany({
    include: { course: true, _count: { select: { attendance: true } } },
    orderBy: [{ date: "asc" }, { slot: "asc" }],
  });
  return sessions;
}
