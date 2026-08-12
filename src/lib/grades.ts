// Attendance → grade policy + "how many can I skip" budget.
// Policy (per course, on final term attendance):
//   >= 80%  Safe · no grade drop
//   60-79%  -1 grade
//   50-59%  -2 grades
//   < 50%   Fail (F)
export const POLICY = { safe: 80, drop1: 60, drop2: 50 };

export type Status = { label: string; note: string; tone: "good" | "warn" | "bad" | "faint" };

export function gradeStatus(pct: number | null): Status {
  if (pct == null) return { label: "No data", note: "start marking", tone: "faint" };
  if (pct >= POLICY.safe) return { label: "Safe", note: "no grade drop", tone: "good" };
  if (pct >= POLICY.drop1) return { label: "−1 grade", note: "below 80%", tone: "warn" };
  if (pct >= POLICY.drop2) return { label: "−2 grades", note: "below 60%", tone: "bad" };
  return { label: "Fail · F", note: "below 50%", tone: "bad" };
}

// Max classes still skippable to finish >= theta% (given attended P, marked H, term total T).
export function maxSkip(present: number, held: number, total: number, theta: number) {
  const remaining = Math.max(0, total - held);
  const k = Math.floor(present + remaining - (theta / 100) * total);
  return Math.max(0, Math.min(remaining, k));
}

export type Safety = {
  present: number; held: number; total: number; remaining: number;
  od: number;                    // of `present`, how many were on-duty credits
  pct: number | null;            // attendance so far (present/held)
  projected: number | null;      // if you attend every remaining class
  skipSafe: number;              // skips left to stay >= 80%
  skip60: number; skip50: number;
  status: Status;
  cushion: number;               // classes you're above the 80% line right now (can be negative)
};

// `present` already includes OD credits; `od` is passed only so the UI can say so.
export function safety(present: number, held: number, total: number, od = 0): Safety {
  const remaining = Math.max(0, total - held);
  const pct = held > 0 ? Math.round((present / held) * 1000) / 10 : null;
  const projected = total > 0 ? Math.round(((present + remaining) / total) * 1000) / 10 : null;
  return {
    present, held, total, remaining, od, pct, projected,
    skipSafe: maxSkip(present, held, total, POLICY.safe),
    skip60: maxSkip(present, held, total, POLICY.drop1),
    skip50: maxSkip(present, held, total, POLICY.drop2),
    status: gradeStatus(pct),
    cushion: Math.floor(present - (POLICY.safe / 100) * total),
  };
}
