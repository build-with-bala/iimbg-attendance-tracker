import { NextResponse } from "next/server";
import { ALLOWED_HD, getMobileViewer, jsonError, meJson, mintMobileToken } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

// Mirrors the web's DEMO_MODE credentials provider; absent unless DEMO_MODE=true.
export async function POST(req: Request) {
  if (process.env.DEMO_MODE !== "true") return jsonError(404, "not found");
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();
  if (!email.endsWith("@" + ALLOWED_HD)) return jsonError(400, `Use your @${ALLOWED_HD} email`);

  const token = await mintMobileToken(email, email.split("@")[0]);
  const viewer = await getMobileViewer(new Request(req.url, { headers: { authorization: `Bearer ${token}` } }));
  return NextResponse.json({ token, me: meJson(viewer!) });
}
