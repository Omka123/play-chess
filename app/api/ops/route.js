import { apiUser, apiError } from "@/lib/apiSession";
import { requireModerator } from "@/lib/moderation";
import { serviceMetrics } from "@/lib/operations";
export async function GET(request) { try { requireModerator(await apiUser(request)); return Response.json(serviceMetrics(), { headers: { "Cache-Control": "no-store" } }); } catch (error) { return apiError(error); } }
