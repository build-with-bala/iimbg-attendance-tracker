import { markSelf } from "@/lib/actions";
import { STATUSES, STATUS_META, type AttStatus } from "@/lib/status";

const LABEL: Record<AttStatus, { full: string; compact: string }> = {
  PRESENT: { full: "✓ Present", compact: "✓" },
  OD: { full: "OD", compact: "OD" },
  ABSENT: { full: "Skip", compact: "✕" },
};

/** Three-way self-mark: Present · OD · Skip. The current status is the pressed segment. */
export function MarkControl({ sessionId, status, size = "md" }: { sessionId: string; status?: string | null; size?: "md" | "sm" }) {
  return (
    <div className={"mark" + (size === "sm" ? " mark-sm" : "")} role="group" aria-label="Mark attendance">
      {STATUSES.map((s) => {
        const on = status === s;
        return (
          <form action={markSelf} key={s}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="status" value={s} />
            <button
              data-on={on ? "1" : "0"}
              title={STATUS_META[s].label}
              aria-pressed={on}
              style={on ? { color: STATUS_META[s].color } : undefined}
            >
              {size === "sm" ? LABEL[s].compact : LABEL[s].full}
            </button>
          </form>
        );
      })}
    </div>
  );
}

export function StatusPill({ status, style }: { status?: string | null; style?: React.CSSProperties }) {
  if (!status) return null;
  const meta = STATUS_META[status as AttStatus] ?? STATUS_META.ABSENT;
  return <span className={"pill " + meta.pill} style={style}>{meta.label}</span>;
}
