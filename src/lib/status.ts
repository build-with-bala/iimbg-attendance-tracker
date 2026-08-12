// Attendance statuses. OD ("on duty" — committee work, placements, events) is a
// sanctioned absence and counts toward attendance exactly like being present.
export const STATUSES = ["PRESENT", "OD", "ABSENT"] as const;
export type AttStatus = (typeof STATUSES)[number];

export function normalizeStatus(s: unknown): AttStatus {
  const v = String(s).toUpperCase();
  return v === "PRESENT" ? "PRESENT" : v === "OD" ? "OD" : "ABSENT";
}

// The single rule the whole app counts by: OD is credited like attendance.
export const isPresent = (s: string) => s === "PRESENT" || s === "OD";
export const isOD = (s: string) => s === "OD";

export const STATUS_META: Record<AttStatus, { label: string; short: string; pill: string; color: string }> = {
  PRESENT: { label: "present", short: "✓", pill: "pill-good", color: "var(--good)" },
  OD: { label: "on duty", short: "OD", pill: "pill-od", color: "var(--accent-2)" },
  ABSENT: { label: "absent", short: "✕", pill: "pill-bad", color: "var(--bad)" },
};
