import { RosterView } from "@/views/cohort";
import { programName } from "@/lib/programs";
import { PageHeader } from "@/components/admin/ui";
import { ProgramSwitch, resolveProgram } from "@/components/admin/ProgramSwitch";

export const dynamic = "force-dynamic";

export default async function AdminMark({ searchParams }: { searchParams: { program?: string; session?: string } }) {
  const { program, programs } = await resolveProgram(searchParams.program);
  return (
    <>
      <PageHeader
        title="Roster mark"
        eyebrow={`${programName(program)} · marking`}
        lede="Mark a whole class in one pass. OD counts as attended; a save never overwrites a student's own OD with absent."
        right={<ProgramSwitch programs={programs} program={program} base="/admin/mark" />}
      />
      <RosterView sessionId={searchParams.session} program={program} />
    </>
  );
}
