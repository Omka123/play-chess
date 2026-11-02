import { apiUser, apiError } from "@/lib/apiSession";
import { requireAdmin } from "@/lib/adminAccess";
import { adminOverview, adminAction } from "@/lib/admin";
import { moderationOverview } from "@/lib/moderation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request) {
  try {
    const user = await apiUser(request); requireAdmin(user);
    const params = new URL(request.url).searchParams;
    const data = params.get("view") === "moderation" ? await moderationOverview(user) : await adminOverview(user, { search: params.get("search"), page: params.get("page") });
    return Response.json(data, { headers });
  } catch (error) { return apiError(error); }
}
export async function POST(request) {
  try { const user = await apiUser(request, true); requireAdmin(user); return Response.json(await adminAction(user, await request.json()), { headers }); }
  catch (error) { return apiError(error); }
}
