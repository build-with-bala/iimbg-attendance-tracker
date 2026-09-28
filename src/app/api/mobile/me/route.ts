import { NextResponse } from "next/server";
import { meJson, withViewer } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export const GET = withViewer(async (_req, viewer) => NextResponse.json(meJson(viewer)));
