import { Chess } from "chess.js";
import { FILES, GLYPH, START_COUNT, VALUE } from "./constants";

export const colorName = (c) => (c === "w" ? "White" : "Black");

export function fmt(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${s % 60 < 10 ? "0" : ""}${s % 60}`;
}

/** Rebuild a game (with full history) from a start FEN and a list of moves. */
export function buildGame(startFen, moves, upTo = moves.length) {
  const g = startFen ? new Chess(startFen) : new Chess();
  for (let i = 0; i < upTo; i++) {
    g.move({ from: moves[i].from, to: moves[i].to, promotion: moves[i].promotion });
  }
  return g;
}

/** Try a move on top of the given history. chess.js v1 throws on illegal moves. */
export function tryMove(startFen, moves, from, to, promotion) {
  const g = buildGame(startFen, moves);
  try {
    const m = g.move({ from, to, promotion });
    return {
      game: g,
      move: { from: m.from, to: m.to, promotion: m.promotion, san: m.san, color: m.color, captured: m.captured },
    };
  } catch {
    return null;
  }
}

export function kingSquare(g, color) {
  const b = g.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (p && p.type === "k" && p.color === color) return FILES[c] + (8 - r);
    }
  }
  return null;
}

export function capturedInfo(g) {
  const b = g.board();
  const cnt = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
  const mat = { w: 0, b: 0 };
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p || p.type === "k") continue;
      cnt[p.color][p.type]++;
      mat[p.color] += VALUE[p.type];
    }
  }
  const lost = (color) => {
    let s = "";
    for (const k of ["q", "r", "b", "n", "p"]) {
      const n = START_COUNT[k] - cnt[color][k];
      for (let i = 0; i < n; i++) s += GLYPH[k];
    }
    return s;
  };
  return { lostBy: { w: lost("w"), b: lost("b") }, diff: (mat.w - mat.b) / 100 };
}

/** Result card text once a game has ended on the board. */
export function gameResult(g, human, botName) {
  if (g.isCheckmate()) {
    const winner = g.turn() === "w" ? "b" : "w";
    return { title: winner === human ? "You win" : `${botName} wins`, detail: "Checkmate." };
  }
  if (g.isStalemate()) return { title: "Draw", detail: "Stalemate." };
  if (g.isThreefoldRepetition()) return { title: "Draw", detail: "Threefold repetition." };
  if (g.isInsufficientMaterial()) return { title: "Draw", detail: "Not enough material to checkmate." };
  return { title: "Draw", detail: "Fifty-move rule." };
}
