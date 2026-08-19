import Link from "next/link";
import { redirect } from "next/navigation";
import { Tabs } from "@/components/Tabs";
import { getViewer } from "@/lib/viewer";
import { TimetableView, SubjectsView, StudentsView, CompareView } from "@/views/cohort";
import { cohortLabel, loadedPrograms } from "@/lib/insights";

export const dynamic = "force-dynamic";

export default async function CohortHub({ searchParams }: { searchParams: { tab?: string; course?: string; a?: string; b?: string; session?: string; when?: string; program?: string } }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const isAdmin = viewer.isAdmin;

  // Students are locked to their own programme; admins and accounts without a
  // student row (e.g. faculty) can switch between the loaded programmes.
  const programs = await loadedPrograms();
  const own = viewer.student?.program ?? null;
  const canSwitch = isAdmin || !own;
  const requested = searchParams.program;
  const program =
    (canSwitch && requested && programs.includes(requested) ? requested : null) ??
    own ??
    (programs.includes("DBM") ? "DBM" : programs[0] ?? "DBM");

  // Analytics and roster marking live in the /admin console now, so this hub is
  // the same batch view for everyone.
  const tabs = [
    { key: "timetable", label: "Timetable" },
    { key: "subjects", label: "Subjects" },
    { key: "students", label: "Students" },
    { key: "compare", label: "Compare" },
  ];
  const tab = tabs.some((t) => t.key === searchParams.tab) ? searchParams.tab! : "timetable";

  return (
    <div className="space-y-4">
      <div style={{ marginBottom: ".4rem", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: ".9rem" }}>
        <div>
          <div className="eyebrow">{await cohortLabel(program)}</div>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.7rem)", marginTop: ".5rem" }}>Explore the batch</h1>
        </div>
        {isAdmin && (
          <Link href="/admin" className="btn" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: ".4rem" }}>
            ▦ Admin console
          </Link>
        )}
        {canSwitch && programs.length > 1 && (
          <div className="seg" style={{ gap: 4, padding: 4 }}>
            {programs.map((p) => (
              <Link key={p} href={`/cohort?tab=${tab}&program=${p}`} className={"seg-it" + (p === program ? " seg-on" : "")} style={{ padding: ".4rem .85rem", fontSize: ".82rem" }}>
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
      <Tabs tabs={tabs} base="/cohort" active={tab} extra={`program=${program}`} />
      {tab === "timetable" && <TimetableView when={searchParams.when} program={program} />}
      {tab === "subjects" && <SubjectsView course={searchParams.course} program={program} />}
      {tab === "students" && <StudentsView program={program} />}
      {tab === "compare" && <CompareView a={searchParams.a} b={searchParams.b} program={program} />}
    </div>
  );
}
