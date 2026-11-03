import { SignJWT, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admins";
import type { Viewer } from "@/lib/viewer";

// Bearer tokens for the native app (build-with-bala/iimbg-attendance-mobile).
// The web keeps its NextAuth cookie; the app can't carry that, so after the
// same Google sign-in we mint a separate, audience-scoped JWT for it.
const ISSUER = "iimbg-attendance";
const AUDIENCE = "iimbg-mobile";
const TTL = "30d";

export const ALLOWED_HD = (process.env.ALLOWED_HD || "iimbg.ac.in").toLowerCase();

function secret() {
  const s = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET;
  if (!s) throw new Error("MOBILE_JWT_SECRET or AUTH_SECRET must be set");
  return new TextEncoder().encode(s);
}

export async function mintMobileToken(email: string, name: string) {
  return new SignJWT({ name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email.toLowerCase())
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(secret());
}

/** Resolve the caller from `Authorization: Bearer`, the same way getViewer()
 *  resolves a web session — admin and student are independent. */
export async function getMobileViewer(req: Request): Promise<Viewer | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, audience: AUDIENCE, algorithms: ["HS256"] });
    const email = String(payload.sub || "");
    if (!email.endsWith("@" + ALLOWED_HD)) return null;
    const [student, isAdmin] = await Promise.all([
      prisma.student.findUnique({ where: { email } }),
      isAdminEmail(email),
    ]);
    return { email, name: String(payload.name || email), isAdmin, student };
  } catch {
    return null; // expired, tampered, or signed with a rotated secret
  }
}

export const jsonError = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Wraps a handler that needs a signed-in caller; 401 lets the app drop its token. */
export function withViewer(handler: (req: Request, viewer: Viewer) => Promise<Response>) {
  return async (req: Request) => {
    const viewer = await getMobileViewer(req);
    if (!viewer) return jsonError(401, "unauthorized");
    return handler(req, viewer);
  };
}

export function meJson(v: Viewer) {
  const s = v.student;
  return {
    email: v.email,
    name: v.name,
    isAdmin: v.isAdmin,
    student: s ? { id: s.id, studentId: s.studentId, name: s.name, email: s.email, program: s.program, batch: s.batch } : null,
  };
}

// ---- Sign-in handoff: where the finished token may be sent ----
// Only the app's own scheme, so a crafted link can't ship a token to a website.
// exp:// (Expo Go) points at a dev server host, so it is opt-in for development.
const APP_SCHEME = "iimbgattendance:";

export function isAllowedRedirect(uri: string | null): uri is string {
  if (!uri) return false;
  try {
    const u = new URL(uri);
    if (u.protocol === APP_SCHEME) return true;
    return u.protocol === "exp:" && process.env.MOBILE_ALLOW_EXPO_GO === "true";
  } catch {
    return false;
  }
}
