import { communityTransaction } from "@/lib/communityStore";
import { recordServiceError } from "@/lib/operations";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() { try { await communityTransaction(() => true, { readOnly: true }); return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } }); } catch { recordServiceError(503, "storage"); return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); } }
