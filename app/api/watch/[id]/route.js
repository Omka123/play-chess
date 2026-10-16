import { watchRoom } from "@/lib/rooms";
import { apiError } from "@/lib/apiSession";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request, { params }) { try { const { id } = await params; return Response.json(await watchRoom(id, request.headers.get("authorization")?.replace(/^Bearer /, "")), { headers: { "Cache-Control": "no-store" } }); } catch (error) { return apiError(error); } }
