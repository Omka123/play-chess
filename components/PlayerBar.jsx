import { fmt } from "@/lib/chessUtil";

export default function PlayerBar({ name, avatar, captured, diff, showClock, clock, running, low }) {
  return (
    <div className="bar">
      <div className="avatar">{avatar}</div>
      <div className="who">
        <span className="name">{name}</span>
        <span className="caps" aria-label="Captured pieces">
          {captured}
          {diff > 0 && <b>+{diff}</b>}
        </span>
      </div>
      {showClock && <div className={`clock${running ? " run" : ""}${low ? " low" : ""}`}>{fmt(clock)}</div>}
    </div>
  );
}
