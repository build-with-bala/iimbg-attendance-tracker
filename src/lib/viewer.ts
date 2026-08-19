import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admins";

// Being an admin and being a student are independent: admins are on the root
// list or granted on the Access page, students are whoever has a Student row.
// A committee member is both, and gets both — never one instead of the other.
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
  const [student, isAdmin] = await Promise.all([
    prisma.student.findUnique({ where: { email: email.toLowerCase() } }),
    isAdminEmail(email),
  ]);
  return { email, name: session!.user!.name || email, isAdmin, student };
}

/** Guard for admin-only server actions. Throws rather than returning a flag so
 *  a forgotten check can't silently fall through to the mutation. */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) throw new Error("forbidden");
  return viewer;
}

// Sections this viewer may open. Admin-only tabs are gated separately in /cohort.
export function sectionsFor(v: Viewer) {
  return [
    ...(v.student ? [{ href: "/student", label: "Student", ico: "◎" }] : []),
    { href: "/cohort", label: "Cohort", ico: "▦" },
  ];
}
