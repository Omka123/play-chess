import { positionData } from "@/lib/positionData";
import { apiError, apiUser } from "@/lib/apiSession";
import { listGames } from "@/lib/gameHistory";
import { personalExplorer } from "@/lib/personalExplorer";
export const runtime = "nodejs";
export async function GET(request) { try { const params = new URL(request.url).searchParams; if (params.get("kind") === "personal") { const user = await apiUser(request); return Response.json(personalExplorer(await listGames(user.id), params.get("fen")), { headers: { "Cache-Control": "no-store" } }); } return Response.json(await positionData(params.get("kind"), params.get("fen")), { headers: { "Cache-Control": "private, max-age=300" } }); } catch (error) { return apiError(error); } }
