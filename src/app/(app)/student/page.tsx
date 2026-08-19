import { redirect } from "next/navigation";
import { Tabs } from "@/components/Tabs";
import { getViewer } from "@/lib/viewer";
import { programName } from "@/lib/programs";
import { sectionChoices } from "@/lib/insights";
import { StandingView, TodayView, MySubjectsView, MarkMeView, SectionOnboarding } from "@/views/student";

export const dynamic = "force-dynamic";

export default async function StudentHub({ searchParams }: { searchParams: { tab?: string } }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const student = viewer.student;
  if (!student) redirect("/cohort"); // signed in but not on any roster

  // Multi-section electives need a one-time section pick before the
  // timetable means anything — block the hub until it's done.
  const choices = await sectionChoices(student.id);
  const needsOnboarding = choices.some((c) => !c.chosen);
  const tabs = [
    { key: "standing", label: "Standing" },
    { key: "today", label: "Today" },
    { key: "subjects", label: "Subjects" },
    { key: "mark", label: "Mark" },
    ...(choices.length ? [{ key: "sections", label: "Sections" }] : []),
  ];
  const tab = searchParams.tab || "standing";

  return (
    <div className="space-y-4">
      <div style={{ marginBottom: ".4rem" }}>
        <div className="eyebrow">{student.studentId} · {programName(student.program)}</div>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.7rem)", marginTop: ".5rem" }}>{student.name}</h1>
      </div>
      {needsOnboarding ? (
        <SectionOnboarding studentId={student.id} />
      ) : (
        <>
          <Tabs tabs={tabs} base="/student" active={tab} />
          {tab === "standing" && <StandingView studentId={student.id} />}
          {tab === "today" && <TodayView studentId={student.id} />}
          {tab === "subjects" && <MySubjectsView studentId={student.id} />}
          {tab === "mark" && <MarkMeView studentId={student.id} />}
          {tab === "sections" && <SectionOnboarding studentId={student.id} blocking={false} />}
        </>
      )}
    </div>
  );
}
