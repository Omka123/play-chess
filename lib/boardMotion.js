export function boardPoint(square, orient) {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  return orient === "b" ? { x: 7 - file, y: rank } : { x: file, y: 7 - rank };
}

export function moveAnimations(before, after, move) {
  if (!move) return [];
  const piece = before[move.from];
  const landed = after[move.to];
  if (!piece || !landed || piece.color !== landed.color || after[move.from]) return [];
  if (piece.type !== landed.type && !(piece.type === "p" && /[18]$/.test(move.to))) return [];
  const moves = [{ from: move.from, to: move.to, ...landed }];
  if (piece.type === "k" && Math.abs(move.from.charCodeAt(0) - move.to.charCodeAt(0)) === 2) {
    const rank = move.from[1];
    const from = (move.to[0] === "g" ? "h" : "a") + rank;
    const to = (move.to[0] === "g" ? "f" : "d") + rank;
    if (before[from]?.type === "r" && !after[from] && after[to]?.type === "r") moves.push({ from, to, ...after[to] });
  }
  return moves;
}
