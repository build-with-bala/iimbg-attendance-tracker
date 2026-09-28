import { cookies } from "next/headers";
import { auth } from "@/auth";
import { isAllowedRedirect, jsonError, mintMobileToken } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

// Step 2: the web session now exists; trade it for a bearer token and hand it
// back to the app through its own URL scheme.
export async function GET() {
  const jar = cookies();
  const redirectUri = jar.get("mobile_redirect")?.value ?? null;
  if (!isAllowedRedirect(redirectUri)) return jsonError(400, "sign-in expired — start again from the app");
  jar.delete({ name: "mobile_redirect", path: "/api/mobile/auth" });

  const back = new URL(redirectUri);
  const user = (await auth())?.user;
  if (!user?.email) {
    back.searchParams.set("error", "not signed in");
  } else {
    back.searchParams.set("token", await mintMobileToken(user.email, user.name || user.email));
  }
  // raw 302: NextResponse.redirect normalises app-scheme URLs (auth → auth/)
  return new Response(null, { status: 302, headers: { Location: back.toString(), "Cache-Control": "no-store" } });
}
