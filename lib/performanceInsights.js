import { Chess } from "chess.js";
import { openingName } from "./gameInsights.js";
export function performanceInsights(games) {
  const openings = {}, phases = { Opening: [], Middlegame: [], Endgame: [] }, timeSamples = [], quickPositions = [], month = {};
  for (const entry of games) {
    const name = openingName(entry.moves), bucket = openings[name] ||= { games: 0, wins: 0, losses: 0, draws: 0 }; bucket.games++; bucket[entry.outcome === "win" ? "wins" : entry.outcome === "loss" ? "losses" : "draws"]++;
    const period = new Date(entry.finishedAt).toISOString().slice(0, 7), monthly = month[period] ||= { games: 0, wins: 0 }; monthly.games++; if (entry.outcome === "win") monthly.wins++;
    const game = new Chess();
    for (let ply = 0; ply < entry.moves.length; ply++) {
      const move = entry.moves[ply], fen = game.fen(), side = game.turn(), pieces = game.board().flat().filter(Boolean).length;
      if (side === entry.color && Number.isFinite(move.timeSpentMs)) {
        const phase = pieces <= 10 ? "Endgame" : ply < 20 ? "Opening" : "Middlegame";
        phases[phase].push(move.timeSpentMs); timeSamples.push(move.timeSpentMs);
        if (quickPositions.length < 30 && (move.timeSpentMs < 1000 || move.timeSpentMs > 30000)) quickPositions.push({ gameId: entry.id, ply: ply + 1, fen, played: move.san, timeSpentMs: move.timeSpentMs, kind: move.timeSpentMs < 1000 ? "Quick decision" : "Long think" });
      }
      try { game.move(move); } catch { break; }
    }
  }
  const stats = (times) => { const sorted = [...times].sort((a, b) => a - b); return { count: times.length, averageMs: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null, medianMs: times.length ? sorted[Math.floor(sorted.length / 2)] : null, underSecond: times.filter((time) => time < 1000).length, over30Seconds: times.filter((time) => time > 30000).length }; };
  return { total: games.length, openings: Object.entries(openings).map(([name, values]) => ({ name, ...values })).sort((a, b) => b.games - a.games), phases: Object.fromEntries(Object.entries(phases).map(([name, times]) => [name, stats(times)])), timing: stats(timeSamples), quickPositions, monthly: Object.entries(month).sort(([a], [b]) => a.localeCompare(b)).map(([month, values]) => ({ month, ...values })) };
}
