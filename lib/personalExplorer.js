import { Chess } from "chess.js";
const key = (fen) => fen.split(" ").slice(0, 4).join(" ");
export function personalExplorer(games, fen) {
  const target = key(new Chess(fen).fen()), moves = {}, examples = []; let white = 0, black = 0, draws = 0;
  for (const entry of games) {
    const game = new Chess(); let matched = false;
    for (const move of entry.moves.slice(0, 80)) {
      if (!matched && key(game.fen()) === target) {
        matched = true; const uci = move.from + move.to + (move.promotion || ""), bucket = moves[uci] ||= { uci, san: move.san, white: 0, draws: 0, black: 0 };
        const winner = entry.outcome === "draw" ? null : entry.outcome === "win" ? entry.color : entry.color === "w" ? "b" : "w";
        if (!winner) { bucket.draws++; draws++; } else if (winner === "w") { bucket.white++; white++; } else { bucket.black++; black++; }
        if (examples.length < 5) examples.push({ id: entry.id, white: { name: entry.names.w }, black: { name: entry.names.b }, year: new Date(entry.finishedAt).getUTCFullYear() });
      }
      try { game.move(move); } catch { break; }
    }
  }
  return { source: "Your saved games, including computer practice", white, draws, black, moves: Object.values(moves).sort((a, b) => b.white + b.draws + b.black - a.white - a.draws - a.black), games: examples };
}
