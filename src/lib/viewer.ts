import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Being an admin and being a student are independent: admins are listed in
// ADMIN_EMAILS, students are whoever has a Student row. A committee member is
// both, and gets both sections — never one instead of the other.
export type Viewer = {
  email: string;
  name: string;
  isAdmin: boolean;
  student: Awaited<ReturnType<typeof prisma.student.findUnique>>;
};

export async function getViewer(): Promise<Viewer | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  // seeded emails are stored lowercased; Google can hand back any casing
  const student = await prisma.student.findUnique({ where: { email: email.toLowerCase() } });
  return {
    email,
    name: session!.user!.name || email,
    isAdmin: (session!.user as any)?.role === "admin",
    student,
  };
}

// Sections this viewer may open. Admin-only tabs are gated separately in /cohort.
export function sectionsFor(v: Viewer) {
  return [
    ...(v.student ? [{ href: "/student", label: "Student", ico: "◎" }] : []),
    { href: "/cohort", label: "Cohort", ico: "▦" },
  ];
}
