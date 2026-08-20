import { prisma } from "./prisma";
import { isLive, needsReply } from "./tickets";
import type { Viewer } from "./viewer";

const listSelect = {
  id: true, kind: true, category: true, subject: true, status: true,
  authorEmail: true, authorName: true, sessionId: true,
  createdAt: true, updatedAt: true,
  student: { select: { name: true, studentId: true, program: true } },
  _count: { select: { messages: true, votes: true } },
} as const;

/** The board as one person sees it: admins see everything, everyone else sees
 *  their own questions plus every suggestion (suggestions are public so people
 *  can back each other's instead of filing the same one twice). */
export async function listTickets(viewer: Viewer, opts: { kind?: string; status?: string; mine?: boolean } = {}) {
  const visible = viewer.isAdmin
    ? {}
    : { OR: [{ authorEmail: viewer.email.toLowerCase() }, { kind: "SUGGESTION" }] };

  const where: any = { ...visible };
  if (opts.kind) where.kind = opts.kind;
  if (opts.status === "live") where.status = { in: ["OPEN", "ANSWERED"] };
  else if (opts.status && opts.status !== "all") where.status = opts.status;
  if (opts.mine) where.authorEmail = viewer.email.toLowerCase();

  const rows = await prisma.ticket.findMany({
    where,
    select: listSelect,
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
  });

  // Which of these has this viewer already backed?
  const mine = await prisma.ticketVote.findMany({
    where: { email: viewer.email.toLowerCase(), ticketId: { in: rows.map((r) => r.id) } },
    select: { ticketId: true },
  });
  const voted = new Set(mine.map((v) => v.ticketId));
  return rows.map((r) => ({ ...r, votes: r._count.votes, replies: Math.max(0, r._count.messages - 1), voted: voted.has(r.id) }));
}

/** One thread, or null when this viewer may not see it. */
export async function getTicket(viewer: Viewer, id: number) {
  const t = await prisma.ticket.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      student: { select: { id: true, name: true, studentId: true, program: true } },
      session: { include: { course: { select: { code: true, name: true } } } },
      _count: { select: { votes: true } },
    },
  });
  if (!t) return null;

  const isAuthor = t.authorEmail === viewer.email.toLowerCase();
  const canSee = viewer.isAdmin || isAuthor || t.kind === "SUGGESTION";
  if (!canSee) return null;

  // For an attendance dispute, show what the register currently says.
  const mark =
    t.sessionId && t.studentId
      ? await prisma.attendance.findUnique({
          where: { sessionId_studentId: { sessionId: t.sessionId, studentId: t.studentId } },
          select: { status: true, markedBy: true, markedAt: true },
        })
      : null;

  const voted = await prisma.ticketVote.findUnique({
    where: { ticketId_email: { ticketId: id, email: viewer.email.toLowerCase() } },
  });

  return { ...t, isAuthor, mark, votes: t._count.votes, voted: !!voted };
}

/** Counts for the console rail badge and the board header. */
export async function ticketCounts() {
  const rows = await prisma.ticket.groupBy({ by: ["kind", "status"], _count: true });
  const n = (k: string, pred: (s: string) => boolean) =>
    rows.filter((r) => r.kind === k && pred(r.status)).reduce((a, r) => a + r._count, 0);
  return {
    queriesOpen: n("QUERY", needsReply),
    queriesLive: n("QUERY", isLive),
    suggestionsOpen: n("SUGGESTION", needsReply),
    suggestionsLive: n("SUGGESTION", isLive),
    open: rows.filter((r) => needsReply(r.status)).reduce((a, r) => a + r._count, 0),
    total: rows.reduce((a, r) => a + r._count, 0),
  };
}

/** Classes this student could be disputing — their own, most recent first. */
export async function disputableSessions(studentId: string) {
  const enrolled = await prisma.enrollment.findMany({ where: { studentId }, select: { courseId: true } });
  if (!enrolled.length) return [];
  const today = new Date();
  return prisma.session.findMany({
    where: { courseId: { in: enrolled.map((e) => e.courseId) }, date: { lte: today } },
    include: { course: { select: { code: true, name: true } } },
    orderBy: [{ date: "desc" }, { slot: "desc" }],
    take: 60,
  });
}
