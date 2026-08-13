import { redirect } from "next/navigation";
import { Tabs } from "@/components/Tabs";
import { getViewer } from "@/lib/viewer";
import { TimetableView, SubjectsView, StudentsView, CompareView, AnalyticsView, RosterView } from "@/views/cohort";
import { cohortLabel } from "@/lib/insights";

export const dynamic = "force-dynamic";

export default async function CohortHub({ searchParams }: { searchParams: { tab?: string; course?: string; a?: string; b?: string; session?: string; when?: string } }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const isAdmin = viewer.isAdmin;

  const tabs = [
    { key: "timetable", label: "Timetable" },
    { key: "subjects", label: "Subjects" },
    { key: "students", label: "Students" },
    { key: "compare", label: "Compare" },
    ...(isAdmin ? [{ key: "analytics", label: "Analytics" }, { key: "roster", label: "Roster mark" }] : []),
  ];
  const tab = searchParams.tab || (isAdmin ? "analytics" : "timetable");

  return (
    <div className="space-y-4">
      <div style={{ marginBottom: ".4rem" }}>
        <div className="eyebrow">{await cohortLabel()}</div>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.7rem)", marginTop: ".5rem" }}>{isAdmin ? "The register" : "Explore the batch"}</h1>
      </div>
      <Tabs tabs={tabs} base="/cohort" active={tab} />
      {tab === "timetable" && <TimetableView when={searchParams.when} />}
      {tab === "subjects" && <SubjectsView course={searchParams.course} />}
      {tab === "students" && <StudentsView />}
      {tab === "compare" && <CompareView a={searchParams.a} b={searchParams.b} />}
      {tab === "analytics" && isAdmin && <AnalyticsView />}
      {tab === "roster" && isAdmin && <RosterView sessionId={searchParams.session} />}
    </div>
  );
}
