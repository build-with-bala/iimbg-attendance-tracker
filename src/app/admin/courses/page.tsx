import Link from "next/link";
import { courseStandings } from "@/lib/admin-stats";
import { programName } from "@/lib/programs";
import { PageHeader, Panel, Grid, Stat, Bar, RankBars, Empty, tone, pctTone } from "@/components/admin/ui";
import { ProgramSwitch, resolveProgram } from "@/components/admin/ProgramSwitch";

export const dynamic = "force-dynamic";

export default async function AdminCourses({ searchParams }: { searchParams: { program?: string } }) {
  const { program, programs } = await resolveProgram(searchParams.program);
  const courses = await courseStandings(program);

  const totalOpted = courses.reduce((a, c) => a + c.opted, 0);
  const withSessions = courses.filter((c) => c.sessions > 0);
  const noSessions = courses.filter((c) => c.sessions === 0);

  return (
    <>
      <PageHeader
        title="Courses"
        eyebrow={`${programName(program)} · ${courses.length} electives`}
        lede="Attendance is over marks actually recorded. Effective classes account for parallel sections — a student attends the common classes plus one section."
        right={<ProgramSwitch programs={programs} program={program} base="/admin/courses" />}
      />

      <Grid min={168} gap=".85rem">
        <Stat label="Electives" value={courses.length} hint={`${noSessions.length} with no timetable`} />
        <Stat label="Enrolments" value={totalOpted} hint="student × course pairs" />
        <Stat label="Scheduled classes" value={courses.reduce((a, c) => a + c.sessions, 0)} />
        <Stat label="Classes marked" value={courses.reduce((a, c) => a + c.marked, 0)} t="good" />
      </Grid>

      <div style={{ height: "1.15rem" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.15rem" }} className="adm-two">
        <Panel title="Attendance by course">
          <RankBars rows={withSessions.map((c) => ({ label: c.name, value: c.pct, note: `${c.held} marks` }))} />
        </Panel>
        <Panel title="Demand — students opted">
          <RankBars rows={[...courses].sort((a, b) => b.opted - a.opted).map((c) => ({ label: c.name, value: c.opted, note: `T${c.term}` }))} unit="" />
        </Panel>
      </div>

      <div style={{ height: "1.15rem" }} />

      <Panel title="Every elective">
        {courses.length === 0 ? <Empty>No courses loaded for this programme.</Empty> : (
          <div className="scroll-x">
            <table>
              <thead>
                <tr>
                  <th>Code</th><th>Course</th>
                  <th style={{ textAlign: "right" }}>T</th>
                  <th style={{ textAlign: "right" }}>Opted</th>
                  <th style={{ textAlign: "right" }}>Classes</th>
                  <th style={{ textAlign: "right" }}>Marked</th>
                  <th style={{ textAlign: "right" }}>Att.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} id={c.code}>
                    <td className="code" style={{ whiteSpace: "nowrap" }}>{c.code}</td>
                    <td style={{ fontWeight: 500 }}>
                      {c.name}
                      {c.od > 0 && <span className="code" style={{ color: "var(--accent-2)", marginLeft: ".4rem", whiteSpace: "nowrap" }}>+{c.od} OD</span>}
                    </td>
                    <td className="num" style={{ textAlign: "right" }}>{c.term}</td>
                    <td className="num" style={{ textAlign: "right" }}>{c.opted}</td>
                    <td className="num" style={{ textAlign: "right" }}>
                      {c.sessions || <span style={{ color: "var(--faint)" }}>—</span>}
                      {c.effective > 0 && c.effective !== c.sessions && <span className="code"> ({c.effective} eff.)</span>}
                    </td>
                    <td className="num" style={{ textAlign: "right", color: c.marked ? "var(--text)" : "var(--faint)" }}>{c.marked || "—"}</td>
                    <td className="num" style={{ textAlign: "right", color: tone(pctTone(c.pct)) }}>{c.pct ?? "—"}{c.pct != null ? "%" : ""}</td>
                    <td style={{ width: 72 }}><Bar value={c.pct} width={60} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {noSessions.length > 0 && (
        <>
          <div style={{ height: "1.15rem" }} />
          <Panel title={`No timetable · ${noSessions.length}`}>
            <p className="code" style={{ marginBottom: ".7rem" }}>Electives students opted into that have no scheduled classes loaded — attendance can&apos;t be tracked for these.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".45rem" }}>
              {noSessions.map((c) => <span key={c.id} className="pill">{c.code} · {c.name}</span>)}
            </div>
          </Panel>
        </>
      )}

      <style dangerouslySetInnerHTML={{ __html: `@media(max-width:880px){.adm-two{grid-template-columns:1fr !important}}` }} />
    </>
  );
}
