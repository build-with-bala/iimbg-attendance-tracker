import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Tabs } from "@/components/Tabs";
import { TimetableView, SubjectsView, StudentsView, CompareView, AnalyticsView, RosterView } from "@/views/cohort";

export const dynamic = "force-dynamic";

export default async function CohortHub({ searchParams }: { searchParams: { tab?: string; course?: string; a?: string; b?: string; session?: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin = (session.user as any).role === "admin";

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
      <div>
        <div className="eyebrow">Cohort · DBM Term IV</div>
        <h1 style={{ fontSize: "1.7rem", marginTop: 6 }}>{isAdmin ? "The register" : "Explore the batch"}</h1>
      </div>
      <Tabs tabs={tabs} base="/cohort" active={tab} />
      {tab === "timetable" && <TimetableView />}
      {tab === "subjects" && <SubjectsView course={searchParams.course} />}
      {tab === "students" && <StudentsView />}
      {tab === "compare" && <CompareView a={searchParams.a} b={searchParams.b} />}
      {tab === "analytics" && isAdmin && <AnalyticsView />}
      {tab === "roster" && isAdmin && <RosterView sessionId={searchParams.session} />}
    </div>
  );
}
