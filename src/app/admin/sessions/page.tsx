import Link from "next/link";
import { sessionCoverage } from "@/lib/admin-stats";
import { programName } from "@/lib/programs";
import { formatDay, todayKey } from "@/lib/dates";
import { PageHeader, Panel, Grid, Stat, Empty, tone, pctTone } from "@/components/admin/ui";
import { ProgramSwitch, resolveProgram } from "@/components/admin/ProgramSwitch";

export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "unmarked", label: "Needs marking" },
  { key: "past", label: "Held" },
  { key: "upcoming", label: "Upcoming" },
  { key: "all", label: "All" },
] as const;

export default async function AdminSessions({ searchParams }: { searchParams: { program?: string; view?: string } }) {
  const { program, programs } = await resolveProgram(searchParams.program);
  const all = await sessionCoverage(program);
  const view = VIEWS.some((v) => v.key === searchParams.view) ? searchParams.view! : "unmarked";
  const today = todayKey();

  const shown = all.filter((s) =>
    view === "unmarked" ? s.past && s.marks === 0
    : view === "past" ? s.past
    : view === "upcoming" ? !s.past
    : true
  );
  // newest first for anything historical; soonest first for what's ahead
  shown.sort((a, b) => (view === "upcoming" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) || a.slot.localeCompare(b.slot));

  const held = all.filter((s) => s.past);
  const byDate = new Map<string, typeof shown>();
  for (const s of shown) (byDate.get(s.date) ?? byDate.set(s.date, []).get(s.date)!).push(s);

  return (
    <>
      <PageHeader
        title="Sessions"
        eyebrow={`${programName(program)} · ${all.length} scheduled`}
        lede="Every class on the timetable and whether anyone has been marked for it."
        right={<ProgramSwitch programs={programs} program={program} base="/admin/sessions" />}
      />

      <Grid min={168} gap=".85rem">
        <Stat label="Scheduled" value={all.length} />
        <Stat label="Held" value={held.length} hint={`up to ${formatDay(today, { day: "2-digit", month: "short" })}`} />
        <Stat label="Marked" value={held.filter((s) => s.marks > 0).length} t="good" />
        <Stat label="Needs marking" value={held.filter((s) => s.marks === 0).length} t={held.some((s) => s.marks === 0) ? "warn" : "good"} />
      </Grid>

      <div style={{ height: "1.15rem" }} />

      <Panel
        title={`${shown.length} classes`}
        right={
          <div className="seg" style={{ gap: 4, padding: 4 }}>
            {VIEWS.map((v) => (
              <a key={v.key} href={`/admin/sessions?program=${program}&view=${v.key}`}
                className={"seg-it" + (v.key === view ? " seg-on" : "")} style={{ padding: ".35rem .75rem", fontSize: ".78rem" }}>
                {v.label}
              </a>
            ))}
          </div>
        }
      >
        {shown.length === 0 ? (
          <Empty>{view === "unmarked" ? "Every class held so far has been marked." : "Nothing here."}</Empty>
        ) : (
          <div style={{ display: "grid", gap: "1.1rem", minWidth: 0 }}>
            {[...byDate.entries()].map(([d, list]) => (
              // min-width:0 or this grid item takes the table's min-content width
              // and pushes the page sideways instead of letting .scroll-x scroll
              <div key={d} style={{ minWidth: 0 }}>
                <div className="eyebrow" style={{ marginBottom: ".5rem" }}>
                  {formatDay(d, { weekday: "long", day: "2-digit", month: "long" })}
                  {d === today && <span style={{ color: "var(--accent-2)" }}> · today</span>}
                </div>
                <div className="scroll-x">
                  <table>
                    <thead><tr><th>Slot</th><th>Course</th><th>Professor</th><th style={{ textAlign: "right" }}>Marked</th><th style={{ textAlign: "right" }}>Att.</th><th></th></tr></thead>
                    <tbody>
                      {list.map((s) => (
                        <tr key={s.id}>
                          <td className="code" style={{ whiteSpace: "nowrap" }}>{s.slot}</td>
                          <td style={{ fontWeight: 500 }}>{s.course}{s.section && <span className="code"> · sec {s.section}</span>}</td>
                          <td style={{ color: "var(--faint)", fontSize: ".82rem" }}>{s.professor || "—"}</td>
                          <td className="num" style={{ textAlign: "right", color: s.marks ? "var(--text)" : "var(--faint)" }}>
                            {s.marks ? <>{s.marks}<span className="code">/{s.enrolled}</span></> : "—"}
                          </td>
                          <td className="num" style={{ textAlign: "right", color: tone(pctTone(s.pct)) }}>{s.pct ?? "—"}{s.pct != null ? "%" : ""}</td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <Link href={`/admin/mark?session=${s.id}&program=${program}`} className="code">{s.marks ? "edit →" : "mark →"}</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
