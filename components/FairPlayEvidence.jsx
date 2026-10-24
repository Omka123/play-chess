"use client";
import { useState } from "react";
import { timingEvidence } from "@/lib/fairPlay";
import { StockfishReview, stockfishGameReview } from "@/lib/stockfish";
export default function FairPlayEvidence({ moves }) {
  const [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  async function examine() { const engine = new StockfishReview(); setBusy(true); try { const parts = []; for (const color of ["w", "b"]) { const result = await stockfishGameReview(engine, moves, color, () => {}); parts.push(`${color === "w" ? "White" : "Black"}: ${result.summary.best} engine-first-choice moves, ${result.summary.mistakes} inaccuracies/mistakes at this search limit.`); } setMessage(parts.join(" ")); } catch (error) { setMessage(error.message); } finally { engine.terminate(); setBusy(false); } }
  return <section><h3>Fair-play evidence worksheet</h3>{timingEvidence(moves).map((row) => <p key={row.color}>{row.color === "w" ? "White" : "Black"}: {row.samples} timed moves · Average {(row.averageMs / 1000).toFixed(1)}s · Standard deviation {(row.deviationMs / 1000).toFixed(1)}s · {row.sub100ms} below 0.1s</p>)}<button className="btn" disabled={busy || !moves.length} onClick={examine}>{busy ? "Examining moves…" : "Compare both sides with Stockfish"}</button><p role="status">{message}</p><p>Timing patterns and engine agreement are evidence to investigate, not proof of cheating. Opening theory, forced moves, premoves, short games and network conditions can explain these patterns. Record context and allow an appeal; this tool never suspends a player or changes ratings automatically.</p></section>;
}
