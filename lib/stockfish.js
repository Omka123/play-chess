import { Chess } from "chess.js";
import { classifyReview, reviewLine } from "./reviewFeedback.js";

export function parseEngineInfo(line) {
  const match = line.match(/\bscore (cp|mate) (-?\d+)/);
  const pv = line.match(/\bpv (.+)$/)?.[1]?.split(" ") || [];
  if (!match || !pv.length || /\b(lowerbound|upperbound)\b/.test(line)) return null;
  const value = Number(match[2]);
  return { score: match[1] === "mate" ? (value > 0 ? 100000 - value : -100000 - value) : value,
    mate: match[1] === "mate" ? value : null, pv, depth: Number(line.match(/\bdepth (\d+)/)?.[1] || 0) };
}
export const uciMove = (value) => ({ from: value.slice(0, 2), to: value.slice(2, 4), ...(value.length > 4 ? { promotion: value[4] } : {}) });

export class StockfishReview {
  constructor() {
    this.worker = new Worker("/engine/stockfish-19-lite-single.js");
    this.pending = null;
    this.worker.onmessage = ({ data }) => {
      for (const line of String(data).split("\n")) this.receive(line);
    };
    this.worker.onerror = () => this.reject(new Error("Stockfish could not load. Retry or select basic review."));
    this.ready = new Promise((resolve, reject) => {
      this.pending = { kind: "ready", resolve, reject, timer: setTimeout(() => this.reject(new Error("Stockfish took too long to load.")), 20000) };
    });
    this.ready.catch(() => {}); // Cancellation can happen before any positions need analysis.
    this.worker.postMessage("uci");
  }
  reject(error) {
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(error); this.pending = null; }
  }
  receive(line) {
    const task = this.pending;
    if (!task) return;
    if (line === "uciok" && task.kind === "ready") {
      this.worker.postMessage("setoption name Hash value 32");
      this.worker.postMessage("isready");
    } else if (line === "readyok" && task.kind === "ready") {
      clearTimeout(task.timer); this.pending = null; task.resolve();
    } else if (task.kind === "search") {
      const info = parseEngineInfo(line);
      if (info) task.info = info;
      if (line.startsWith("bestmove")) {
        clearTimeout(task.timer); this.pending = null;
        if (!task.info) task.reject(new Error("Stockfish returned no analysis."));
        else task.resolve({ ...task.info, best: line.split(" ")[1] });
      }
    }
  }
  async analyze(fen) {
    await this.ready;
    const game = new Chess(fen);
    if (game.isGameOver()) return { score: game.isCheckmate() ? -100000 : 0, best: null, pv: [], depth: 0 };
    return new Promise((resolve, reject) => {
      this.pending = { kind: "search", resolve, reject, info: null, timer: setTimeout(() => this.reject(new Error("Stockfish analysis timed out.")), 10000) };
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage("go depth 16 movetime 400");
    });
  }
  terminate() { this.reject(new Error("Analysis cancelled.")); this.worker.terminate(); }
}

export async function stockfishGameReview(engine, moves, color, onProgress, isCancelled = () => false) {
  const game = new Chess();
  const findings = [];
  const summary = { best: 0, excellent: 0, mistakes: 0 };
  for (let index = 0; index < moves.length; index++) {
    if (isCancelled()) return { findings: [], summary };
    const fen = game.fen();
    const mover = game.turn();
    const best = mover === color ? await engine.analyze(fen) : null;
    const played = game.move(moves[index]);
    if (best) {
      const bestMove = uciMove(best.best);
      const same = played.from === bestMove.from && played.to === bestMove.to && (played.promotion || "") === (bestMove.promotion || "");
      const actual = same ? null : await engine.analyze(game.fen());
      const actualScore = same ? best.score : -actual.score;
      const { loss, label } = classifyReview(best.score, actualScore);
      if (same) summary.best++;
      else if (label === "Good") summary.excellent++;
      else summary.mistakes++;
      if (label !== "Good") {
        const before = new Chess(fen);
        const san = before.move(bestMove).san;
        findings.push({ ply: index + 1, color: mover, fen, played: played.san, best: san,
          playedMove: { from: played.from, to: played.to, promotion: played.promotion }, bestMove, loss, depth: Math.min(best.depth, actual?.depth || best.depth), pv: best.pv,
          bestScore: best.score, playedScore: actualScore, line: reviewLine(fen, best.pv),
          reply: reviewLine(game.fen(), actual?.pv)[0] || null, label,
          reason: actualScore < -90000 && best.score > -90000 ? `This move allows a forced checkmate${actual?.pv?.length ? ` starting with ${reviewLine(game.fen(), actual.pv)[0]}` : ""}.`
            : best.score > 90000 && actualScore < 90000 ? "A forced checkmate was available."
            : `The engine prefers ${san}. Your move loses about ${(loss / 100).toFixed(1)} pawns of evaluation${actual?.pv?.length ? ` after ${reviewLine(game.fen(), actual.pv)[0]}` : ""}.` });
      }
    }
    onProgress(index + 1);
  }
  return { findings, summary };
}
