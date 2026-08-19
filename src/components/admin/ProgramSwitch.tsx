import Link from "next/link";
import { loadedPrograms } from "@/lib/insights";
import { programName } from "@/lib/programs";

/** Which programme this console page is showing. Falls back to DBM, then to
 *  whatever is actually loaded, so a bad ?program= can never blank the page. */
export async function resolveProgram(requested?: string) {
  const programs = await loadedPrograms();
  const program = (requested && programs.includes(requested) ? requested : null) ?? (programs.includes("DBM") ? "DBM" : programs[0] ?? "DBM");
  return { program, programs };
}

export function ProgramSwitch({ programs, program, base }: { programs: string[]; program: string; base: string }) {
  if (programs.length < 2) return null;
  return (
    <div className="seg" style={{ gap: 4, padding: 4 }}>
      {programs.map((p) => (
        <Link key={p} href={`${base}?program=${p}`} className={"seg-it" + (p === program ? " seg-on" : "")}
          style={{ padding: ".38rem .8rem", fontSize: ".8rem" }} title={programName(p)}>
          {p}
        </Link>
      ))}
    </div>
  );
}
