import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { listTickets, ticketCounts } from "@/lib/ticket-data";
import { KIND_META, categoryLabel } from "@/lib/tickets";
import { PageHeader, Panel, Grid, Stat, Empty } from "@/components/admin/ui";
import { StatusPill, when } from "@/components/board/Thread";

export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "open", label: "Needs a reply", where: { status: "OPEN" } },
  { key: "live", label: "Live", where: { status: "live" } },
  { key: "queries", label: "Questions", where: { kind: "QUERY" } },
  { key: "suggestions", label: "Suggestions", where: { kind: "SUGGESTION" } },
  { key: "all", label: "All", where: { status: "all" } },
] as const;

export default async function AdminQueries({ searchParams }: { searchParams: { view?: string } }) {
  const viewer = (await getViewer())!;
  const view = VIEWS.find((v) => v.key === searchParams.view) ?? VIEWS[0];
  const [rows, counts] = await Promise.all([listTickets(viewer, view.where as any), ticketCounts()]);

  return (
    <>
      <PageHeader
        title="Queries"
        eyebrow="Console · what students are asking"
        lede="Questions students raised and suggestions they want built. Replying marks a thread answered; a student's follow-up puts it back in the queue."
      />

      <Grid min={168} gap=".85rem">
        <Stat label="Needs a reply" value={counts.open} t={counts.open ? "warn" : "good"} hint="nobody has answered yet" />
        <Stat label="Open questions" value={counts.queriesLive} hint={`${counts.queriesOpen} unanswered`} />
        <Stat label="Open suggestions" value={counts.suggestionsLive} t="accent" hint={`${counts.suggestionsOpen} unanswered`} />
        <Stat label="All time" value={counts.total} />
      </Grid>

      <div style={{ height: "1.15rem" }} />

      <Panel
        title={`${rows.length} shown`}
        right={
          <div className="seg" style={{ gap: 4, padding: 4, overflowX: "auto" }}>
            {VIEWS.map((v) => (
              <a key={v.key} href={`/admin/queries?view=${v.key}`}
                className={"seg-it" + (v.key === view.key ? " seg-on" : "")} style={{ padding: ".35rem .75rem", fontSize: ".78rem" }}>
                {v.label}
              </a>
            ))}
          </div>
        }
      >
        {rows.length === 0 ? (
          <Empty>{view.key === "open" ? "Nothing waiting on a reply — the queue is clear." : "Nothing here yet."}</Empty>
        ) : (
          <div className="scroll-x">
            <table>
              <thead>
                <tr><th>#</th><th>Subject</th><th>From</th><th>Type</th><th style={{ textAlign: "right" }}>Backing</th><th style={{ textAlign: "right" }}>Updated</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td className="code">{t.id}</td>
                    <td style={{ fontWeight: 500, minWidth: 220 }}>
                      <Link href={`/admin/queries/${t.id}`}>{t.subject}</Link>
                      <div style={{ marginTop: ".25rem", display: "flex", gap: ".4rem", alignItems: "center", flexWrap: "wrap" }}>
                        <StatusPill status={t.status} />
                        {t.sessionId && <span className="code" style={{ fontSize: ".66rem", color: "var(--accent-2)" }}>class attached</span>}
                        {t.replies > 0 && <span className="code" style={{ fontSize: ".66rem" }}>{t.replies} {t.replies === 1 ? "reply" : "replies"}</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: ".82rem" }}>
                      {t.student ? <>{t.student.name}<div className="code" style={{ fontSize: ".66rem" }}>{t.student.studentId}</div></> : <span className="code">{t.authorEmail}</span>}
                    </td>
                    <td className="code" style={{ fontSize: ".72rem" }}>
                      {KIND_META[t.kind as "QUERY" | "SUGGESTION"].ico} {categoryLabel(t.kind, t.category)}
                    </td>
                    <td className="num" style={{ textAlign: "right", color: t.votes ? "var(--accent-2)" : "var(--faint)" }}>
                      {t.kind === "SUGGESTION" ? t.votes : "—"}
                    </td>
                    <td className="code" style={{ textAlign: "right", whiteSpace: "nowrap", fontSize: ".72rem" }}>{when(t.updatedAt)}</td>
                    <td style={{ textAlign: "right" }}><Link href={`/admin/queries/${t.id}`} className="code">open →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
