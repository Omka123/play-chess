import { timingSafeEqual } from "node:crypto";
import { runMaintenance } from "@/lib/maintenance";
import { apiError } from "@/lib/apiSession";
export const runtime = "nodejs";
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return new Response(null, { status: 401 });
  try { return Response.json(await runMaintenance({ cursor: new URL(request.url).searchParams.get("cursor") || "0" }), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return apiError(error); }
}
