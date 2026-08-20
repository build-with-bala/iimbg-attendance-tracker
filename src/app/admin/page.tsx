import Link from "next/link";
import { consoleOverview, courseStandings, sessionCoverage } from "@/lib/admin-stats";
import { ticketCounts } from "@/lib/ticket-data";
import { weeklyTrend } from "@/lib/analytics";
import { programName } from "@/lib/programs";
import { formatDay, todayKey } from "@/lib/dates";
import { TrendLine } from "@/components/Charts";
import { PageHeader, Panel, Grid, Stat, MetricCard, RankBars, Empty, pctTone } from "@/components/admin/ui";
import { ProgramSwitch, resolveProgram } from "@/components/admin/ProgramSwitch";

export const dynamic = "force-dynamic";

export default async function AdminOverview({ searchParams }: { searchParams: { program?: string } }) {
  const { program, programs } = await resolveProgram(searchParams.program);
  const [o, courses, coverage, trend, tickets] = await Promise.all([
    consoleOverview(program),
    courseStandings(program),
    sessionCoverage(program),
    weeklyTrend(undefined, program),
    ticketCounts(),
  ]);

  const today = todayKey();
  const todays = coverage.filter((s) => s.date === today);
  const unmarkedPast = coverage.filter((s) => s.past && s.marks === 0);
  const coveragePct = o.sessionsHeld ? Math.round((o.sessionsMarked / o.sessionsHeld) * 1000) / 10 : null;

  return (
    <>
      <PageHeader
        title="Overview"
        eyebrow={`${programName(program)} · staff console`}
        right={<ProgramSwitch programs={programs} program={program} base="/admin" />}
      />

      <Grid min={250}>
        <MetricCard
          label="Cohort attendance" value={o.overallPct ?? 0} suffix="%" decimals={1} t={pctTone(o.overallPct)}
          subs={[
            { n: o.present, t: "credited", tone: "good" },
            { n: o.od, t: "of it OD", tone: "accent" },
            { n: o.marks - o.present, t: "absent", tone: "bad" },
          ]}
        />
        <MetricCard
          label="Students" value={o.students} t="accent"
          subs={[
            { n: o.safe, t: "on track", tone: "good" },
            { n: o.atRisk, t: "at risk", tone: "warn" },
            { n: o.failing, t: "failing", tone: "bad" },
          ]}
        />
        <MetricCard
          label="Marking coverage" value={coveragePct ?? 0} suffix="%" decimals={1} t={pctTone(coveragePct)}
          subs={[
            { n: o.sessionsMarked, t: "marked", tone: "good" },
            { n: o.sessionsHeld - o.sessionsMarked, t: "missing", tone: o.sessionsHeld - o.sessionsMarked ? "warn" : undefined },
            { n: o.sessions - o.sessionsHeld, t: "upcoming" },
          ]}
        />
      </Grid>

      <div style={{ height: "1rem" }} />

      <Grid min={168} gap=".85rem">
        <Stat label="Courses" value={o.courses} hint={`${o.enrollments} enrolments`} />
        <Stat label="Sessions" value={o.sessions} hint={`${o.sessionsHeld} held so far`} />
        <Stat label="Marks recorded" value={o.marks} hint={`${o.od} on duty`} />
        <Stat label="Never marked" value={o.unmarkedStudents} t={o.unmarkedStudents ? "warn" : "good"} hint="students with no attendance" />
        <Stat label="Queries waiting" value={tickets.open} t={tickets.open ? "warn" : "good"} hint={<Link href="/admin/queries" className="code">open the queue →</Link>} />
      </Grid>

      <div style={{ height: "1.15rem" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: "1.15rem" }} className="adm-two">
        <Panel title="Weekly attendance trend">
          {trend.length ? <TrendLine data={trend} /> : <Empty>No attendance recorded yet.</Empty>}
        </Panel>
        <Panel title="Today" right={<span className="code">{formatDay(today, { weekday: "long", day: "2-digit", month: "long" })}</span>}>
          {todays.length === 0 ? (
            <Empty>No classes scheduled today.</Empty>
          ) : (
            <div style={{ display: "grid", gap: ".55rem" }}>
              {todays.map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".7rem" }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="code" style={{ color: "var(--accent-2)" }}>{s.slot}{s.section && ` · ${s.section}`}</div>
                    <div style={{ fontSize: ".88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.course}</div>
                  </div>
                  {s.marks ? (
                    <span className="pill pill-good">{s.marks} marked</span>
                  ) : (
                    <Link href={`/admin/mark?session=${s.id}`} className="pill pill-warn" style={{ textDecoration: "none" }}>mark →</Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div style={{ height: "1.15rem" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.15rem" }} className="adm-two">
        <Panel title="Attendance by course" right={<Link href="/admin/courses" className="code">all courses →</Link>}>
          <RankBars rows={courses.slice(0, 7).map((c) => ({ label: c.name, value: c.pct, note: `${c.opted} opted`, href: `/admin/courses#${c.code}` }))} />
        </Panel>
        <Panel title="Lowest standing" right={<Link href="/admin/students" className="code">all students →</Link>}>
          {o.worst.length ? (
            <RankBars rows={o.worst.map((s) => ({ label: s.name, value: s.pct, note: s.studentId, href: `/admin/students#${s.studentId}` }))} />
          ) : <Empty>No attendance recorded yet.</Empty>}
        </Panel>
      </div>

      {unmarkedPast.length > 0 && (
        <>
          <div style={{ height: "1.15rem" }} />
          <Panel
            title={`Unmarked classes · ${unmarkedPast.length}`}
            right={<Link href="/admin/sessions" className="code">session list →</Link>}
          >
            <p className="code" style={{ marginBottom: ".8rem" }}>Classes that have already happened with nobody marked.</p>
            <div className="scroll-x">
              <table>
                <thead><tr><th>Date</th><th>Slot</th><th>Course</th><th style={{ textAlign: "right" }}></th></tr></thead>
                <tbody>
                  {unmarkedPast.slice(0, 8).map((s) => (
                    <tr key={s.id}>
                      <td className="code" style={{ whiteSpace: "nowrap" }}>{formatDay(s.date, { day: "2-digit", month: "short" })}</td>
                      <td className="code">{s.slot}</td>
                      <td style={{ fontWeight: 500 }}>{s.course}{s.section && <span className="code"> · {s.section}</span>}</td>
                      <td style={{ textAlign: "right" }}><Link href={`/admin/mark?session=${s.id}`} className="code">mark →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      <style dangerouslySetInnerHTML={{ __html: `@media(max-width:880px){.adm-two{grid-template-columns:1fr !important}}` }} />
    </>
  );
}
