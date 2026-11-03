import { NextResponse, type NextRequest } from "next/server";

// CORS for the app's API only. Safe to open to any origin: these routes read a
// bearer token, never cookies, so a foreign page gains nothing by calling them.
// (Native fetch ignores CORS; this is for the app's web build / Expo web.)
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") return new NextResponse(null, { status: 204, headers: CORS });
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
  return res;
}

// auth/start + auth/complete are browser redirects that ride the web session
// cookie — they must not be cross-origin readable, so they stay out of CORS.
export const config = { matcher: ["/api/mobile/me", "/api/mobile/standing", "/api/mobile/today", "/api/mobile/attendance", "/api/mobile/auth/demo"] };
