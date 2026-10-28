"use client";
import { useState } from "react";
import { Chess } from "chess.js";
import Board from "./Board";
export default function LessonWalkthrough({ example }) {
  const [ply, setPly] = useState(0);
  const game = new Chess(example.fen);
  let last;
  for (const step of example.steps.slice(0, ply)) last = game.move(step.san);
  return <section id={example.id} className="lesson-walkthrough" aria-label={example.title}>
    <h2>{example.title}</h2><p>{example.introduction}</p>
    <div className="lesson-board"><Board game={game} orient="w" myColor="w" canMove={false} lastMove={last} /></div>
    <p role="status">{ply ? `${ply % 2 ? Math.ceil(ply / 2) + '. ' : Math.ceil(ply / 2) + '... '}${example.steps[ply - 1].san}: ${example.steps[ply - 1].note}` : "Starting position. Pause and consider your move before revealing the line."}</p>
    <div className="row"><button className="btn" disabled={!ply} onClick={() => setPly(0)}>Reset example</button><button className="btn" disabled={!ply} onClick={() => setPly(ply - 1)}>Previous example move</button><button className="btn primary" disabled={ply === example.steps.length} onClick={() => setPly(ply + 1)}>Next example move</button></div>
    <p><strong>Take it into your next game:</strong> {example.takeaway}</p>
    {example.pgn && <><p>Sample PGN to paste into the analysis page:</p><pre className="lesson-notation">{example.pgn}</pre></>}
    <details><summary>Read the complete example without using the board</summary><ol>{example.steps.map((step, i) => <li key={i}><strong>{step.san}</strong> — {step.note}</li>)}</ol></details>
  </section>;
}
