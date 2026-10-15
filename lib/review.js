import { Chess } from "chess.js";
import { VALUE, PST } from "./constants.js";

// A deterministic two-ply review: compare every move against the opponent's
// strongest immediate reply. Scores are always from the mover's perspective.
function evaluate(game, color) {
  if (game.isCheckmate()) return game.turn() === color ? -100000 : 100000;
  if (game.isDraw()) return 0;
  let score = 0;
  game.board().forEach((row, r) => row.forEach((piece, c) => {
    if (!piece) return;
    const value = VALUE[piece.type] + PST[piece.type][(piece.color === "w" ? r : 7 - r) * 8 + c];
    score += piece.color === color ? value : -value;
  }));
  return score;
}

export function reviewPosition(fen, played) {
  const game = new Chess(fen);
  const color = game.turn();
  const candidates = game.moves({ verbose: true });
  let best = null;
  let actual = null;
  for (const move of candidates) {
    game.move(move);
    let score = evaluate(game, color);
    if (!game.isGameOver()) {
      score = Infinity;
      for (const reply of game.moves({ verbose: true })) {
        game.move(reply);
        score = Math.min(score, evaluate(game, color));
        game.undo();
      }
    }
    game.undo();
    if (!best || score > best.score) best = { san: move.san, score };
    if (move.from === played.from && move.to === played.to && (move.promotion || "") === (played.promotion || "")) actual = { san: move.san, score };
  }
  if (!actual || !best) throw new Error("Cannot review an illegal move.");
  const loss = Math.max(0, best.score - actual.score);
  const bestMove = candidates.find((move) => move.san === best.san);
  return { color, fen, played: actual.san, best: best.san, loss,
    playedMove: { from: played.from, to: played.to, promotion: played.promotion },
    bestMove: { from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion },
    label: loss >= 200 ? "Blunder" : loss >= 100 ? "Mistake" : loss >= 50 ? "Inaccuracy" : "Good",
    reason: actual.score <= -90000 && best.score > -90000 ? "Allowed an immediate checkmate."
      : best.score >= 90000 && actual.score < 90000 ? "Missed a checkmate."
      : `Estimated loss: ${(loss / 100).toFixed(1)} pawns against the best immediate reply.` };
}
