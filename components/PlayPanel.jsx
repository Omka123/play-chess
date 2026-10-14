"use client";

import { useEffect, useRef } from "react";
import { BOTS, TIMES } from "@/lib/constants";

function MoveList({ moves, view, onGoto }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [moves.length]);

  if (!moves.length) {
    return <div className="moves"><span className="empty">Moves will appear here.</span></div>;
  }
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push(
      <span key={`n${i}`} className="n">{i / 2 + 1}.</span>,
      <button key={`a${i}`} className={view === i + 1 ? "cur" : ""} onClick={() => onGoto(i + 1)}>{moves[i].san}</button>,
      moves[i + 1]
        ? <button key={`b${i}`} className={view === i + 2 ? "cur" : ""} onClick={() => onGoto(i + 2)}>{moves[i + 1].san}</button>
        : <span key={`b${i}`} />
    );
  }
  return <div className="moves" ref={ref}>{rows}</div>;
}

export function Nav({ view, total, onGoto }) {
  return (
    <div className="nav">
      <button className="btn" aria-label="First move" disabled={view === 0} onClick={() => onGoto(0)}>&#9198;&#xFE0E;</button>
      <button className="btn" aria-label="Previous move" disabled={view === 0} onClick={() => onGoto(view - 1)}>&#9664;&#xFE0E;</button>
      <button className="btn" aria-label="Next move" disabled={view === total} onClick={() => onGoto(view + 1)}>&#9654;&#xFE0E;</button>
      <button className="btn" aria-label="Latest move" disabled={view === total} onClick={() => onGoto(total)}>&#9197;&#xFE0E;</button>
    </div>
  );
}

export default function PlayPanel({ play, turn, inCheck, onPrefs, onStart, onRematch, onNewGame, onFlip, onUndo, onResign, onGoto }) {
  const bot = BOTS.find((b) => b.id === play.botId);

  if (play.stage === "setup") {
    return (
      <div className="card">
        <h2>Play a bot</h2>
        <p className="sub">Pick an opponent, your colour, and a clock.</p>

        <div className="label">Opponent</div>
        <div className="botlist">
          {BOTS.map((b) => (
            <button key={b.id} className="bot" aria-pressed={play.botId === b.id} onClick={() => onPrefs({ botId: b.id })}>
              <span>
                <div className="nm">{b.name}</div>
                <div className="bl">{b.blurb}</div>
              </span>
              <span className="pips" aria-label={`Strength ${b.id} of 5`}>
                {[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= b.id ? "on" : ""} />)}
              </span>
            </button>
          ))}
        </div>

        <div className="label">You play</div>
        <div className="seg">
          {[["w", "White"], ["r", "Random"], ["b", "Black"]].map(([v, l]) => (
            <button key={v} aria-pressed={play.color === v} onClick={() => onPrefs({ color: v })}>{l}</button>
          ))}
        </div>

        <div className="label">Clock</div>
        <div className="seg">
          {TIMES.map((t) => (
            <button key={t.s} aria-pressed={play.tc === t.s} onClick={() => onPrefs({ tc: t.s })}>{t.label}</button>
          ))}
        </div>

        <button className="btn primary start" onClick={onStart}>Start game</button>
      </div>
    );
  }

  let status;
  if (play.over) {
    status = <div className="status over">{play.result.title}<small>{play.result.detail}</small></div>;
  } else if (play.thinking) {
    status = <div className="status">{bot.name} is thinking&hellip;</div>;
  } else if (turn === play.human) {
    status = <div className="status">Your move{inCheck && <small>Check.</small>}</div>;
  } else {
    status = <div className="status">{bot.name} to move{inCheck && <small>Check.</small>}</div>;
  }

  return (
    <>
      <div className="card">{status}</div>
      <div className="card">
        <MoveList moves={play.moves} view={play.view} onGoto={onGoto} />
        <Nav view={play.view} total={play.moves.length} onGoto={onGoto} />
        <div className="row first">
          <button className="btn" onClick={onFlip}>Flip board</button>
          {!play.over && <button className="btn" disabled={play.thinking} onClick={onUndo}>Undo</button>}
          {!play.over && <button className="btn danger" onClick={onResign}>Resign</button>}
        </div>
        {play.over && (
          <div className="row"><button className="btn primary" onClick={onRematch}>Rematch</button></div>
        )}
        <div className="row"><button className="btn" onClick={onNewGame}>New game</button></div>
      </div>
    </>
  );
}
