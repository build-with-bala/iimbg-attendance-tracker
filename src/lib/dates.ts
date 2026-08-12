// Sessions are stored at UTC midnight of their calendar date, but the container
// runs in UTC — so "today" must be resolved in campus time or everything between
// 00:00 and 05:30 IST reads as yesterday.
export const CAMPUS_TZ = "Asia/Kolkata";

// "YYYY-MM-DD" for a date, as seen on campus. en-CA formats ISO-style.
export const dayKey = (d: Date | string | number = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: CAMPUS_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));

// A stored session's own calendar day (it is already UTC midnight, so read it in UTC).
export const sessionKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

export const todayKey = () => dayKey();

export function formatDay(key: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "2-digit", month: "long" }) {
  return new Date(key + "T00:00:00Z").toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
}
