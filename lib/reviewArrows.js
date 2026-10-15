import { boardPoint } from "./boardMotion.js";

export function arrowGeometry(move, orient) {
  const from = boardPoint(move.from, orient);
  const to = boardPoint(move.to, orient);
  const start = { x: from.x * 100 + 50, y: from.y * 100 + 50 };
  const end = { x: to.x * 100 + 50, y: to.y * 100 + 50 };
  const dx = to.x - from.x, dy = to.y - from.y;
  const knight = Math.abs(dx * dy) === 2;
  const bend = knight ? Math.abs(dx) > Math.abs(dy) ? { x: end.x, y: start.y } : { x: start.x, y: end.y } : start;
  const angle = Math.atan2(end.y - bend.y, end.x - bend.x) * 180 / Math.PI;
  const radians = angle * Math.PI / 180;
  const shaftEnd = { x: end.x - Math.cos(radians) * 18, y: end.y - Math.sin(radians) * 18 };
  return { path: `M ${start.x} ${start.y}${knight ? ` L ${bend.x} ${bend.y}` : ""} L ${shaftEnd.x} ${shaftEnd.y}`, end, angle };
}

export function reviewArrows(entry, fen) {
  if (!entry || entry.fen !== fen || !entry.playedMove || !entry.bestMove) return [];
  return [
    { ...entry.playedMove, kind: "mistake", badge: entry.label === "Blunder" ? "??" : entry.label === "Mistake" ? "?" : "?!", label: `Played: ${entry.played}` },
    { ...entry.bestMove, kind: "best", badge: "★", label: `Better move: ${entry.best}` },
  ].filter((arrow) => /^[a-h][1-8]$/.test(arrow.from) && /^[a-h][1-8]$/.test(arrow.to) && (entry.arrowMode === "played" ? arrow.kind === "mistake" : entry.arrowMode === "best" ? arrow.kind === "best" : true));
}
