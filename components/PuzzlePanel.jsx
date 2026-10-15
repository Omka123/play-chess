"use client";

import { PUZZLES } from "@/lib/puzzles";
import { colorName } from "@/lib/chessUtil";
import { useState } from "react";
import PuzzleProgress from "./PuzzleProgress";

export default function PuzzlePanel({ puzzle, side, solved, onHint, onReset, onNext, onPrev, onPick, onProgress }) {
  const [difficulty, setDifficulty] = useState("All");
  const indices = PUZZLES.map((entry, index) => difficulty === "All" || entry.difficulty === difficulty ? index : -1).filter((index) => index >= 0);
  const navigate = (direction) => { const current = indices.indexOf(puzzle.idx); onPick(indices[(current + direction + indices.length) % indices.length]); };
  const pz = PUZZLES[puzzle.idx];
  return (
    <div className="card">
      <h2>Mate in one</h2>
      <PuzzleProgress puzzle={puzzle} onPick={onPick} onProgress={onProgress} />
      <label className="field-label">Difficulty<select value={difficulty} onChange={(event) => {
        const value = event.target.value; setDifficulty(value);
        const index = PUZZLES.findIndex((entry) => value === "All" || entry.difficulty === value);
        if (index >= 0) onPick(index);
      }}>{["All", "Beginner", "Intermediate", "Advanced"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <p className="sub">{pz.difficulty}</p>
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
        <button className="btn" onClick={() => navigate(-1)}>Previous puzzle</button>
        <button className="btn primary" onClick={() => navigate(1)}>Next puzzle</button>
      </div>
      <p className="solved-count">
        {solved.includes(puzzle.idx) ? "You solved this one before. " : ""}
        Solved {solved.length} of {PUZZLES.length}.
      </p>
    </div>
  );
}
