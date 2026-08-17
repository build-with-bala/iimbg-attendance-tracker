import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { weeklyTrend } from "@/lib/analytics";
import { mySubjects, studentSafety, studentDay, sectionChoices } from "@/lib/insights";
import { saveSections } from "@/lib/actions";
import { POLICY, type Safety } from "@/lib/grades";
import { formatDay, sessionKey } from "@/lib/dates";
import { TrendLine } from "@/components/Charts";
import { Ring, Meter } from "@/components/Ring";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { GradeGauge } from "@/components/GradeGauge";
import { MarkControl, StatusPill } from "@/components/MarkControl";

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "var(--faint)", fontSize: ".85rem", padding: "1.4rem 0", textAlign: "center" }}>{children}</div>;
}

// ---- Section onboarding: pick your section for each multi-section elective ----
export async function SectionOnboarding({ studentId, blocking = true }: { studentId: string; blocking?: boolean }) {
  const choices = await sectionChoices(studentId);
  if (choices.length === 0) return null;
  return (
    <form action={saveSections} className="card" style={{ maxWidth: "44rem", margin: "0 auto" }}>
      <div className="eyebrow">{blocking ? "One-time setup" : "Your sections"}</div>
      <h2 style={{ fontSize: "1.5rem", margin: ".5rem 0 .3rem" }}>Which section are you in?</h2>
      <p style={{ color: "var(--muted)", fontSize: ".9rem", margin: "0 0 1.3rem", lineHeight: 1.5 }}>
        {choices.length === 1 ? "One of your electives runs" : `${choices.length} of your electives run`} in multiple sections and the timetable can&apos;t tell which one is yours. Pick yours so we only show your classes — you can change this here anytime.
      </p>
      <div style={{ display: "grid", gap: "1rem" }}>
        {choices.map((c) => (
          <div key={c.courseId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: ".6rem", paddingBottom: ".9rem", borderBottom: "1px solid var(--divider)" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.02rem" }}>{c.name}</span>
            <span className="mark" role="radiogroup" aria-label={`Section for ${c.name}`}>
              {c.sections.map((s) => (
                <label key={s} className="secpick">
                  <input type="radio" name={"sec_" + c.courseId} value={s} defaultChecked={c.chosen === s} required />
                  <span>Sec {s}</span>
                </label>
              ))}
            </span>
          </div>
        ))}
      </div>
      <button className="btn btn-accent" style={{ marginTop: "1.2rem", width: "100%", padding: ".7rem" }}>Save my sections</button>
    </form>
  );
}
const toneColor = (t: string) => (t === "good" ? "var(--good)" : t === "warn" ? "var(--warn)" : t === "bad" ? "var(--bad)" : "var(--faint)");

// adaptive headline for the skip budget
function headline(o: Safety) {
  if (o.pct == null) return { big: null as number | null, kicker: "Safe to skip", sub: "Mark some classes to see your budget." };
  if (o.pct >= POLICY.safe) {
    return o.skipSafe > 0
      ? { big: o.skipSafe, kicker: "Safe to skip", sub: `more of your ${o.remaining} remaining classes and still finish ≥80% — no grade drop.` }
      : { big: 0, kicker: "At the limit", sub: `you're right on 80% — attend the rest to keep your grade safe.` };
  }
  const need = Math.max(0, Math.ceil((POLICY.safe / 100) * o.total) - o.present);
  if (need <= o.remaining) return { big: need, kicker: "Attend to recover", sub: `of your ${o.remaining} remaining to climb back to 80% and avoid a grade drop.` };
  return { big: 0, kicker: "Below 80%", sub: `can't reach 80% this term — currently ${o.status.label.toLowerCase()}. Attend everything to limit the damage.` };
}

// ---- Today's classes, shared by the dashboard and the Today tab ----
async function TodayBlock({ studentId, compact = false }: { studentId: string; compact?: boolean }) {
  const { day, isToday, sessions } = await studentDay(studentId);
  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: ".5rem", marginBottom: sessions.length ? ".9rem" : 0 }}>
        <div className="eyebrow">{isToday ? "Today's classes" : "Next class day"}</div>
        <div className="code">{formatDay(day, { weekday: "long", day: "2-digit", month: "long" })}{sessions.length ? ` · ${sessions.length} ${sessions.length === 1 ? "class" : "classes"}` : ""}</div>
      </div>
      {sessions.length === 0 ? (
        <Empty>{isToday ? "No classes today. Enjoy the break." : "Nothing left on your timetable."}</Empty>
      ) : (
        <div>
          {sessions.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
                padding: ".75rem 0", borderTop: i ? "1px solid var(--divider)" : "none",
              }}
            >
              <div style={{ minWidth: 0, display: "flex", alignItems: "baseline", gap: ".9rem", flexWrap: "wrap" }}>
                <span className="code" style={{ color: "var(--accent-2)", whiteSpace: "nowrap" }}>{s.slot}</span>
                <span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: compact ? "1rem" : "1.1rem" }}>{s.course.name}</span>
                  {s.section && <span className="code" style={{ color: "var(--accent-2)", marginLeft: ".5rem", whiteSpace: "nowrap" }}>Sec {s.section}</span>}
                  {s.professor && <span className="code" style={{ marginLeft: ".55rem" }}>{s.professor}</span>}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: ".55rem" }}>
                <StatusPill status={s.status} />
                <MarkControl sessionId={s.id} status={s.status} size={compact ? "sm" : "md"} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export async function StandingView({ studentId }: { studentId: string }) {
  const [{ overall, courses }, trend] = await Promise.all([studentSafety(studentId), weeklyTrend(studentId)]);
  const h = headline(overall);

  return (
    <div className="space-y-5">
      <div className="card tilt" data-stack style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2.6rem", alignItems: "center", padding: "2rem 2.2rem" }}>
        <div style={{ justifySelf: "center" }}><Ring value={overall.pct} size={214} label="attendance" /></div>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">{h.kicker}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: ".5rem", margin: ".4rem 0 .1rem" }}>
            <AnimatedNumber value={h.big} className="stat-num" style={{ fontSize: "clamp(3rem,7vw,4.4rem)", color: toneColor(overall.status.tone), lineHeight: 1 }} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--muted)" }}>{h.big === 1 ? "class" : "classes"}</span>
          </div>
          <p style={{ color: "var(--muted)", fontSize: ".92rem", margin: "0 0 1.2rem", maxWidth: "34rem", lineHeight: 1.5 }}>{h.sub}</p>
          <GradeGauge pct={overall.pct} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1.4rem", marginTop: "1.1rem", fontFamily: "var(--font-mono)", fontSize: ".8rem", color: "var(--muted)" }}>
            <span><span style={{ color: "var(--text)", fontWeight: 600 }}>{overall.present}/{overall.held}</span> attended</span>
            {overall.od > 0 && <span><span style={{ color: "var(--accent-2)", fontWeight: 600 }}>{overall.od}</span> OD counted</span>}
            <span><span style={{ color: "var(--text)", fontWeight: 600 }}>{overall.remaining}</span> left</span>
            <span className="pill" style={{ color: toneColor(overall.status.tone) }}>{overall.status.label} · {overall.status.note}</span>
          </div>
        </div>
      </div>

      <TodayBlock studentId={studentId} compact />

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: ".2rem" }}>By course — where you can skip</div>
        <p className="code" style={{ marginBottom: ".9rem" }}>Least room first. "Skip" = classes you can still miss and end ≥80%.</p>
        <div className="scroll-x"><table><thead><tr><th>Course</th><th style={{ textAlign: "right" }}>You</th><th></th><th style={{ textAlign: "right" }}>Can skip</th><th style={{ textAlign: "right" }}>Grade</th></tr></thead><tbody>
          {courses.map((c) => (
            <tr key={c.id}>
              <td style={{ fontWeight: 500 }}>{c.name}{c.od > 0 && <span className="code" style={{ color: "var(--accent-2)", marginLeft: ".45rem", whiteSpace: "nowrap" }}>+{c.od} OD</span>}</td>
              <td className="num" style={{ textAlign: "right" }}>{c.pct ?? "—"}%</td>
              <td style={{ width: 74 }}><Meter value={c.pct} width={62} /></td>
              <td className="num" style={{ textAlign: "right", fontWeight: 600, color: c.skipSafe === 0 ? "var(--bad)" : "var(--text)" }}>{c.pct != null && c.pct < 80 ? "0" : c.skipSafe}</td>
              <td style={{ textAlign: "right" }}><span style={{ color: toneColor(c.status.tone), fontFamily: "var(--font-mono)", fontSize: ".75rem" }}>{c.status.label}</span></td>
            </tr>
          ))}
        </tbody></table></div>
      </div>

      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.3rem" }}>
        <div className="card"><div className="eyebrow" style={{ marginBottom: ".9rem" }}>Weekly trend</div>{trend.length ? <TrendLine data={trend} /> : <Empty>Mark a class to start your trend.</Empty>}</div>
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: ".9rem" }}>You vs class</div>
          {courses.length ? (
            <div className="scroll-x"><table><thead><tr><th>Course</th><th style={{ textAlign: "right" }}>You</th><th></th></tr></thead><tbody>
              {courses.map((c) => (<tr key={c.id}><td>{c.name}</td><td className="num" style={{ textAlign: "right" }}>{c.pct ?? "—"}%</td><td style={{ width: 70 }}><Meter value={c.pct} width={60} /></td></tr>))}
            </tbody></table></div>
          ) : <Empty>No attendance recorded yet.</Empty>}
        </div>
      </div>
    </div>
  );
}

// ---- Today ----
export async function TodayView({ studentId }: { studentId: string }) {
  return (
    <div className="space-y-4">
      <p style={{ color: "var(--muted)", fontSize: ".88rem", margin: 0 }}>
        Mark yourself for each class — <span style={{ color: "var(--good)" }}>Present</span>, <span style={{ color: "var(--accent-2)" }}>OD</span> if you were on duty, or Skip. OD counts toward your attendance.
      </p>
      <TodayBlock studentId={studentId} />
    </div>
  );
}

export async function MySubjectsView({ studentId }: { studentId: string }) {
  const subs = await mySubjects(studentId);
  const byTerm = new Map<number, typeof subs>();
  for (const s of subs) (byTerm.get(s.term) ?? byTerm.set(s.term, []).get(s.term)!).push(s);
  return (
    <div className="space-y-4">
      {[...byTerm.entries()].sort().map(([t, list]) => (
        <div key={t} className="card">
          <div className="eyebrow" style={{ marginBottom: ".7rem" }}>Term {t}</div>
          <div className="scroll-x"><table><thead><tr><th>Course</th><th>Credits</th><th>Peers opted</th><th>Classes</th><th></th></tr></thead><tbody>
            {list.map((c) => (<tr key={c.id}><td style={{ fontWeight: 500 }}>{c.name}</td><td className="num">{c.credits}</td><td><span className="num" style={{ fontWeight: 600 }}>{c.opted}</span> <span className="code">({c.share}%)</span></td><td className="num">{c.sessions}</td><td style={{ textAlign: "right" }}><Link href={"/cohort?tab=subjects&course=" + c.id} className="code">who →</Link></td></tr>))}
          </tbody></table></div>
        </div>
      ))}
    </div>
  );
}

export async function MarkMeView({ studentId }: { studentId: string }) {
  const enr = await prisma.enrollment.findMany({ where: { studentId }, select: { courseId: true, section: true } });
  const secOf = new Map(enr.map((e) => [e.courseId, e.section]));
  const sessions = (await prisma.session.findMany({ where: { courseId: { in: enr.map((e) => e.courseId) } }, include: { course: true }, orderBy: [{ date: "asc" }, { slot: "asc" }] }))
    .filter((s) => s.section === "" || !secOf.get(s.courseId) || s.section === secOf.get(s.courseId));
  const mine = new Map((await prisma.attendance.findMany({ where: { studentId } })).map((a) => [a.sessionId, a.status]));
  const byDate = new Map<string, typeof sessions>();
  for (const s of sessions) { const k = sessionKey(s.date); (byDate.get(k) ?? byDate.set(k, []).get(k)!).push(s); }
  return (
    <div className="space-y-4">
      <p style={{ color: "var(--muted)", fontSize: ".88rem", margin: 0 }}>
        Mark yourself for every class — Present, OD (on duty), or Skip. OD counts toward your attendance. Change it anytime.
      </p>
      {[...byDate.entries()].map(([d, list]) => (
        <div key={d} className="card">
          <div className="eyebrow" style={{ marginBottom: ".5rem" }}>{formatDay(d, { weekday: "long", day: "2-digit", month: "short" })}</div>
          <div className="scroll-x"><table><tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td className="code" style={{ whiteSpace: "nowrap" }}>{s.slot}</td>
                <td style={{ fontWeight: 500 }}>{s.course.name}{s.section && <span className="code" style={{ color: "var(--accent-2)", marginLeft: ".45rem", whiteSpace: "nowrap" }}>Sec {s.section}</span>}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <MarkControl sessionId={s.id} status={mine.get(s.id)} size="sm" />
                </td>
              </tr>
            ))}
          </tbody></table></div>
        </div>
      ))}
    </div>
  );
}
