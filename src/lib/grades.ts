// Attendance → grade policy + "how many can I skip" budget.
// Policy (per course, on FINAL term attendance):
//   >= 80%  Safe · no grade drop
//   60-79%  -1 grade
//   50-59%  -2 grades
//   < 50%   Fail (F)
//
// A drop is decided by misses against the TERM TOTAL, not the running
// percentage: with 20 total classes you may miss 4 and still finish >= 80%,
// no matter how bad the running % looks mid-term. A band only "drops" once
// enough classes are missed that it is unreachable even by attending every
// remaining class.
export const POLICY = { safe: 80, drop1: 60, drop2: 50 };

export type Status = { label: string; note: string; tone: "good" | "warn" | "bad" | "faint" };

// `projected` = best achievable final % = (present + remaining) / total.
export function gradeStatus(projected: number | null): Status {
  if (projected == null) return { label: "No data", note: "start marking", tone: "faint" };
  if (projected >= POLICY.safe) return { label: "Safe", note: "no grade drop", tone: "good" };
  if (projected >= POLICY.drop1) return { label: "−1 grade", note: "80% no longer reachable", tone: "warn" };
  if (projected >= POLICY.drop2) return { label: "−2 grades", note: "60% no longer reachable", tone: "bad" };
  return { label: "Fail · F", note: "50% no longer reachable", tone: "bad" };
}

// Max classes still skippable to finish >= theta% (given attended P, marked H, term total T).
export function maxSkip(present: number, held: number, total: number, theta: number) {
  const remaining = Math.max(0, total - held);
  const k = Math.floor(present + remaining - (theta / 100) * total);
  return Math.max(0, Math.min(remaining, k));
}

export type Safety = {
  present: number; held: number; total: number; remaining: number;
  missed: number;                // held − present: misses spent so far
  od: number;                    // of `present`, how many were on-duty credits
  pct: number | null;            // attendance so far (present/held) — descriptive only
  projected: number | null;      // best finish: attend every remaining class
  skipSafe: number;              // skips left to stay >= 80%
  skip60: number; skip50: number;
  status: Status;                // band still reachable (drops lock in via misses vs total)
  cushion: number;               // classes you're above the 80% line right now (can be negative)
};

// `present` already includes OD credits; `od` is passed only so the UI can say so.
export function safety(present: number, held: number, total: number, od = 0): Safety {
  const remaining = Math.max(0, total - held);
  const pct = held > 0 ? Math.round((present / held) * 1000) / 10 : null;
  const projected = total > 0 ? Math.round(((present + remaining) / total) * 1000) / 10 : null;
  return {
    present, held, total, remaining, od, pct, projected,
    missed: Math.max(0, held - present),
    skipSafe: maxSkip(present, held, total, POLICY.safe),
    skip60: maxSkip(present, held, total, POLICY.drop1),
    skip50: maxSkip(present, held, total, POLICY.drop2),
    status: gradeStatus(projected),
    cushion: Math.floor(present - (POLICY.safe / 100) * total),
  };
}
