import { Chess } from "chess.js";
const cache = new Map();
export async function positionData(kind, fen, fetcher = fetch) {
  if (!["opening", "tablebase"].includes(kind)) throw Object.assign(new Error("Unknown lookup."), { status: 400 });
  let game; try { game = new Chess(fen); } catch { throw Object.assign(new Error("Invalid FEN."), { status: 400 }); }
  if (kind === "tablebase" && (game.board().flat().filter(Boolean).length > 7 || game.fen().split(" ")[2] !== "-")) throw Object.assign(new Error("Tablebases support up to seven pieces and no castling rights."), { status: 400 });
  const key = `${kind}:${game.fen()}`; const cached = cache.get(key); if (cached && cached.until > Date.now()) return cached.value;
  if (kind === "opening" && !process.env.LICHESS_API_TOKEN) throw Object.assign(new Error("Master-game statistics need the site owner to configure LICHESS_API_TOKEN. Your personal explorer works without it."), { status: 503 });
  const url = new URL(kind === "opening" ? "https://explorer.lichess.org/masters" : "https://tablebase.lichess.org/standard"); url.searchParams.set("fen", game.fen()); if (kind === "opening") { url.searchParams.set("moves", "12"); url.searchParams.set("topGames", "5"); }
  const response = await fetcher(url, { signal: AbortSignal.timeout(10000), headers: { Accept: "application/json", ...(kind === "opening" ? { Authorization: `Bearer ${process.env.LICHESS_API_TOKEN}` } : {}) } });
  if (!response.ok) throw Object.assign(new Error(response.status === 429 ? "The position service is busy. Please wait before retrying." : "Position data is unavailable for this position. You can still use local Stockfish."), { status: response.status === 429 ? 429 : 503 });
  const data = await response.json();
  const value = kind === "opening" ? { source: "Lichess masters database", white: data.white, draws: data.draws, black: data.black, moves: (data.moves || []).slice(0, 12).map(({ uci, san, white, draws, black }) => ({ uci, san, white, draws, black })), games: (data.topGames || []).slice(0, 5).map(({ id, white, black, year, winner }) => ({ id, white: { name: white?.name, rating: white?.rating }, black: { name: black?.name, rating: black?.rating }, year, winner })) } : { source: "Lichess Syzygy tablebase", category: data.category, dtz: data.dtz, dtm: data.dtm, moves: (data.moves || []).slice(0, 30).map(({ uci, san, category, dtz, dtm }) => ({ uci, san, category, dtz, dtm })) };
  if (cache.size >= 100) cache.delete(cache.keys().next().value); cache.set(key, { until: Date.now() + 3600000, value }); return value;
}
