import { apiUser, apiError } from "@/lib/apiSession";
import { submitReport } from "@/lib/moderation";
export const runtime = "nodejs";
export async function POST(request) {
  try { const user = await apiUser(request, true); return Response.json(await submitReport(user, await request.json()), { status: 201, headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return apiError(error); }
}
