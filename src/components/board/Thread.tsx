import { STATUS_META, categoryLabel, KIND_META, type TicketStatus, type Kind } from "@/lib/tickets";

export const when = (d: Date) =>
  new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status as TicketStatus] ?? STATUS_META.OPEN;
  return <span className={"pill " + m.pill}>{m.label}</span>;
}

export function KindPill({ kind }: { kind: string }) {
  const m = KIND_META[kind as Kind] ?? KIND_META.QUERY;
  return <span className="pill" style={{ color: "var(--muted)" }}>{m.ico} {m.label}</span>;
}

export function CategoryPill({ kind, category }: { kind: string; category: string }) {
  return <span className="code" style={{ fontSize: ".7rem" }}>{categoryLabel(kind, category)}</span>;
}

type Msg = { id: string; authorName: string; authorEmail: string; fromAdmin: boolean; body: string; createdAt: Date };

/** The conversation. Admin replies sit on an accent rail so the answer is
 *  findable without reading every message. */
export function Messages({ messages, meEmail }: { messages: Msg[]; meEmail: string }) {
  return (
    <div style={{ display: "grid", gap: ".9rem" }}>
      {messages.map((m) => {
        const mine = m.authorEmail === meEmail.toLowerCase();
        return (
          <div
            key={m.id}
            style={{
              padding: ".85rem 1rem",
              borderRadius: 14,
              background: m.fromAdmin ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "var(--recess-bg)",
              boxShadow: m.fromAdmin ? "none" : "var(--recess-sh)",
              border: m.fromAdmin ? "1px solid color-mix(in srgb, var(--accent) 32%, transparent)" : "1px solid transparent",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: ".5rem", flexWrap: "wrap", marginBottom: ".35rem" }}>
              <span style={{ fontWeight: 600, fontSize: ".85rem", color: m.fromAdmin ? "var(--accent-2)" : "var(--text)" }}>
                {m.authorName}{mine && !m.fromAdmin ? " (you)" : ""}
              </span>
              {m.fromAdmin && <span className="pill pill-warn">admin</span>}
              <span className="code" style={{ fontSize: ".68rem" }}>{when(m.createdAt)}</span>
            </div>
            <p style={{ margin: 0, fontSize: ".9rem", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{m.body}</p>
          </div>
        );
      })}
    </div>
  );
}

/** The class a dispute points at, with what the register currently says. */
export function LinkedClass({
  session, mark, children,
}: {
  session: { date: Date; slot: string; section: string; professor: string | null; course: { code: string; name: string } };
  mark: { status: string; markedBy: string; markedAt: Date } | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="inset" style={{ padding: "0.9rem 1.05rem" }}>
      <div className="eyebrow" style={{ marginBottom: ".45rem" }}>Class in question</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "1rem" }}>
        {session.course.name} <span className="code">{session.course.code}</span>
      </div>
      <div className="code" style={{ marginTop: ".2rem" }}>
        {new Date(session.date).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" })}
        {" · "}{session.slot}
        {session.section && ` · sec ${session.section}`}
        {session.professor && ` · ${session.professor}`}
      </div>
      <div style={{ marginTop: ".6rem", display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
        <span className="code">register says</span>
        {mark ? (
          <span className={"pill " + (mark.status === "PRESENT" ? "pill-good" : mark.status === "OD" ? "pill-od" : "pill-bad")}>
            {mark.status.toLowerCase()}
          </span>
        ) : (
          <span className="pill">not marked</span>
        )}
        {mark && <span className="code" style={{ fontSize: ".68rem" }}>by {mark.markedBy} · {when(mark.markedAt)}</span>}
      </div>
      {children}
    </div>
  );
}
