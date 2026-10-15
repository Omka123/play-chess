"use client";
import { useState } from "react";
import { Chess } from "chess.js";
import Board from "./Board";

export default function LessonExercise({ challenge }) {
  const [game, setGame] = useState(() => new Chess(challenge.fen));
  const [last, setLast] = useState(null);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const move = (from, to, promotion) => {
    const next = new Chess(challenge.fen);
    let played;
    try { played = next.move({ from, to, promotion: promotion || "q" }); } catch { return; }
    if (challenge.mate ? next.isCheckmate() : challenge.moves.includes(from + to + (played.promotion || ""))) {
      setGame(next); setLast(played); setDone(true); setMessage(challenge.success);
    } else setMessage("That move is legal, but it does not solve this exercise. Check the goal and try another move.");
  };
  return <section className="lesson-exercise"><h2>Try it on the board</h2><p>{challenge.goal}</p>
    <div className="lesson-board"><Board game={game} orient="w" canMove={!done} myColor="w" lastMove={last} onMove={move} /></div>
    <p role="status">{message || "Click a white piece, then a destination, or drag it to move."}</p>
    <button className="btn" onClick={() => { setGame(new Chess(challenge.fen)); setLast(null); setDone(false); setMessage(""); }}>Reset exercise</button>
  </section>;
}
