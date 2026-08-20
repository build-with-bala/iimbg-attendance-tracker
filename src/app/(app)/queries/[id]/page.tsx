import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { getTicket } from "@/lib/ticket-data";
import { ReplyForm, VoteButton } from "@/components/board/Forms";
import { Messages, StatusPill, KindPill, CategoryPill, LinkedClass, when } from "@/components/board/Thread";

export const dynamic = "force-dynamic";

export default async function QueryThread({ params }: { params: { id: string } }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const t = await getTicket(viewer, id);
  if (!t) notFound();

  // A question is a private conversation; a suggestion is open to everyone.
  const canReply = viewer.isAdmin || t.isAuthor || t.kind === "SUGGESTION";
  // Only a question comes back to the queue when its author replies; a decided
  // suggestion stays decided, so don't promise otherwise.
  const reopens = t.kind === "QUERY" && t.status === "RESOLVED";

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/queries?tab=${t.kind}`} className="code">← back to queries</Link>
        <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap", margin: ".8rem 0 .5rem" }}>
          <span className="code" style={{ fontSize: ".72rem" }}>#{t.id}</span>
          <StatusPill status={t.status} />
          <KindPill kind={t.kind} />
          <CategoryPill kind={t.kind} category={t.category} />
        </div>
        <h1 style={{ fontSize: "clamp(1.5rem, 3.2vw, 2.1rem)" }}>{t.subject}</h1>
        <div className="code" style={{ marginTop: ".45rem" }}>
          {t.isAuthor ? "you" : t.authorName}
          {t.student && <> · {t.student.studentId}</>}
          {" · opened "}{when(t.createdAt)}
        </div>
      </div>

      {t.session && (
        <div className="card">
          <LinkedClass session={t.session} mark={t.mark} />
        </div>
      )}

      {t.kind === "SUGGESTION" && (
        <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div className="eyebrow">Backing</div>
            <div className="code" style={{ marginTop: ".3rem" }}>
              {t.votes === 0 ? "Nobody has backed this yet." : `${t.votes} ${t.votes === 1 ? "person wants" : "people want"} this.`}
            </div>
          </div>
          <VoteButton ticketId={t.id} votes={t.votes} voted={t.voted} />
        </div>
      )}

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: ".9rem" }}>Conversation</div>
        <Messages messages={t.messages} meEmail={viewer.email} />

        <div style={{ marginTop: "1.2rem", paddingTop: "1.1rem", borderTop: "1px solid var(--divider)" }}>
          {canReply ? (
            <ReplyForm ticketId={t.id} placeholder={reopens ? "This one's closed — replying reopens it for the committee." : "Write a reply..."} />
          ) : (
            <p className="code" style={{ margin: 0 }}>Only the person who raised this and the committee can reply.</p>
          )}
        </div>
      </div>
    </div>
  );
}
