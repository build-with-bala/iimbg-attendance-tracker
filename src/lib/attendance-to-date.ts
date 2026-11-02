import { sessionKey } from "./dates";
import { isPresent, isOD } from "./status";

export type AttendanceCount = { attended: number; total: number; marked: number; unmarked: number; od: number };
type SessionFact = { courseId: string; date: Date | string; slot: string; status?: string | null };

export function sessionHasEnded(date: Date | string, slot: string, now: Date) {
  const end = slot.match(/[-–—]\s*(\d{1,2}):(\d{2})\s*$/);
  if (!end) return false;
  const time = `${end[1].padStart(2, "0")}:${end[2]}`;
  return new Date(`${sessionKey(date)}T${time}:00+05:30`).getTime() <= now.getTime();
}

const empty = (): AttendanceCount => ({ attended: 0, total: 0, marked: 0, unmarked: 0, od: 0 });

export function attendanceToDate(sessions: SessionFact[], now = new Date()) {
  const overall = empty();
  const byCourse = new Map<string, AttendanceCount>();
  for (const session of sessions) {
    if (!sessionHasEnded(session.date, session.slot, now)) continue;
    const course = byCourse.get(session.courseId) ?? empty();
    for (const count of [course, overall]) {
      count.total++;
      if (session.status) count.marked++; else count.unmarked++;
      if (session.status && isPresent(session.status)) count.attended++;
      if (session.status && isOD(session.status)) count.od++;
    }
    byCourse.set(session.courseId, course);
  }
  return { overall, byCourse };
}
