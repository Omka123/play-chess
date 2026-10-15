import { apiUser, apiError } from "@/lib/apiSession";
import { matchmaking } from "@/lib/community";
export const runtime = "nodejs";
export async function POST(request) {
  try { const user = await apiUser(request, true); return Response.json(await matchmaking(user, await request.json()), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return apiError(error); }
}
