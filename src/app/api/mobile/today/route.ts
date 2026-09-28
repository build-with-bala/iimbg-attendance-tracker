import { NextResponse } from "next/server";
import { studentDay } from "@/lib/insights";
import { jsonError, withViewer } from "@/lib/mobile-auth";
import { normalizeStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

// Today's classes in campus time — or, like the web, the next day that has any.
export const GET = withViewer(async (_req, viewer) => {
  if (!viewer.student) return jsonError(403, "not on any roster");
  const { day, isToday, sessions } = await studentDay(viewer.student.id);
  return NextResponse.json({
    date: day,
    isToday,
    classes: sessions.map((s) => ({
      sessionId: s.id, courseId: s.courseId, code: s.course.code, name: s.course.name,
      slot: s.slot, section: s.section, professor: s.professor,
      status: s.status == null ? null : normalizeStatus(s.status),
    })),
  });
});
