import { apiUser, apiError } from "@/lib/apiSession";
import { academyAction, academyStatus } from "@/lib/academy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) { try { return Response.json(await academyStatus(await apiUser(request)), { headers: { "Cache-Control": "no-store" } }); } catch (error) { return apiError(error); } }
export async function POST(request) { try { const user = await apiUser(request, true); return Response.json(await academyAction(user, await request.json()), { headers: { "Cache-Control": "no-store" } }); } catch (error) { return apiError(error); } }
