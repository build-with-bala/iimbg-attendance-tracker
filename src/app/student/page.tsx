import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Tabs } from "@/components/Tabs";
import { StandingView, MySubjectsView, MarkMeView } from "@/views/student";

export const dynamic = "force-dynamic";
const TABS = [{ key: "standing", label: "My standing" }, { key: "subjects", label: "My subjects" }, { key: "mark", label: "Mark me" }];

export default async function StudentHub({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const student = await prisma.student.findUnique({ where: { email: session.user.email! } });
  if (!student) redirect("/cohort"); // admins have no student record

  const tab = searchParams.tab || "standing";
  return (
    <div className="space-y-4">
      <div>
        <div className="eyebrow">{student.studentId} · {student.program}</div>
        <h1 style={{ fontSize: "1.7rem", marginTop: 6 }}>{student.name}</h1>
      </div>
      <Tabs tabs={TABS} base="/student" active={tab} />
      {tab === "standing" && <StandingView studentId={student.id} />}
      {tab === "subjects" && <MySubjectsView studentId={student.id} />}
      {tab === "mark" && <MarkMeView studentId={student.id} />}
    </div>
  );
}
