import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { jsonError, withViewer } from "@/lib/mobile-auth";
import { MarkError, markOwnAttendance } from "@/lib/self-mark";
import { STATUSES, type AttStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export const POST = withViewer(async (req, viewer) => {
  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  // strict here: the web form's normalizeStatus would quietly turn a typo into ABSENT
  const status = String(body?.status || "").toUpperCase() as AttStatus;
  if (!sessionId || !STATUSES.includes(status)) return jsonError(400, "sessionId and status (PRESENT | OD | ABSENT) required");
  try {
    await markOwnAttendance(viewer.email, sessionId, status);
  } catch (e) {
    if (e instanceof MarkError) return jsonError(e.message === "no session" ? 404 : 403, e.message);
    throw e;
  }
  revalidatePath("/student"); // the web view of the same student
  return NextResponse.json({ ok: true });
});
