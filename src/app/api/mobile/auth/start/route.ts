import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth, signIn } from "@/auth";
import { isAllowedRedirect, jsonError } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

// Step 1 of the app's sign-in: the app opens this in an in-app browser with
// ?redirect_uri=iimbgattendance://auth. We run the ordinary web Google flow
// (same OAuth client, same hd check in src/auth.ts) and land on /complete.
export async function GET(req: Request) {
  const redirectUri = new URL(req.url).searchParams.get("redirect_uri");
  if (!isAllowedRedirect(redirectUri)) return jsonError(400, "redirect_uri not allowed");

  cookies().set("mobile_redirect", redirectUri, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // must survive the top-level redirect back from Google
    path: "/api/mobile/auth",
    maxAge: 600,
  });

  const complete = "/api/mobile/auth/complete";
  // already signed in on the web in this browser — skip straight to the token
  if ((await auth())?.user?.email) return NextResponse.redirect(new URL(complete, process.env.AUTH_URL || req.url));
  if (!process.env.GOOGLE_CLIENT_ID) return jsonError(501, "Google sign-in is not configured on this server");
  await signIn("google", { redirectTo: complete }); // throws the redirect to Google
  return jsonError(500, "sign-in did not redirect");
}
