import { apiUser, apiError } from "@/lib/apiSession";
import { platformAction, platformStatus } from "@/lib/platform";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) { try { return Response.json(await platformStatus(await apiUser(request)), { headers: { "Cache-Control": "no-store" } }); } catch (error) { return apiError(error); } }
export async function POST(request) { try { const user = await apiUser(request, true); return Response.json(await platformAction(user, await request.json())); } catch (error) { return apiError(error); } }
