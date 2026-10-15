import { apiUser, apiError } from "@/lib/apiSession";
import { moderationOverview, moderationAction } from "@/lib/moderation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) {
  try { return Response.json(await moderationOverview(await apiUser(request)), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return apiError(error); }
}
export async function POST(request) {
  try { const user = await apiUser(request, true); return Response.json(await moderationAction(user, await request.json())); }
  catch (error) { return apiError(error); }
}
