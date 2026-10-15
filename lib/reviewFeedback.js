import { Chess } from "chess.js";

export function classifyReview(bestScore, playedScore) {
  // Mate scores are sentinels, not centipawns. Changing the length of an
  // already forced mate must not produce a fictitious thousand-pawn blunder.
  const sameMateOutcome = Math.abs(bestScore) >= 90000 && Math.abs(playedScore) >= 90000 && Math.sign(bestScore) === Math.sign(playedScore);
  const loss = sameMateOutcome ? 0 : Math.max(0, bestScore - playedScore);
  return { loss, label: loss >= 200 ? "Blunder" : loss >= 100 ? "Mistake" : loss >= 50 ? "Inaccuracy" : "Good" };
}

export function formatReviewScore(score, color) {
  if (!Number.isFinite(score)) return "—";
  const whiteScore = color === "b" ? -score : score;
  if (Math.abs(whiteScore) >= 90000) return `${whiteScore < 0 ? "−" : "+"}M${Math.max(0, 100000 - Math.abs(whiteScore))}`;
  return `${whiteScore > 0 ? "+" : ""}${(whiteScore / 100).toFixed(2)}`;
}

export function reviewLine(fen, moves = []) {
  const game = new Chess(fen);
  const line = [];
  for (const value of moves.slice(0, 6)) {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(value)) break;
    try { line.push(game.move({ from: value.slice(0, 2), to: value.slice(2, 4), ...(value[4] ? { promotion: value[4] } : {}) }).san); }
    catch { break; }
  }
  return line;
}
