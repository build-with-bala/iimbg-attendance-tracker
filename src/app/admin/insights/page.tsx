import { attendanceSummary, courseCorrelations, attendanceDrivers } from "@/lib/analytics";
import { programName } from "@/lib/programs";
import { PageHeader, Panel, Empty, RankBars, tone, pctTone } from "@/components/admin/ui";
import { ProgramSwitch, resolveProgram } from "@/components/admin/ProgramSwitch";

export const dynamic = "force-dynamic";

export default async function AdminInsights({ searchParams }: { searchParams: { program?: string } }) {
  const { program, programs } = await resolveProgram(searchParams.program);
  const [summary, corr, drivers] = await Promise.all([
    attendanceSummary(program),
    courseCorrelations(program),
    attendanceDrivers(program),
  ]);

  const header = (
    <PageHeader
      title="Insights"
      eyebrow={`${programName(program)} · analysis`}
      lede="What actually moves attendance: time of day, who teaches, and which electives students trade off against each other."
      right={<ProgramSwitch programs={programs} program={program} base="/admin/insights" />}
    />
  );

  if (summary.courses.length === 0) {
    return <>{header}<Panel><Empty>No attendance recorded yet — insights appear once marking begins.</Empty></Panel></>;
  }

  const cname = new Map(summary.courses.map((c) => [c.code, c.name] as const));
  const rColor = (r: number | null) => (r == null ? "var(--faint)" : r >= 0.5 ? "var(--good)" : r <= -0.5 ? "var(--bad)" : "var(--text)");
  const pairs = corr.matrix.filter((m) => m.r != null);

  return (
    <>
      {header}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.15rem" }} className="adm-two">
        <Panel title="Time of day">
          {drivers.slots.length ? (
            <RankBars rows={drivers.slots.map((s) => ({ label: s.label, value: s.pct, note: `${s.total} marks` }))} />
          ) : <Empty>Not enough data.</Empty>}
        </Panel>
        <Panel title="By professor">
          {drivers.professors.length ? (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              <RankBars rows={drivers.professors.map((p) => ({ label: p.label, value: p.pct, note: `${p.total} marks` }))} />
            </div>
          ) : <Empty>Not enough data.</Empty>}
        </Panel>
      </div>

      <div style={{ height: "1.15rem" }} />

      <Panel title="Course ↔ course correlation">
        <p className="code" style={{ marginBottom: ".85rem" }}>
          Pearson r across students taking both electives. Near +1 means the same people show up to both; near −1 means they
          trade one off against the other. Needs at least 3 shared students.
        </p>
        {pairs.length === 0 ? <Empty>Not enough overlap yet to correlate.</Empty> : (
          <div className="scroll-x" style={{ maxHeight: 420, overflowY: "auto" }}>
            <table>
              <thead><tr><th>Course A</th><th>Course B</th><th style={{ textAlign: "right" }}>r</th><th style={{ textAlign: "right" }}>n</th></tr></thead>
              <tbody>
                {pairs.slice(0, 60).map((m, i) => (
                  <tr key={i}>
                    <td>{cname.get(m.a) ?? m.a}</td>
                    <td>{cname.get(m.b) ?? m.b}</td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 600, color: rColor(m.r) }}>{m.r}</td>
                    <td className="num" style={{ textAlign: "right", color: "var(--faint)" }}>{m.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div style={{ height: "1.15rem" }} />

      <Panel title="Attendance spread by course">
        <RankBars rows={summary.courses.map((c) => ({ label: c.name, value: c.pct, note: `${c.present}/${c.total}` }))} />
      </Panel>

      <style dangerouslySetInnerHTML={{ __html: `@media(max-width:880px){.adm-two{grid-template-columns:1fr !important}}` }} />
    </>
  );
}
