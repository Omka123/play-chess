import { apiUser, apiError } from "@/lib/apiSession";
import { shareGame } from "@/lib/gameHistory";
export const runtime = "nodejs";
export async function POST(request) {
  try { const user = await apiUser(request, true); const { id } = await request.json(); return Response.json({ id: await shareGame(user.id, id) }); }
  catch (error) { return apiError(error); }
}
