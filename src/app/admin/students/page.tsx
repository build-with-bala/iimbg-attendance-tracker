import { studentStandings } from "@/lib/admin-stats";
import { programName } from "@/lib/programs";
import { POLICY } from "@/lib/grades";
import { PageHeader, Panel, Grid, Stat, Bar, Empty, tone, pctTone } from "@/components/admin/ui";
import { ProgramSwitch, resolveProgram } from "@/components/admin/ProgramSwitch";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "risk", label: "At risk" },
  { key: "failing", label: "Failing" },
  { key: "unmarked", label: "Never marked" },
] as const;

export default async function AdminStudents({ searchParams }: { searchParams: { program?: string; filter?: string } }) {
  const { program, programs } = await resolveProgram(searchParams.program);
  const rows = await studentStandings(program);
  const filter = FILTERS.some((f) => f.key === searchParams.filter) ? searchParams.filter! : "all";

  const shown = rows.filter((r) =>
    filter === "risk" ? r.projected != null && r.projected < POLICY.safe
    : filter === "failing" ? r.projected != null && r.projected < POLICY.drop2
    : filter === "unmarked" ? r.held === 0
    : true
  );

  const graded = rows.filter((r) => r.pct != null);
  const median = graded.length ? graded[Math.floor(graded.length / 2)].pct : null;

  return (
    <>
      <PageHeader
        title="Students"
        eyebrow={`${programName(program)} · ${rows.length} on roll`}
        lede="Standing is projected to the end of term — what each student finishes on if they attend everything left. OD counts as attended."
        right={<ProgramSwitch programs={programs} program={program} base="/admin/students" />}
      />

      <Grid min={168} gap=".85rem">
        <Stat label="On roll" value={rows.length} />
        <Stat label="Median attendance" value={median ?? "—"} suffix={median != null ? "%" : ""} decimals={1} t={pctTone(median)} />
        <Stat label="Below 80%" value={rows.filter((r) => r.projected != null && r.projected < POLICY.safe).length} t="warn" hint="projected grade drop" />
        <Stat label="Below 50%" value={rows.filter((r) => r.projected != null && r.projected < POLICY.drop2).length} t="bad" hint="projected fail" />
      </Grid>

      <div style={{ height: "1.15rem" }} />

      <Panel
        title={`${shown.length} shown`}
        right={
          <div className="seg" style={{ gap: 4, padding: 4 }}>
            {FILTERS.map((f) => (
              <a key={f.key} href={`/admin/students?program=${program}&filter=${f.key}`}
                className={"seg-it" + (f.key === filter ? " seg-on" : "")} style={{ padding: ".35rem .75rem", fontSize: ".78rem" }}>
                {f.label}
              </a>
            ))}
          </div>
        }
      >
        {shown.length === 0 ? <Empty>Nobody matches this filter — good news.</Empty> : (
          <div className="scroll-x">
            <table>
              <thead>
                <tr>
                  <th>Roll</th><th>Name</th>
                  <th style={{ textAlign: "right" }}>Now</th><th></th>
                  <th style={{ textAlign: "right" }}>Projected</th>
                  <th style={{ textAlign: "right" }}>Marked</th>
                  <th style={{ textAlign: "right" }}>OD</th>
                  <th style={{ textAlign: "right" }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((s) => (
                  <tr key={s.id} id={s.studentId}>
                    <td className="code" style={{ whiteSpace: "nowrap" }}>{s.studentId}</td>
                    <td style={{ fontWeight: 500 }}>{s.name}<div className="code" style={{ fontSize: ".68rem" }}>{s.subjects} subjects</div></td>
                    <td className="num" style={{ textAlign: "right", color: tone(pctTone(s.pct)) }}>{s.pct ?? "—"}{s.pct != null ? "%" : ""}</td>
                    <td style={{ width: 72 }}><Bar value={s.pct} width={60} /></td>
                    <td className="num" style={{ textAlign: "right", color: tone(pctTone(s.projected)) }}>{s.projected ?? "—"}{s.projected != null ? "%" : ""}</td>
                    <td className="num" style={{ textAlign: "right", color: s.held ? "var(--text)" : "var(--faint)" }}>{s.held}/{s.total}</td>
                    <td className="num" style={{ textAlign: "right", color: s.od ? "var(--accent-2)" : "var(--faint)" }}>{s.od || "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className="code" style={{ color: tone(s.status.tone) }}>{s.status.label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
