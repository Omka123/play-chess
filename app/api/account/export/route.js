import { apiUser, apiError } from "@/lib/apiSession";
import { platformStatus } from "@/lib/platform";
import { listGames } from "@/lib/gameHistory";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) {
  try { const user = await apiUser(request); const [{ profile }, games] = await Promise.all([platformStatus(user), listGames(user.id)]); const { activeGames, ...account } = profile;
    return Response.json({ exportedAt: new Date().toISOString(), identity: { name: user.name, email: user.email }, account, games }, { headers: { "Cache-Control": "no-store", "Content-Disposition": 'attachment; filename="chessnexa-account.json"' } });
  } catch (error) { return apiError(error); }
}
