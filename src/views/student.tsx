import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { weeklyTrend, studentVsClass } from "@/lib/analytics";
import { mySubjects } from "@/lib/insights";
import { markSelf } from "@/lib/actions";
import { TrendLine } from "@/components/Charts";
import { Ring, Meter } from "@/components/Ring";

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "var(--faint)", fontSize: ".85rem", padding: "1.5rem 0", textAlign: "center" }}>{children}</div>;
}

export async function StandingView({ studentId }: { studentId: string }) {
  const [trend, vs, rows] = await Promise.all([
    weeklyTrend(studentId),
    studentVsClass(studentId),
    prisma.attendance.findMany({ where: { studentId }, include: { session: { include: { course: true } } } }),
  ]);
  const present = rows.filter((r) => r.status === "PRESENT").length;
  const overall = rows.length ? Math.round((present / rows.length) * 1000) / 10 : null;
  const enrolled = await prisma.enrollment.count({ where: { studentId } });
  const best = [...vs].sort((a, b) => (b.diff ?? -99) - (a.diff ?? -99))[0];
  const worst = [...vs].sort((a, b) => (a.diff ?? 99) - (b.diff ?? 99))[0];

  return (
    <div className="space-y-5">
      <div className="card tilt" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2rem", alignItems: "center", padding: "1.7rem 1.8rem" }} data-stack>
        <Ring value={overall} size={196} label="attendance" />
        <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: ".8rem" }}>
          <Stat k="Attended" v={`${present}`} sub={`of ${rows.length} held`} />
          <Stat k="Subjects" v={`${enrolled}`} sub="this term" />
          <Stat k="Strongest" v={best?.diff != null ? `${best.diff > 0 ? "+" : ""}${best.diff}` : "—"} sub={best?.code || "no data"} tone="good" />
          <Stat k="Watch" v={worst?.diff != null ? `${worst.diff}` : "—"} sub={worst?.code || "no data"} tone="bad" />
        </div>
      </div>
      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "1.1rem" }}>
        <div className="card"><div className="eyebrow" style={{ marginBottom: ".7rem" }}>Weekly trend</div>{trend.length ? <TrendLine data={trend} /> : <Empty>Mark a class to start your trend.</Empty>}</div>
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: ".7rem" }}>My % vs class</div>
          {vs.length ? (
            <div className="scroll-x"><table><thead><tr><th>Course</th><th>Me</th><th></th><th style={{ textAlign: "right" }}>Δ</th></tr></thead><tbody>
              {vs.map((c) => (<tr key={c.code}><td className="code">{c.code}</td><td className="num">{c.mine ?? "—"}%</td><td><Meter value={c.mine} width={70} /></td><td className="num" style={{ textAlign: "right", color: (c.diff ?? 0) < 0 ? "var(--bad)" : "var(--good)" }}>{c.diff != null ? (c.diff > 0 ? "+" : "") + c.diff : "—"}</td></tr>))}
            </tbody></table></div>
          ) : <Empty>No attendance recorded yet.</Empty>}
        </div>
      </div>
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
          <div className="eyebrow" style={{ marginBottom: ".6rem" }}>Term {t}</div>
          <div className="scroll-x"><table><thead><tr><th>Code</th><th>Course</th><th>Cr</th><th>Peers</th><th>Cls</th><th></th></tr></thead><tbody>
            {list.map((c) => (<tr key={c.id}><td className="code">{c.code}</td><td>{c.name}</td><td className="num">{c.credits}</td><td><span className="num" style={{ fontWeight: 600 }}>{c.opted}</span> <span className="code">({c.share}%)</span></td><td className="num">{c.sessions}</td><td style={{ textAlign: "right" }}><Link href={"/cohort?tab=subjects&course=" + c.id} className="code">who →</Link></td></tr>))}
          </tbody></table></div>
        </div>
      ))}
    </div>
  );
}

export async function MarkMeView({ studentId }: { studentId: string }) {
  const courseIds = (await prisma.enrollment.findMany({ where: { studentId }, select: { courseId: true } })).map((e) => e.courseId);
  const sessions = await prisma.session.findMany({ where: { courseId: { in: courseIds } }, include: { course: true }, orderBy: [{ date: "asc" }, { slot: "asc" }] });
  const mine = new Map((await prisma.attendance.findMany({ where: { studentId } })).map((a) => [a.sessionId, a.status]));
  const byDate = new Map<string, typeof sessions>();
  for (const s of sessions) { const k = new Date(s.date).toISOString().slice(0, 10); (byDate.get(k) ?? byDate.set(k, []).get(k)!).push(s); }
  return (
    <div className="space-y-4">
      <p style={{ color: "var(--muted)", fontSize: ".88rem", margin: 0 }}>Mark yourself for each class — tap ✓ present or ✕ absent. Change it anytime.</p>
      {[...byDate.entries()].map(([d, list]) => (
        <div key={d} className="card">
          <div className="eyebrow" style={{ marginBottom: ".5rem" }}>{new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short" })}</div>
          <div className="scroll-x"><table><tbody>
            {list.map((s) => {
              const st = mine.get(s.id);
              return (
                <tr key={s.id}>
                  <td className="code" style={{ whiteSpace: "nowrap" }}>{s.slot}</td>
                  <td>{s.course.code} · {s.course.name}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {st && <span className={"pill mr-1 " + (st === "PRESENT" ? "pill-good" : "pill-bad")} style={{ marginRight: 6 }}>{st === "PRESENT" ? "present" : "absent"}</span>}
                    <form action={markSelf} style={{ display: "inline" }}><input type="hidden" name="sessionId" value={s.id} /><input type="hidden" name="status" value="PRESENT" /><button className="btn" title="Present">✓</button></form>
                    <form action={markSelf} style={{ display: "inline", marginLeft: 4 }}><input type="hidden" name="sessionId" value={s.id} /><input type="hidden" name="status" value="ABSENT" /><button className="btn" title="Absent">✕</button></form>
                  </td>
                </tr>
              );
            })}
          </tbody></table></div>
        </div>
      ))}
    </div>
  );
}

function Stat({ k, v, sub, tone }: { k: string; v: string; sub?: string; tone?: "good" | "bad" }) {
  const col = tone === "good" ? "var(--good)" : tone === "bad" ? "var(--bad)" : "var(--text)";
  return (
    <div className="card-flat" style={{ padding: ".75rem .85rem" }}>
      <div className="eyebrow">{k}</div>
      <div className="stat-num num" style={{ fontSize: "1.6rem", marginTop: 4, color: col }}>{v}</div>
      {sub && <div className="code" style={{ marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
