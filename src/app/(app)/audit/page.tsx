import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { prisma } from "@/lib/prisma";
import { CURRENT_TERM } from "@/lib/terms";
import { loadedPrograms, coursePopularity, studentSafety, allClasses, ROMAN, courseRoster } from "@/lib/insights";
import { programName } from "@/lib/programs";
import { Tabs } from "@/components/Tabs";
import { MarkMeView } from "@/views/student";
import { AnalyticsView } from "@/views/cohort";
import { formatDay, sessionKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

type Params = { program?: string; term?: string; tab?: string; course?: string };

export default async function PreviousTermAudit({ searchParams }: { searchParams: Params }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const programs = await loadedPrograms();
  const own = viewer.student?.program;
  const canSwitch = viewer.isAdmin || !own;
  const program = (canSwitch && programs.includes(searchParams.program || "") ? searchParams.program : null)
    || own || (programs.includes("DBM") ? "DBM" : programs[0]) || "DBM";
  const rows = await prisma.course.findMany({ where: { program, term: { lt: CURRENT_TERM } }, select: { term: true }, distinct: ["term"], orderBy: { term: "desc" } });
  const terms = rows.map((r) => r.term);
  const requested = Number(searchParams.term);
  const term = terms.includes(requested) ? requested : terms[0];
  const hasOwn = !!viewer.student && program === own;
  const tabs = [
    ...(hasOwn ? [{ key: "standing", label: "My attendance" }, { key: "records", label: "My class records" }] : []),
    { key: "subjects", label: "Subjects" },
    { key: "timetable", label: "Timetable" },
    ...(viewer.isAdmin ? [{ key: "analytics", label: "Batch analytics" }] : []),
  ];
  const tab = tabs.some((t) => t.key === searchParams.tab) ? searchParams.tab! : tabs[0].key;
  const extra = `program=${encodeURIComponent(program)}&term=${term ?? ""}`;
  const href = (p: string, t: number, selectedTab = tab) => `/audit?program=${encodeURIComponent(p)}&term=${t}&tab=${selectedTab}`;

  return (
    <div className="space-y-4">
      <div>
        <div className="eyebrow">{programName(program)} · Completed terms</div>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.7rem)", marginTop: ".5rem" }}>Previous Term Audit</h1>
        <p style={{ color: "var(--muted)", marginTop: ".6rem" }}>Review your previous terms here. Term {ROMAN[CURRENT_TERM] ?? CURRENT_TERM} is shown in the current Student and Cohort views.</p>
      </div>
      {canSwitch && programs.length > 1 && <div className="seg" aria-label="Programme">{programs.map((p) => <Link key={p} href={href(p, term ?? CURRENT_TERM - 1)} className={"seg-it" + (p === program ? " seg-on" : "")}>{p}</Link>)}</div>}
      {terms.length === 0 ? <div className="card">No previous terms available for this programme.</div> : <>
        <div className="seg" aria-label="Previous term">{terms.map((t) => <Link key={t} href={href(program, t)} className={"seg-it" + (t === term ? " seg-on" : "")}>Term {ROMAN[t] ?? t}</Link>)}</div>
        <Tabs tabs={tabs} base="/audit" active={tab} extra={extra} />
        {tab === "standing" && hasOwn && <AttendanceAudit studentId={viewer.student!.id} term={term} />}
        {tab === "records" && hasOwn && <MarkMeView studentId={viewer.student!.id} term={term} />}
        {tab === "subjects" && <SubjectAudit program={program} term={term} course={searchParams.course} />}
        {tab === "timetable" && <TimetableAudit program={program} term={term} isAdmin={viewer.isAdmin} />}
        {tab === "analytics" && viewer.isAdmin && <AnalyticsView program={program} term={term} />}
      </>}
    </div>
  );
}

async function AttendanceAudit({ studentId, term }: { studentId: string; term: number }) {
  const { overall, courses } = await studentSafety(studentId, term);
  return <div className="card">
    <div className="eyebrow">Term {ROMAN[term] ?? term} · My attendance</div>
    <p style={{ margin: ".7rem 0" }}>{overall.present} attended / {overall.held} recorded · {overall.pct ?? "—"}% attendance</p>
    <p className="code" style={{ marginBottom: ".8rem" }}>OD counts as attended. Unmarked classes are not counted as absences.</p>
    <div className="scroll-x"><table><thead><tr><th>Course</th><th>Attended</th><th>Recorded</th><th>Scheduled</th><th>Attendance</th></tr></thead><tbody>
      {courses.map((c) => <tr key={c.id}><td>{c.name}</td><td className="num">{c.present}</td><td className="num">{c.held}</td><td className="num">{c.total}</td><td className="num">{c.pct ?? "—"}%</td></tr>)}
      {!courses.length && <tr><td colSpan={5}>No scheduled subjects for this term.</td></tr>}
    </tbody></table></div>
  </div>;
}

async function SubjectAudit({ program, term, course }: { program: string; term: number; course?: string }) {
  const subjects = await coursePopularity(program, term);
  const roster = course && subjects.some((c) => c.id === course) ? await courseRoster(course) : null;
  return <div className="space-y-4"><div className="card"><div className="eyebrow">Term {ROMAN[term] ?? term} · Subjects</div>
    <div className="scroll-x"><table><thead><tr><th>Course</th><th>Credits</th><th>Opted</th><th>Classes</th></tr></thead><tbody>
      {subjects.map((c) => <tr key={c.id}><td><Link href={`/audit?tab=subjects&program=${program}&term=${term}&course=${c.id}`}>{c.name}</Link></td><td className="num">{c.credits}</td><td className="num">{c.opted}</td><td className="num">{c.sessions}</td></tr>)}
    </tbody></table></div></div>
    {roster?.course && <div className="card"><h2>{roster.course.name}</h2><div className="scroll-x"><table><thead><tr><th>Roll</th><th>Name</th></tr></thead><tbody>{roster.students.map((s) => <tr key={s.id}><td className="code">{s.studentId}</td><td>{s.name}</td></tr>)}</tbody></table></div></div>}
  </div>;
}

async function TimetableAudit({ program, term, isAdmin }: { program: string; term: number; isAdmin: boolean }) {
  const sessions = await allClasses(program, term);
  return <div className="card"><div className="eyebrow">Term {ROMAN[term] ?? term} · {sessions.length} sessions</div>
    <div className="scroll-x"><table><thead><tr><th>Date</th><th>Slot</th><th>Course</th><th>Professor</th>{isAdmin && <th>Roster</th>}</tr></thead><tbody>
      {sessions.map((s) => <tr key={s.id}><td className="code" style={{ whiteSpace: "nowrap" }}>{formatDay(sessionKey(s.date))}</td><td className="code" style={{ whiteSpace: "nowrap" }}>{s.slot}</td><td>{s.course.name}{s.section ? ` · Sec ${s.section}` : ""}</td><td>{s.professor || "—"}</td>{isAdmin && <td><Link href={`/admin/mark?program=${program}&session=${s.id}`}>Review</Link></td>}</tr>)}
      {!sessions.length && <tr><td colSpan={isAdmin ? 5 : 4}>No sessions for this term.</td></tr>}
    </tbody></table></div>
  </div>;
}
