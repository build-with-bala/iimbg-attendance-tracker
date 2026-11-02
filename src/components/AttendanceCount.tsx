import type { AttendanceCount as Counts } from "@/lib/attendance-to-date";

export function AttendanceCount({ counts, compact = false }: { counts?: Counts; compact?: boolean }) {
  const { attended = 0, total = 0, unmarked = 0, od = 0 } = counts ?? {};
  return <div aria-label={`${attended} attended out of ${total} classes completed till date`}>
    <div className="num" style={{ fontFamily: "var(--font-display)", fontSize: compact ? "1rem" : "clamp(3rem, 7vw, 4.5rem)", fontWeight: 600, whiteSpace: "nowrap", lineHeight: 1.15 }}>
      <span style={{ color: "var(--accent)" }}>{attended}</span><span style={{ color: "var(--faint)", margin: "0 .12em" }}>/</span>{total}
    </div>
    {!compact && <div className="code" style={{ marginTop: ".65rem", maxWidth: "16rem", lineHeight: 1.6 }}>Attended / classes till date{od > 0 ? ` · ${od} OD included` : ""}</div>}
    {unmarked > 0 && <div className="code" style={{ color: "var(--warn)", marginTop: ".3rem" }}>{unmarked} unmarked</div>}
  </div>;
}
