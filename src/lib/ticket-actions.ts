"use server";
import { prisma } from "@/lib/prisma";
import { getViewer, requireAdmin } from "@/lib/viewer";
import { normalizeKind, normalizeCategory, normalizeStatus, MAX_SUBJECT, MAX_BODY } from "@/lib/tickets";
import { normalizeStatus as normalizeMark } from "@/lib/status";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type TicketResult = { ok: boolean; message: string };

async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) throw new Error("unauth");
  return viewer;
}

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

function refresh(id?: number) {
  revalidatePath("/queries");
  if (id) revalidatePath(`/queries/${id}`);
  revalidatePath("/admin/queries");
  if (id) revalidatePath(`/admin/queries/${id}`);
  revalidatePath("/admin", "layout");
}

export async function createTicket(_prev: TicketResult | null, formData: FormData): Promise<TicketResult> {
  const viewer = await requireViewer();
  const kind = normalizeKind(formData.get("kind"));
  const category = normalizeCategory(kind, formData.get("category"));
  const subject = clean(formData.get("subject"), MAX_SUBJECT);
  const body = clean(formData.get("body"), MAX_BODY);

  if (subject.length < 4) return { ok: false, message: "Give it a short title so it's findable." };
  if (body.length < 10) return { ok: false, message: "Add a bit more detail — a line or two is plenty." };

  // Only accept a class the author is actually enrolled in, so a stray id can't
  // attach someone else's register entry to a ticket.
  let sessionId: string | null = null;
  const requested = String(formData.get("sessionId") ?? "");
  if (requested && viewer.student) {
    const ses = await prisma.session.findUnique({ where: { id: requested }, select: { courseId: true } });
    if (ses) {
      const enrolled = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: viewer.student.id, courseId: ses.courseId } },
      });
      if (enrolled) sessionId = requested;
    }
  }

  const ticket = await prisma.ticket.create({
    data: {
      kind, category, subject,
      authorEmail: viewer.email.toLowerCase(),
      authorName: viewer.name,
      studentId: viewer.student?.id ?? null,
      sessionId,
      messages: {
        create: { authorEmail: viewer.email.toLowerCase(), authorName: viewer.name, fromAdmin: false, body },
      },
    },
  });

  refresh(ticket.id);
  redirect(`/queries/${ticket.id}`);
}

export async function postReply(_prev: TicketResult | null, formData: FormData): Promise<TicketResult> {
  const viewer = await requireViewer();
  const id = Number(formData.get("ticketId"));
  const body = clean(formData.get("body"), MAX_BODY);
  if (!Number.isFinite(id)) return { ok: false, message: "Unknown thread." };
  if (body.length < 2) return { ok: false, message: "Write a reply first." };

  const ticket = await prisma.ticket.findUnique({ where: { id }, select: { authorEmail: true, kind: true, status: true } });
  if (!ticket) return { ok: false, message: "That thread no longer exists." };

  const isAuthor = ticket.authorEmail === viewer.email.toLowerCase();
  // Anyone may weigh in on a suggestion; a question is between its author and the admins.
  if (!viewer.isAdmin && !isAuthor && ticket.kind !== "SUGGESTION") return { ok: false, message: "This thread isn't yours." };

  // Who replied decides where the thread lands:
  //  - an admin answers an open thread, and otherwise leaves the status alone
  //    (they have explicit controls, so a closing note shouldn't reopen it);
  //  - the author replying to a QUERY always reopens it, even from resolved —
  //    that reply means "this still isn't right" and must come back to the queue;
  //  - chatter on a SUGGESTION never overrides a planned/declined decision.
  const nextStatus = viewer.isAdmin
    ? ticket.status === "OPEN" ? "ANSWERED" : ticket.status
    : ticket.kind === "QUERY" ? "OPEN" : ticket.status;

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: { ticketId: id, authorEmail: viewer.email.toLowerCase(), authorName: viewer.name, fromAdmin: viewer.isAdmin, body },
    }),
    prisma.ticket.update({ where: { id }, data: { status: nextStatus } }),
  ]);

  refresh(id);
  return { ok: true, message: "" };
}

export async function setTicketStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("ticketId"));
  const ticket = await prisma.ticket.findUnique({ where: { id }, select: { kind: true } });
  if (!ticket) return;
  await prisma.ticket.update({ where: { id }, data: { status: normalizeStatus(ticket.kind, formData.get("status")) } });
  refresh(id);
}

/** "Me too" on a suggestion, so the console can rank by how many people want it. */
export async function toggleVote(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const id = Number(formData.get("ticketId"));
  const email = viewer.email.toLowerCase();
  const existing = await prisma.ticketVote.findUnique({ where: { ticketId_email: { ticketId: id, email } } });
  if (existing) await prisma.ticketVote.delete({ where: { id: existing.id } });
  else await prisma.ticketVote.create({ data: { ticketId: id, email } });
  refresh(id);
}

/** Correct the disputed mark without leaving the thread, and say so in it. */
export async function fixMarkFromTicket(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = Number(formData.get("ticketId"));
  const status = normalizeMark(formData.get("status"));

  const ticket = await prisma.ticket.findUnique({ where: { id }, select: { sessionId: true, studentId: true, status: true } });
  if (!ticket?.sessionId || !ticket.studentId) return;

  await prisma.$transaction([
    prisma.attendance.upsert({
      where: { sessionId_studentId: { sessionId: ticket.sessionId, studentId: ticket.studentId } },
      create: { sessionId: ticket.sessionId, studentId: ticket.studentId, status, markedBy: admin.email },
      update: { status, markedBy: admin.email, markedAt: new Date() },
    }),
    // A note in the thread, so the student sees what changed and who changed it.
    prisma.ticketMessage.create({
      data: {
        ticketId: id, authorEmail: admin.email, authorName: admin.name, fromAdmin: true,
        body: `Register updated — this class is now marked ${status.toLowerCase()}.`,
      },
    }),
    prisma.ticket.update({ where: { id }, data: { status: "RESOLVED" } }),
  ]);

  refresh(id);
  revalidatePath("/student");
}
