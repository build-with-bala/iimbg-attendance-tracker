import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { studentSafety } from "@/lib/insights";
import { jsonError, withViewer } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

// Raw per-course counts; the app derives bands with its copy of lib/grades so
// the maths lives in one algorithm on both sides, not in this payload.
export const GET = withViewer(async (_req, viewer) => {
  if (!viewer.student) return jsonError(403, "not on any roster");
  const [{ courses }, enrollments] = await Promise.all([
    studentSafety(viewer.student.id),
    prisma.enrollment.findMany({ where: { studentId: viewer.student.id }, select: { courseId: true, section: true } }),
  ]);
  const section = new Map(enrollments.map((e) => [e.courseId, e.section]));
  return NextResponse.json({
    courses: courses.map((c) => ({
      courseId: c.id, code: c.code, name: c.name, credits: c.credits, term: c.term,
      section: section.get(c.id) ?? "",
      present: c.present, od: c.od, held: c.held, total: c.total,
    })),
  });
});
