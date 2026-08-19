"use server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/viewer";
import { isRootAdmin } from "@/lib/admins";
import { revalidatePath } from "next/cache";

const ALLOWED_DOMAIN = (process.env.ALLOWED_HD || "iimbg.ac.in").toLowerCase();

export type AccessResult = { ok: boolean; message: string };

export async function grantAdmin(_prev: AccessResult | null, formData: FormData): Promise<AccessResult> {
  const me = await requireAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email) return { ok: false, message: "Enter an email address." };
  if (!email.endsWith("@" + ALLOWED_DOMAIN)) return { ok: false, message: `Only @${ALLOWED_DOMAIN} accounts can sign in, so only they can be admins.` };
  if (isRootAdmin(email)) return { ok: false, message: "That address is already a root admin." };
  if (await prisma.adminUser.findUnique({ where: { email } })) return { ok: false, message: "That address already has console access." };

  await prisma.adminUser.create({ data: { email, addedBy: me.email } });
  revalidatePath("/admin/access");
  return { ok: true, message: `${email} can now open the console.` };
}

export async function revokeAdmin(_prev: AccessResult | null, formData: FormData): Promise<AccessResult> {
  const me = await requireAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  // Root admins come from the repo/env, so there is nothing here to delete —
  // say so rather than silently doing nothing.
  if (isRootAdmin(email)) return { ok: false, message: "Root admins can't be removed here — edit ROOT_ADMINS or ADMIN_EMAILS." };
  if (email === me.email.toLowerCase()) return { ok: false, message: "You can't remove your own access." };

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (!existing) return { ok: false, message: "That address doesn't have a grant to remove." };

  await prisma.adminUser.delete({ where: { email } });
  revalidatePath("/admin/access");
  return { ok: true, message: `Removed ${email}.` };
}
