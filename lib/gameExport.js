import { Chess } from "chess.js";
export function gamePgn({ moves, names = { w: "White", b: "Black" }, outcome, color, result, tc = 0, increment = 0, finishedAt }) {
  const game = new Chess();
  let score = "*";
  if (outcome === "draw" || result?.title === "Draw") score = "1/2-1/2";
  else if (outcome && color) score = (outcome === "win" ? color : color === "w" ? "b" : "w") === "w" ? "1-0" : "0-1";
  for (const move of moves) game.move(move);
  if (game.isCheckmate()) score = game.turn() === "w" ? "0-1" : "1-0";
  else if (game.isDraw()) score = "1/2-1/2";
  game.header("Event", "ChessNexa game", "Site", "ChessNexa", "White", names.w, "Black", names.b,
    "Date", finishedAt ? new Date(finishedAt).toISOString().slice(0, 10).replaceAll("-", ".") : "????.??.??",
    "Result", score, "TimeControl", tc ? `${tc}+${increment}` : "-");
  return game.pgn();
}
