import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { getTicket } from "@/lib/ticket-data";
import { setTicketStatus, fixMarkFromTicket } from "@/lib/ticket-actions";
import { statusesFor, STATUS_META, type TicketStatus } from "@/lib/tickets";
import { STATUSES as MARKS, STATUS_META as MARK_META } from "@/lib/status";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ReplyForm } from "@/components/board/Forms";
import { Messages, StatusPill, KindPill, CategoryPill, LinkedClass, when } from "@/components/board/Thread";

export const dynamic = "force-dynamic";

export default async function AdminQueryThread({ params }: { params: { id: string } }) {
  const viewer = (await getViewer())!;
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const t = await getTicket(viewer, id);
  if (!t) notFound();

  return (
    <>
      <PageHeader
        title={t.subject}
        eyebrow={`Query #${t.id} · ${t.student ? `${t.student.name} · ${t.student.studentId}` : t.authorEmail}`}
        right={<Link href="/admin/queries" className="code">← queue</Link>}
      />

      <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: "1.15rem" }}>
        <StatusPill status={t.status} />
        <KindPill kind={t.kind} />
        <CategoryPill kind={t.kind} category={t.category} />
        <span className="code" style={{ fontSize: ".7rem" }}>opened {when(t.createdAt)}</span>
        {t.kind === "SUGGESTION" && <span className="pill pill-od">▲ {t.votes} backing</span>}
      </div>

      {t.session && (
        <>
          <Panel>
            <LinkedClass session={t.session} mark={t.mark}>
              {t.studentId ? (
                <div style={{ marginTop: ".9rem", paddingTop: ".8rem", borderTop: "1px solid var(--divider)" }}>
                  <div className="code" style={{ marginBottom: ".5rem" }}>
                    Correct it here — this updates the register, notes it in the thread and resolves the query.
                  </div>
                  <div className="mark">
                    {MARKS.map((m) => (
                      <form action={fixMarkFromTicket} key={m}>
                        <input type="hidden" name="ticketId" value={t.id} />
                        <input type="hidden" name="status" value={m} />
                        <button
                          data-on={t.mark?.status === m ? "1" : "0"}
                          title={MARK_META[m].label}
                          style={t.mark?.status === m ? { color: MARK_META[m].color } : undefined}
                        >
                          {MARK_META[m].label}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="code" style={{ marginTop: ".8rem" }}>
                  This author has no roster row, so there's no register entry to correct.
                </p>
              )}
            </LinkedClass>
          </Panel>
          <div style={{ height: "1.15rem" }} />
        </>
      )}

      <Panel title="Set status">
        <div className="seg" style={{ flexWrap: "wrap" }}>
          {statusesFor(t.kind).map((s) => (
            <form action={setTicketStatus} key={s}>
              <input type="hidden" name="ticketId" value={t.id} />
              <input type="hidden" name="status" value={s} />
              <button className={"seg-it" + (t.status === s ? " seg-on" : "")} style={{ border: "none", background: t.status === s ? undefined : "transparent", cursor: "pointer", fontFamily: "var(--font-body)" }}>
                {STATUS_META[s as TicketStatus].label}
              </button>
            </form>
          ))}
        </div>
      </Panel>

      <div style={{ height: "1.15rem" }} />

      <Panel title="Conversation">
        <Messages messages={t.messages} meEmail={viewer.email} />
        <div style={{ marginTop: "1.2rem", paddingTop: "1.1rem", borderTop: "1px solid var(--divider)" }}>
          <ReplyForm ticketId={t.id} placeholder="Reply to the student..." />
        </div>
      </Panel>
    </>
  );
}
