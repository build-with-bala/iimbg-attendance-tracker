import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { listTickets, disputableSessions } from "@/lib/ticket-data";
import { KIND_META, normalizeKind, type Kind } from "@/lib/tickets";
import { Composer, VoteButton } from "@/components/board/Forms";
import { StatusPill, CategoryPill, when } from "@/components/board/Thread";

export const dynamic = "force-dynamic";

const TABS: { key: string; label: string }[] = [
  { key: "QUERY", label: "Questions" },
  { key: "SUGGESTION", label: "Suggestions" },
  { key: "mine", label: "Mine" },
];

export default async function QueriesBoard({ searchParams }: { searchParams: { tab?: string } }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const tab = TABS.some((t) => t.key === searchParams.tab) ? searchParams.tab! : "QUERY";
  const mine = tab === "mine";
  const kind: Kind = mine ? "QUERY" : normalizeKind(tab);

  const [tickets, sessions] = await Promise.all([
    listTickets(viewer, mine ? { mine: true } : { kind }),
    viewer.student ? disputableSessions(viewer.student.id) : Promise.resolve([]),
  ]);

  const sessionOpts = sessions.map((s) => ({
    id: s.id,
    label: `${new Date(s.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })} · ${s.slot} · ${s.course.name}${s.section ? ` (sec ${s.section})` : ""}`,
  }));

  return (
    <div className="space-y-4">
      <div style={{ marginBottom: ".4rem" }}>
        <div className="eyebrow">Ask · suggest · follow up</div>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.7rem)", marginTop: ".5rem" }}>Queries</h1>
        <p style={{ color: "var(--muted)", fontSize: ".9rem", margin: ".6rem 0 0", maxWidth: "42rem" }}>
          Something wrong with your attendance, or an idea for the app? Post it here and the committee picks it up.
        </p>
      </div>

      <div className="seg-scroll"><div className="seg">
        {TABS.map((t) => (
          <Link key={t.key} href={`/queries?tab=${t.key}`} className={"seg-it" + (t.key === tab ? " seg-on" : "")}>
            {t.label}
          </Link>
        ))}
      </div></div>

      {!mine && <Composer kind={kind} sessions={sessionOpts} />}

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: ".9rem" }}>
          {mine ? `Everything you've posted · ${tickets.length}` : `${KIND_META[kind].plural} · ${tickets.length}`}
        </div>
        {tickets.length === 0 ? (
          <div style={{ color: "var(--faint)", fontSize: ".85rem", padding: "1.4rem 0", textAlign: "center" }}>
            {mine ? "You haven't posted anything yet." : `No ${KIND_META[kind].plural.toLowerCase()} yet — be the first.`}
          </div>
        ) : (
          <div style={{ display: "grid", gap: ".7rem" }}>
            {tickets.map((t) => (
              <div key={t.id} className="tk-row">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap", marginBottom: ".3rem" }}>
                    <span className="code" style={{ fontSize: ".7rem" }}>#{t.id}</span>
                    <StatusPill status={t.status} />
                    <CategoryPill kind={t.kind} category={t.category} />
                  </div>
                  <Link href={`/queries/${t.id}`} className="tk-subject">{t.subject}</Link>
                  <div className="code" style={{ marginTop: ".25rem", fontSize: ".72rem" }}>
                    {t.authorEmail === viewer.email.toLowerCase() ? "you" : t.authorName}
                    {" · "}{when(t.updatedAt)}
                    {t.replies > 0 && ` · ${t.replies} ${t.replies === 1 ? "reply" : "replies"}`}
                  </div>
                </div>
                {t.kind === "SUGGESTION" && <VoteButton ticketId={t.id} votes={t.votes} voted={t.voted} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
