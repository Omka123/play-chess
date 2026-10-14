"use client";

import { PUZZLES } from "@/lib/puzzles";
import { colorName } from "@/lib/chessUtil";

export default function PuzzlePanel({ puzzle, side, solved, onHint, onReset, onNext, onPrev }) {
  const pz = PUZZLES[puzzle.idx];
  return (
    <div className="card">
      <h2>Mate in one</h2>
      <p className="sub">Puzzle {puzzle.idx + 1} of {PUZZLES.length}: {pz.title}</p>
      <div className="status">
        {colorName(side)} to move
        <small>Find the move that delivers checkmate.</small>
      </div>
      <div className={`msg ${puzzle.msgKind}`}>{puzzle.msg}</div>
      <div className="row first">
        <button className="btn" disabled={puzzle.solved} onClick={onHint}>Show hint</button>
        <button className="btn" disabled={!puzzle.moves.length} onClick={onReset}>Reset</button>
      </div>
      <div className="row">
        <button className="btn" onClick={onPrev}>Previous puzzle</button>
        <button className="btn primary" onClick={onNext}>Next puzzle</button>
      </div>
      <p className="solved-count">
        {solved.includes(puzzle.idx) ? "You solved this one before. " : ""}
        Solved {solved.length} of {PUZZLES.length}.
      </p>
    </div>
  );
}
