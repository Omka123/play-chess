"use client";
import { useState } from "react";
import { Chess } from "chess.js";
import Board from "./Board";
export default function ReviewPractice({ entry }) {
  const [game, setGame] = useState(() => new Chess(entry.fen));
  const [feedback, setFeedback] = useState(`Try ${entry.best} on this practice board.`);
  const [last, setLast] = useState(null);
  return <div className="review-practice"><p>{feedback}</p><Board game={game} orient={entry.color} myColor={entry.color} canMove={game.fen() === entry.fen}
    lastMove={last} arrows={game.fen() === entry.fen ? [{ ...entry.bestMove, kind: "best", label: `Try ${entry.best}` }] : []}
    onMove={(from, to, promotion) => {
      const next = new Chess(entry.fen);
      try {
        const move = next.move({ from, to, promotion });
        if (move.from !== entry.bestMove.from || move.to !== entry.bestMove.to || (move.promotion || "") !== (entry.bestMove.promotion || "")) { setFeedback(`You tried ${move.san}. Look for ${entry.best}.`); return; }
        setGame(next); setLast(move); setFeedback(`Well played! ${move.san} is the suggested improvement.`);
      } catch { setFeedback("Try another legal move."); }
    }} /><button className="btn" onClick={() => { setGame(new Chess(entry.fen)); setLast(null); setFeedback(`Try ${entry.best} again.`); }}>Reset practice</button></div>;
}
