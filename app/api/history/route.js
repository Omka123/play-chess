import { getServerSession } from "next-auth";
import { Chess } from "chess.js";
import { authOptions } from "@/lib/auth";
import { saveGame } from "@/lib/gameHistory";
import { BOTS } from "@/lib/constants";
import { validMoveTime } from "@/lib/moveTiming";
import { assertAccountActive } from "@/lib/moderation";
export const runtime = "nodejs";
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Sign in to save games." }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid origin." }, { status: 403 });
  try {
    await assertAccountActive(session.user);
    const input = await request.json();
    const bot = BOTS.find((entry) => entry.id === input.botId);
    if (!bot || !/^[a-f0-9-]{36}$/.test(input.id) || !["w", "b"].includes(input.color) || !Array.isArray(input.moves) || input.moves.length > 1200 || !["board", "resign", "timeout"].includes(input.reason)) throw new Error();
    const game = new Chess();
    const moves = input.moves.map((move) => { const legal = game.move({ from: move.from, to: move.to, promotion: move.promotion }); return { from: legal.from, to: legal.to, ...(legal.promotion ? { promotion: legal.promotion } : {}), san: legal.san, ...(validMoveTime(move.timeSpentMs) ? { timeSpentMs: Math.round(move.timeSpentMs) } : {}) }; });
    let winner = null;
    if (input.reason === "board") {
      if (!game.isGameOver()) throw new Error();
      if (game.isCheckmate()) winner = game.turn() === "w" ? "b" : "w";
    } else if (input.reason === "resign") winner = input.color === "w" ? "b" : "w";
    else { if (![60, 180, 300, 600].includes(input.tc)) throw new Error(); winner = game.turn() === "w" ? "b" : "w"; }
    const names = { [input.color]: session.user.name, [input.color === "w" ? "b" : "w"]: bot.name };
    await saveGame(session.user.id, { id: `bot-${input.id}`, mode: "bot", names, color: input.color, moves,
      tc: [0, 60, 180, 300, 600].includes(input.tc) ? input.tc : 0, increment: [0, 2, 5].includes(input.increment) ? input.increment : 0,
      outcome: winner ? winner === input.color ? "win" : "loss" : "draw",
      result: { title: winner ? `${names[winner]} wins` : "Draw", detail: input.reason === "resign" ? "Resignation." : input.reason === "timeout" ? "Time ran out." : game.isCheckmate() ? "Checkmate." : "Drawn position." }, finishedAt: Date.now() });
    return Response.json({ saved: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error.status === 503 ? "Game storage is unavailable. Please retry." : "Could not save this game." }, { status: error.status === 503 ? 503 : 400 });
  }
}
