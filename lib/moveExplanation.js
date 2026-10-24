import { Chess } from "chess.js";
export function explainMove(fen, move) {
  const game = new Chess(fen); const played = game.move(move); const details = [];
  if (played.captured) details.push(`captures a ${({ p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen" })[played.captured]}`);
  if (played.promotion) details.push("promotes the pawn");
  if (played.san.startsWith("O-O")) details.push("castles the king and activates a rook");
  if (game.isCheckmate()) details.push("delivers checkmate"); else if (game.isCheck()) details.push("checks the king, forcing a response");
  if (["d4", "e4", "d5", "e5"].includes(played.to)) details.push("occupies a central square");
  const attacks = game.board().flat().filter((piece) => piece && piece.color !== played.color && piece.type !== "k" && game.attackers(piece.square, played.color).includes(played.to));
  if (attacks.length) details.push(`attacks ${attacks.map((piece) => `${piece.type.toUpperCase()} on ${piece.square}`).join(" and ")}`);
  return `${played.san} ${details.length ? details.join("; ") : "changes the piece placement"}. This describes visible tactical features; compare the engine continuation to assess whether the idea works.`;
}
