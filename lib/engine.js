import { Chess } from "chess.js";
import { MATE, PST, VALUE } from "./constants";

function evaluate(g) {
  const b = g.board();
  let s = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p) continue;
      if (p.color === "w") s += VALUE[p.type] + PST[p.type][r * 8 + c];
      else s -= VALUE[p.type] + PST[p.type][(7 - r) * 8 + c];
    }
  }
  return g.turn() === "w" ? s : -s;
}

function orderMoves(ms) {
  const score = new Map();
  for (const m of ms) {
    let sc = 0;
    if (m.captured) sc += 10 * VALUE[m.captured] - VALUE[m.piece] + 1000;
    if (m.promotion) sc += 800;
    if (m.san.includes("+")) sc += 50;
    score.set(m, sc);
  }
  ms.sort((a, b) => score.get(b) - score.get(a));
}

const play = (g, m) => g.move({ from: m.from, to: m.to, promotion: m.promotion });

function quiesce(g, alpha, beta, ctx, qd) {
  const stand = evaluate(g);
  if (qd <= 0) return stand;
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  const caps = g.moves({ verbose: true }).filter((m) => m.captured);
  orderMoves(caps);
  for (const m of caps) {
    play(g, m);
    const s = -quiesce(g, -beta, -alpha, ctx, qd - 1);
    g.undo();
    if (ctx.abort) return 0;
    if (s >= beta) return beta;
    if (s > alpha) alpha = s;
  }
  return alpha;
}

function negamax(g, depth, alpha, beta, ply, ctx) {
  if ((ctx.nodes++ & 127) === 0 && performance.now() > ctx.deadline) ctx.abort = true;
  if (ctx.abort) return 0;
  if (depth === 0) return ctx.q ? quiesce(g, alpha, beta, ctx, 2) : evaluate(g);
  const ms = g.moves({ verbose: true });
  if (!ms.length) return g.isCheck() ? -MATE + ply : 0;
  orderMoves(ms);
  let best = -Infinity;
  for (const m of ms) {
    play(g, m);
    const s = -negamax(g, depth - 1, -beta, -alpha, ply + 1, ctx);
    g.undo();
    if (ctx.abort) return 0;
    if (s > best) best = s;
    if (s > alpha) alpha = s;
    if (alpha >= beta) break;
  }
  return best;
}

/** Pick a move for the side to move in `fen`, according to the bot's settings. */
export function chooseMove(fen, bot) {
  const g = new Chess(fen);
  const ms = g.moves({ verbose: true });
  if (!ms.length) return null;

  if (bot.depth === 0) {
    const caps = ms.filter((m) => m.captured);
    if (caps.length && Math.random() < 0.4) return caps[Math.floor(Math.random() * caps.length)];
    return ms[Math.floor(Math.random() * ms.length)];
  }

  orderMoves(ms);
  let scored = ms.map((m) => ({ m, s: 0 }));
  const ctx = { nodes: 0, deadline: performance.now() + bot.time, abort: false, q: bot.q };

  for (let d = 1; d <= bot.depth; d++) {
    const cur = [];
    let alpha = -Infinity;
    for (const e of scored) {
      play(g, e.m);
      const s =
        bot.noise > 0
          ? -negamax(g, d - 1, -Infinity, Infinity, 1, ctx)
          : -negamax(g, d - 1, -Infinity, -alpha, 1, ctx);
      g.undo();
      if (ctx.abort) break;
      cur.push({ m: e.m, s });
      if (s > alpha) alpha = s;
    }
    if (ctx.abort) break; // discard the unfinished depth
    cur.sort((a, b) => b.s - a.s);
    scored = cur;
    if (Math.abs(cur[0].s) > MATE - 200) break; // found a forced mate
  }

  let pick = scored[0];
  let bestVal = -Infinity;
  for (const e of scored) {
    const v = e.s + (bot.noise ? Math.random() * bot.noise : 0);
    if (v > bestVal) { bestVal = v; pick = e; }
  }
  return pick.m;
}
