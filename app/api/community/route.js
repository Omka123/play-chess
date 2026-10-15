import { apiUser, apiError } from "@/lib/apiSession";
import { socialAction } from "@/lib/community";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) {
  try { return Response.json(await socialAction(await apiUser(request)), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return apiError(error); }
}
export async function POST(request) {
  try { const user = await apiUser(request, true); return Response.json(await socialAction(user, await request.json())); }
  catch (error) { return apiError(error); }
}
