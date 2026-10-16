import { Chess } from "chess.js";
export function importStudy(source) {
  if (typeof source !== "string" || !source.trim() || source.length > 100000) throw new Error("Enter PGN or FEN under 100 KB.");
  const game = new Chess();
  if (/^[1-8prnbqkPRNBQK/]+\s+[wb]\s/.test(source.trim())) game.load(source.trim());
  else game.loadPgn(source, { strict: false });
  const moves = game.history({ verbose: true });
  const replay = new Chess(game.getHeaders().FEN || undefined), fens = [replay.fen()];
  for (const move of moves) { replay.move(move); fens.push(replay.fen()); }
  return { game, fens, moveCount: moves.length };
}
