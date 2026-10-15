import { apiUser, apiError } from "@/lib/apiSession";
import { registerPlayer, savePuzzle, dayKey } from "@/lib/community";
export const runtime = "nodejs";
export async function GET(request) {
  try {
    const profile = await registerPlayer(await apiUser(request));
    const last = profile.lastPuzzleDay;
    return Response.json({ solved: Object.keys(profile.puzzles).map(Number), streak: last === dayKey() || last === dayKey(Date.now() - 86400000) ? profile.streak : 0 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
export async function POST(request) {
  try { const user = await apiUser(request, true); const input = await request.json(); return Response.json(await savePuzzle(user, input.puzzleId, input.move, input.day)); }
  catch (error) { return apiError(error); }
}
