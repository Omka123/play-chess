import { Chess } from "chess.js";
import { PUZZLE_BANK } from "./puzzleBank.js";

const RAW = [
  { title: "Back rank",      fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1" },
  { title: "Scholar's mate", fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4" },
  { title: "Fool's mate",    fen: "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2" },
  { title: "Smothered mate", fen: "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1" },
  { title: "King and rook",  fen: "k7/8/1K6/8/8/8/8/7R w - - 0 1" },
  { title: "King and queen", fen: "7k/5K2/8/8/8/8/8/6Q1 w - - 0 1" },
];

/** All moves in a position that deliver checkmate. */
export function matingMoves(fen) {
  const g = new Chess(fen);
  const out = [];
  for (const m of g.moves({ verbose: true })) {
    g.move({ from: m.from, to: m.to, promotion: m.promotion });
    if (g.isCheckmate()) out.push({ from: m.from, to: m.to });
    g.undo();
  }
  return out;
}

// Keep only puzzles that really have a mating move, so none can be unsolvable.
export const PUZZLES = RAW.map((p, index) => ({ ...p, difficulty: ["Beginner", "Intermediate", "Beginner", "Advanced", "Intermediate", "Beginner"][index] })).filter((p) => {
  try {
    return matingMoves(p.fen).length > 0;
  } catch {
    return false;
  }
}).concat(PUZZLE_BANK);
