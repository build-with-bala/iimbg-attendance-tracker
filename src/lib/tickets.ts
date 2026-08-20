// One board carries two kinds of post: a QUERY is something wrong that needs an
// answer, a SUGGESTION is something someone wants built. They share a thread and
// a status vocabulary; only the categories and the offered statuses differ.

export const KINDS = ["QUERY", "SUGGESTION"] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_META: Record<Kind, { label: string; plural: string; verb: string; blurb: string; ico: string }> = {
  QUERY: {
    label: "Question",
    plural: "Questions",
    verb: "Ask a question",
    blurb: "Attendance marked wrong, a class missing from your timetable, the wrong section — anything that needs fixing.",
    ico: "?",
  },
  SUGGESTION: {
    label: "Suggestion",
    plural: "Suggestions",
    verb: "Suggest something",
    blurb: "A feature you want, something confusing to use, or an idea that would make this more useful. Others can back it.",
    ico: "✦",
  },
};

export const CATEGORIES: Record<Kind, { key: string; label: string }[]> = {
  QUERY: [
    { key: "attendance", label: "Attendance is wrong" },
    { key: "timetable", label: "Timetable / class missing" },
    { key: "section", label: "Section or enrolment" },
    { key: "data", label: "My details are wrong" },
    { key: "other", label: "Something else" },
  ],
  SUGGESTION: [
    { key: "feature", label: "New feature" },
    { key: "ui", label: "Design or usability" },
    { key: "other", label: "Something else" },
  ],
};

export const categoryLabel = (kind: string, key: string) =>
  CATEGORIES[(kind as Kind) in CATEGORIES ? (kind as Kind) : "QUERY"].find((c) => c.key === key)?.label ?? key;

export const STATUSES = ["OPEN", "ANSWERED", "PLANNED", "DECLINED", "RESOLVED"] as const;
export type TicketStatus = (typeof STATUSES)[number];

export const STATUS_META: Record<TicketStatus, { label: string; pill: string; tone: string }> = {
  OPEN: { label: "open", pill: "pill-warn", tone: "warn" },
  ANSWERED: { label: "answered", pill: "pill-od", tone: "accent" },
  PLANNED: { label: "planned", pill: "pill-good", tone: "good" },
  DECLINED: { label: "declined", pill: "pill-bad", tone: "bad" },
  RESOLVED: { label: "resolved", pill: "", tone: "faint" },
};

/** "Planned" and "Declined" only make sense for a suggestion; a question is
 *  answered or resolved. Keeps the admin's status menu honest per kind. */
export const statusesFor = (kind: string): TicketStatus[] =>
  kind === "SUGGESTION"
    ? ["OPEN", "ANSWERED", "PLANNED", "DECLINED", "RESOLVED"]
    : ["OPEN", "ANSWERED", "RESOLVED"];

/** Statuses that still want someone's attention — what the console badges. */
export const isLive = (s: string) => s === "OPEN" || s === "ANSWERED";
export const needsReply = (s: string) => s === "OPEN";

export const normalizeKind = (k: unknown): Kind => (String(k).toUpperCase() === "SUGGESTION" ? "SUGGESTION" : "QUERY");

export function normalizeCategory(kind: Kind, c: unknown): string {
  const v = String(c);
  return CATEGORIES[kind].some((x) => x.key === v) ? v : "other";
}

export function normalizeStatus(kind: string, s: unknown): TicketStatus {
  const v = String(s).toUpperCase() as TicketStatus;
  return statusesFor(kind).includes(v) ? v : "OPEN";
}

/** How the thread reads at a glance in a list. */
export const MAX_SUBJECT = 120;
export const MAX_BODY = 4000;
