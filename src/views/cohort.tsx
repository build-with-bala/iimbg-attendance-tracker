import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { allClasses, coursePopularity, courseRoster, studentDirectory, compareStudents } from "@/lib/insights";
import { attendanceSummary, courseCorrelations, attendanceDrivers, weeklyTrend } from "@/lib/analytics";
import { saveRoster } from "@/lib/actions";
import { TrendLine, BarPct } from "@/components/Charts";
import { Meter } from "@/components/Ring";
import { todayKey as campusToday, sessionKey, formatDay } from "@/lib/dates";
import { STATUSES, STATUS_META, normalizeStatus } from "@/lib/status";

// ---- Timetable (Today / All) ----
export async function TimetableView({ when = "today", program }: { when?: string; program: string }) {
  const sessions = await allClasses(program);
  const todayKey = campusToday();
  let shown = sessions;
  let banner = "";
  if (when === "today") {
    shown = sessions.filter((s) => sessionKey(s.date) === todayKey);
    if (shown.length === 0) {
      const up = sessions.filter((s) => sessionKey(s.date) > todayKey);
      const next = up.length ? sessionKey(up[0].date) : null;
      shown = next ? up.filter((s) => sessionKey(s.date) === next) : [];
      banner = next ? "Nothing today — showing the next class day." : "No upcoming classes.";
    }
  }
  const byDate = new Map<string, typeof sessions>();
  for (const s of shown) { const k = sessionKey(s.date); (byDate.get(k) ?? byDate.set(k, []).get(k)!).push(s); }
  const Toggle = () => (
    <div className="seg" style={{ gap: 4, padding: 4 }}>
      {[["today", "Today"], ["all", "All classes"]].map(([k, l]) => {
        const on = when === k;
        return <Link key={k} href={`/cohort?tab=timetable&when=${k}&program=${program}`} className={"seg-it" + (on ? " seg-on" : "")} style={{ padding: ".4rem .85rem", fontSize: ".82rem" }}>{l}</Link>;
      })}
    </div>
  );
  return (
    <div className="space-y-4">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: ".7rem" }}>
        <Toggle />
        <span className="code">{when === "all" ? `${shown.length} sessions · ${new Set(shown.map((s) => s.courseId)).size} courses` : banner || `${shown.length} classes`}</span>
      </div>
      {[...byDate.entries()].map(([d, list]) => (
        <div key={d} className="card">
          <div className="eyebrow" style={{ marginBottom: ".6rem" }}>{formatDay(d)}</div>
          <div className="scroll-x"><table><thead><tr><th>Slot</th><th>Course</th><th>Professor</th></tr></thead><tbody>
            {list.sort((a, b) => a.slot.localeCompare(b.slot)).map((s) => (
              <tr key={s.id}><td className="code" style={{ whiteSpace: "nowrap" }}>{s.slot}</td><td style={{ fontWeight: 500 }}><Link href={"/cohort?tab=subjects&program=" + program + "&course=" + s.courseId}>{s.course.name}</Link>{s.section && <span className="code" style={{ color: "var(--accent-2)", marginLeft: ".45rem" }}>Sec {s.section}</span>}</td><td style={{ color: "var(--faint)" }}>{s.professor || "—"}</td></tr>
            ))}
          </tbody></table></div>
        </div>
      ))}
      {byDate.size === 0 && <div className="card" style={{ color: "var(--faint)" }}>No classes to show.</div>}
    </div>
  );
}

// ---- Subjects popularity + roster ----
export async function SubjectsView({ course, program }: { course?: string; program: string }) {
  const pop = await coursePopularity(program);
  const roster = course ? await courseRoster(course) : null;
  const maxOpted = Math.max(1, ...pop.map((p) => p.opted));
  return (
    <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "1.1rem" }}>
      <div className="card">
        <div className="eyebrow" style={{ marginBottom: ".7rem" }}>Opted per subject</div>
        <div className="scroll-x"><table><thead><tr><th>Course</th><th>Term</th><th>Opted</th></tr></thead><tbody>
          {pop.map((c) => (
            <tr key={c.id} style={course === c.id ? { background: "color-mix(in srgb, var(--accent) 13%, transparent)" } : undefined}>
              <td style={{ fontWeight: 500 }}><Link href={"/cohort?tab=subjects&program=" + program + "&course=" + c.id}>{c.name}</Link></td><td className="num">{c.term}</td>
              <td style={{ minWidth: 150 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div className="bar-track" style={{ width: `${(c.opted / maxOpted) * 100}%`, minWidth: 4 }}><div className="bar-fill" style={{ width: "100%" }} /></div><span className="num" style={{ fontSize: ".8rem" }}>{c.opted} <span className="code">({c.share}%)</span></span></div></td>
            </tr>
          ))}
        </tbody></table></div>
      </div>
      <div className="card">
        {roster?.course ? (<>
          <div className="eyebrow">{roster.course.code}</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, margin: ".2rem 0 .1rem" }}>{roster.course.name}</div>
          <div className="code" style={{ marginBottom: ".7rem" }}>{roster.students.length} opted</div>
          <div className="scroll-x" style={{ maxHeight: "62vh", overflowY: "auto" }}><table><tbody>{roster.students.map((s) => (<tr key={s.id}><td className="code">{s.studentId}</td><td>{s.name}</td></tr>))}</tbody></table></div>
        </>) : <div style={{ color: "var(--faint)", fontSize: ".85rem" }}>Select a subject to list who opted it.</div>}
      </div>
    </div>
  );
}

// ---- Students directory ----
export async function StudentsView({ program }: { program: string }) {
  const students = await studentDirectory(program);
  return (
    <div className="card">
      <div className="eyebrow" style={{ marginBottom: ".7rem" }}>{students.length} students</div>
      <div className="scroll-x" style={{ maxHeight: "76vh", overflowY: "auto" }}><table><thead><tr><th>Roll</th><th>Name</th><th>Subj</th><th></th></tr></thead><tbody>
        {students.map((s) => (<tr key={s.id}><td className="code">{s.studentId}</td><td>{s.name}</td><td className="num">{s._count.enrollments}</td><td style={{ textAlign: "right" }}><Link href={"/cohort?tab=compare&program=" + program + "&a=" + s.id} className="code">compare →</Link></td></tr>))}
      </tbody></table></div>
    </div>
  );
}

// ---- Compare ----
export async function CompareView({ a, b, program }: { a?: string; b?: string; program: string }) {
  const students = await prisma.student.findMany({ where: { program }, orderBy: { studentId: "asc" }, select: { id: true, name: true, studentId: true } });
  const cmp = a && b && a !== b ? await compareStudents(a, b) : null;
  return (
    <div className="space-y-4">
      <form className="card" method="GET" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: ".8rem" }}>
        <input type="hidden" name="tab" value="compare" />
        <input type="hidden" name="program" value={program} />
        <label className="code" style={{ display: "block" }}>Student A
          <select name="a" defaultValue={a} style={{ display: "block", marginTop: 4, minWidth: 220 }}><option value="">— pick —</option>{students.map((s) => <option key={s.id} value={s.id}>{s.studentId} — {s.name}</option>)}</select>
        </label>
        <label className="code" style={{ display: "block" }}>Student B
          <select name="b" defaultValue={b} style={{ display: "block", marginTop: 4, minWidth: 220 }}><option value="">— pick —</option>{students.map((s) => <option key={s.id} value={s.id}>{s.studentId} — {s.name}</option>)}</select>
        </label>
        <button className="btn btn-accent">Compare</button>
      </form>
      {!cmp && <div className="card" style={{ color: "var(--faint)", fontSize: ".85rem" }}>Pick two students to see subject overlap and attendance differences.</div>}
      {cmp && (<>
        <div className="card tilt" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div><div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{cmp.a.name} <span style={{ color: "var(--faint)" }}>vs</span> {cmp.b.name}</div><div className="code">{cmp.a.studentId} · {cmp.b.studentId}</div></div>
          <div style={{ textAlign: "right" }}><div className="stat-num num" style={{ fontSize: "2.2rem", color: "var(--accent)" }}>{cmp.jaccard}%</div><div className="code">similarity · {cmp.sharedCount}/{cmp.unionCount} shared</div></div>
          <div style={{ textAlign: "right" }}><div className="code">Overall attendance</div><div className="num" style={{ fontWeight: 600 }}>{cmp.overallA ?? "—"}% <span style={{ color: "var(--faint)" }}>vs</span> {cmp.overallB ?? "—"}%</div></div>
        </div>
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: ".6rem" }}>Shared subjects · {cmp.shared.length}</div>
          <div className="scroll-x"><table><thead><tr><th>T</th><th>Course</th><th style={{ textAlign: "right" }}>A%</th><th style={{ textAlign: "right" }}>B%</th><th style={{ textAlign: "right" }}>Δ</th></tr></thead><tbody>
            {cmp.shared.map((c) => (<tr key={c.code}><td className="num">{c.term}</td><td style={{ fontWeight: 500 }}>{c.name}</td><td className="num" style={{ textAlign: "right" }}>{c.pa ?? "—"}{c.pa != null ? "%" : ""}</td><td className="num" style={{ textAlign: "right" }}>{c.pb ?? "—"}{c.pb != null ? "%" : ""}</td><td className="num" style={{ textAlign: "right", color: c.diff == null ? "var(--faint)" : c.diff < 0 ? "var(--bad)" : "var(--good)" }}>{c.diff != null ? (c.diff > 0 ? "+" : "") + c.diff : "—"}</td></tr>))}
            {cmp.shared.length === 0 && <tr><td colSpan={5} style={{ color: "var(--faint)" }}>No subjects in common.</td></tr>}
          </tbody></table></div>
        </div>
        <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.1rem" }}>
          <div className="card"><div className="eyebrow" style={{ marginBottom: ".5rem" }}>Only {cmp.a.name} · {cmp.onlyA.length}</div><table><tbody>{cmp.onlyA.map((c) => <tr key={c.code}><td className="code" style={{ width: 34 }}>T{c.term}</td><td style={{ fontWeight: 500 }}>{c.name}</td></tr>)}{cmp.onlyA.length === 0 && <tr><td style={{ color: "var(--faint)" }}>—</td></tr>}</tbody></table></div>
          <div className="card"><div className="eyebrow" style={{ marginBottom: ".5rem" }}>Only {cmp.b.name} · {cmp.onlyB.length}</div><table><tbody>{cmp.onlyB.map((c) => <tr key={c.code}><td className="code" style={{ width: 34 }}>T{c.term}</td><td style={{ fontWeight: 500 }}>{c.name}</td></tr>)}{cmp.onlyB.length === 0 && <tr><td style={{ color: "var(--faint)" }}>—</td></tr>}</tbody></table></div>
        </div>
      </>)}
    </div>
  );
}

// ---- Analytics (admin) ----
export async function AnalyticsView({ program }: { program: string }) {
  const [summary, corr, drivers, trend] = await Promise.all([attendanceSummary(program), courseCorrelations(program), attendanceDrivers(program), weeklyTrend(undefined, program)]);
  if (summary.courses.length === 0) return <div className="card" style={{ color: "var(--faint)" }}>No attendance recorded yet — analytics appear once marking begins.</div>;
  const rColor = (r: number | null) => (r == null ? "var(--faint)" : r >= 0.5 ? "var(--good)" : r <= -0.5 ? "var(--bad)" : "var(--text)");
  const cname = new Map(summary.courses.map((c) => [c.code, c.name] as const));
  const short = (s: string) => (s.length > 20 ? s.slice(0, 19) + "…" : s);
  return (
    <div className="space-y-5">
      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.1rem" }}>
        <div className="card"><div className="eyebrow" style={{ marginBottom: ".5rem" }}>Attendance % by course</div><BarPct data={summary.courses.map((c) => ({ label: short(c.name), pct: c.pct }))} labelWidth={128} /></div>
        <div className="card"><div className="eyebrow" style={{ marginBottom: ".5rem" }}>Weekly trend</div><TrendLine data={trend} /></div>
      </div>
      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.1rem" }}>
        <div className="card"><div className="eyebrow" style={{ marginBottom: ".5rem" }}>Morning vs Afternoon/Evening</div><table><tbody>{drivers.slots.map((s) => (<tr key={s.label}><td>{s.label}</td><td className="code">{s.total} marks</td><td className="num" style={{ textAlign: "right", fontWeight: 600 }}>{s.pct}%</td></tr>))}</tbody></table></div>
        <div className="card"><div className="eyebrow" style={{ marginBottom: ".5rem" }}>By professor</div><div className="scroll-x" style={{ maxHeight: 220, overflowY: "auto" }}><table><tbody>{drivers.professors.map((p) => (<tr key={p.label}><td>{p.label}</td><td className="num" style={{ textAlign: "right", fontWeight: 600 }}>{p.pct}%</td></tr>))}</tbody></table></div></div>
      </div>
      <div className="card">
        <div className="eyebrow" style={{ marginBottom: ".3rem" }}>Course ↔ Course correlation</div>
        <p className="code" style={{ marginBottom: ".7rem" }}>Pearson r across students taking both. +1 attend alike · −1 trade off (min 3 shared).</p>
        <div className="scroll-x" style={{ maxHeight: 280, overflowY: "auto" }}><table><thead><tr><th>Course A</th><th>Course B</th><th style={{ textAlign: "right" }}>r</th><th style={{ textAlign: "right" }}>n</th></tr></thead><tbody>
          {corr.matrix.filter((m) => m.r != null).slice(0, 40).map((m, i) => (<tr key={i}><td>{cname.get(m.a) ?? m.a}</td><td>{cname.get(m.b) ?? m.b}</td><td className="num" style={{ textAlign: "right", fontWeight: 600, color: rColor(m.r) }}>{m.r}</td><td className="num" style={{ textAlign: "right", color: "var(--faint)" }}>{m.n}</td></tr>))}
        </tbody></table></div>
      </div>
      <div className="card">
        <div className="eyebrow" style={{ marginBottom: ".5rem" }}>Ranking · lowest first</div>
        <div className="scroll-x" style={{ maxHeight: 400, overflowY: "auto" }}><table><thead><tr><th>Roll</th><th>Name</th><th></th><th style={{ textAlign: "right" }}>%</th></tr></thead><tbody>
          {summary.students.map((s) => (<tr key={s.id}><td className="code">{s.studentId}</td><td>{s.name}</td><td style={{ width: 70 }}><Meter value={s.pct} width={56} /></td><td className="num" style={{ textAlign: "right", fontWeight: 600, color: s.pct != null && s.pct < 75 ? "var(--bad)" : s.pct != null && s.pct >= 85 ? "var(--good)" : "var(--warn)" }}>{s.pct ?? "—"}%</td></tr>))}
        </tbody></table></div>
      </div>
    </div>
  );
}

// ---- Roster mark (admin) ----
// `base` is where this view is mounted — it lives in the /admin console now, but
// keeps the prop so the links never hard-code a route the host doesn't own.
export async function RosterView({ sessionId, program, base = "/admin/mark" }: { sessionId?: string; program: string; base?: string }) {
  const listHref = `${base}?program=${program}`;
  const sessionHref = (id: string) => `${listHref}&session=${id}`;
  if (!sessionId) {
    const sessions = await prisma.session.findMany({ where: { course: { program } }, include: { course: true, _count: { select: { attendance: true } } }, orderBy: [{ date: "asc" }, { slot: "asc" }] });
    return (
      <div className="card">
        <div className="eyebrow" style={{ marginBottom: ".6rem" }}>Pick a session · {sessions.length}</div>
        <div className="scroll-x" style={{ maxHeight: "72vh", overflowY: "auto" }}><table><thead><tr><th>Date</th><th>Slot</th><th>Course</th><th>Marked</th></tr></thead><tbody>
          {sessions.map((s) => (<tr key={s.id}><td className="code" style={{ whiteSpace: "nowrap" }}>{new Date(s.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td><td className="code">{s.slot}</td><td style={{ fontWeight: 500 }}><Link href={sessionHref(s.id)}>{s.course.name}</Link>{s.section && <span className="code" style={{ color: "var(--accent-2)", marginLeft: ".45rem" }}>Sec {s.section}</span>}</td><td>{s._count.attendance > 0 ? <span className="pill pill-good">{s._count.attendance}</span> : <span className="code">—</span>}</td></tr>))}
        </tbody></table></div>
      </div>
    );
  }
  const ses = await prisma.session.findUnique({ where: { id: sessionId }, include: { course: true } });
  if (!ses) return <div className="card">Session not found. <Link href={listHref}>Back</Link></div>;
  const enrolled = await prisma.enrollment.findMany({ where: { courseId: ses.courseId }, include: { student: true }, orderBy: { student: { studentId: "asc" } } });
  const existing = new Map((await prisma.attendance.findMany({ where: { sessionId } })).map((a) => [a.studentId, a.status]));
  const firstTime = existing.size === 0;
  return (
    <form action={saveRoster} className="card">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: ".6rem", flexWrap: "wrap" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.15rem" }}>{ses.course.name}</div>
        <Link href={listHref} className="code">← all sessions</Link>
      </div>
      <div className="code" style={{ margin: ".2rem 0 1rem" }}>{formatDay(sessionKey(ses.date))} · {ses.slot}{ses.section ? ` · Sec ${ses.section}` : ""} · {ses.professor || "—"} · {enrolled.length} enrolled</div>
      <div className="scroll-x" style={{ maxHeight: "56vh", overflowY: "auto", marginBottom: "1rem" }}><table><thead><tr><th>Roll</th><th>Name</th><th style={{ textAlign: "right" }}>Status</th></tr></thead><tbody>
        {enrolled.map((e) => {
          const current = firstTime ? "PRESENT" : normalizeStatus(existing.get(e.studentId) ?? "ABSENT");
          return (
            <tr key={e.studentId}>
              <td className="code">{e.student.studentId}</td>
              <td>{e.student.name}</td>
              <td style={{ textAlign: "right" }}>
                <select name={"s_" + e.studentId} defaultValue={current} style={{ padding: ".35rem 1.9rem .35rem .7rem", fontSize: ".78rem", color: STATUS_META[current].color }}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s === "OD" ? "OD (on duty)" : STATUS_META[s].label}</option>)}
                </select>
              </td>
            </tr>
          );
        })}
      </tbody></table></div>
      <button className="btn btn-accent">Save attendance</button>
      <span className="code" style={{ marginLeft: 10 }}>OD counts as attended · new sessions default to all-present.</span>
    </form>
  );
}
