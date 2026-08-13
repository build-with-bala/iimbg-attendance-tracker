import { redirect } from "next/navigation";
import { Tabs } from "@/components/Tabs";
import { getViewer } from "@/lib/viewer";
import { programName } from "@/lib/programs";
import { StandingView, TodayView, MySubjectsView, MarkMeView } from "@/views/student";

export const dynamic = "force-dynamic";
const TABS = [{ key: "standing", label: "Standing" }, { key: "today", label: "Today" }, { key: "subjects", label: "Subjects" }, { key: "mark", label: "Mark" }];

export default async function StudentHub({ searchParams }: { searchParams: { tab?: string } }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const student = viewer.student;
  if (!student) redirect("/cohort"); // signed in but not on any roster

  const tab = searchParams.tab || "standing";
  return (
    <div className="space-y-4">
      <div style={{ marginBottom: ".4rem" }}>
        <div className="eyebrow">{student.studentId} · {programName(student.program)}</div>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.7rem)", marginTop: ".5rem" }}>{student.name}</h1>
      </div>
      <Tabs tabs={TABS} base="/student" active={tab} />
      {tab === "standing" && <StandingView studentId={student.id} />}
      {tab === "today" && <TodayView studentId={student.id} />}
      {tab === "subjects" && <MySubjectsView studentId={student.id} />}
      {tab === "mark" && <MarkMeView studentId={student.id} />}
    </div>
  );
}
