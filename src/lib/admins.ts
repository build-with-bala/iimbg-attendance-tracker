import { prisma } from "@/lib/prisma";

// Committee members who always hold the console, checked into the repo so the
// grant survives a redeploy and is reviewable in git. ADMIN_EMAILS extends this
// per-environment; neither can be revoked from the Access page, which is what
// keeps a mistaken revoke from locking everyone out.
export const ROOT_ADMINS = [
  "balaji.g2027d@iimbg.ac.in",
  "b.gokul2027d@iimbg.ac.in",
];

const norm = (e: string) => e.trim().toLowerCase();

export function rootAdmins(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS || "").split(",").map(norm).filter(Boolean);
  return [...new Set([...ROOT_ADMINS.map(norm), ...fromEnv])];
}

export const isRootAdmin = (email?: string | null) => !!email && rootAdmins().includes(norm(email));

/** Authoritative admin check: root list, or a grant made on the Access page. */
export async function isAdminEmail(email?: string | null): Promise<boolean> {
  if (!email) return false;
  if (isRootAdmin(email)) return true;
  return (await prisma.adminUser.findUnique({ where: { email: norm(email) } })) !== null;
}

/** Everyone who can open the console, root entries first. */
export async function adminRoster() {
  const granted = await prisma.adminUser.findMany({ orderBy: { addedAt: "asc" } });
  const roots = rootAdmins();
  return [
    ...roots.map((email) => ({ email, root: true as const, addedBy: null as string | null, addedAt: null as Date | null })),
    ...granted
      .filter((g) => !roots.includes(norm(g.email)))
      .map((g) => ({ email: g.email, root: false as const, addedBy: g.addedBy, addedAt: g.addedAt })),
  ];
}
