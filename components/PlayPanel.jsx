"use client";

import { useEffect, useRef } from "react";
import { BOTS, TIMES } from "@/lib/constants";
import ColorIcon from "./ColorIcon";

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
      <div className="card play-setup">
        <h2>Play Computer</h2>
        <p className="sub">Open Play with Bot to choose your opponent.</p>

        <details className="bot-category">
          <summary>
            <span className="bot-category-icon" aria-hidden="true"><ColorIcon name="bot" size={30} /></span>
            <span><strong>Play with Bot</strong><small>{BOTS.length} bots · Selected: {bot.name}</small></span>
            <span className="bot-category-arrow" aria-hidden="true">›</span>
          </summary>
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
        </details>

        <fieldset className="setup-field"><legend>You play</legend>
        <div className="seg setup-colors">
          {[["w", "White"], ["r", "Random"], ["b", "Black"]].map(([v, l]) => (
            <button key={v} aria-pressed={play.color === v} onClick={() => onPrefs({ color: v })}>{l}</button>
          ))}
        </div>
        </fieldset>

        <fieldset className="setup-field"><legend>Clock</legend>
        <div className="seg setup-clocks">
          {TIMES.map((t) => (
            <button key={t.s} aria-pressed={play.tc === t.s} onClick={() => onPrefs({ tc: t.s })}>{t.label}</button>
          ))}
        </div>
        </fieldset>

        <label className="field-label setup-increment">Increment<select value={play.increment || 0} disabled={!play.tc} onChange={(event) => onPrefs({ increment: Number(event.target.value) })}><option value={0}>None</option><option value={2}>+2 seconds per move</option><option value={5}>+5 seconds per move</option></select></label>
        <button className="btn primary start" onClick={onStart}><ColorIcon name="play" />Start game</button>
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
          <button className="btn" onClick={onFlip}><ColorIcon name="flip" />Flip board</button>
          {!play.over && <button className="btn" disabled={play.thinking} onClick={onUndo}><ColorIcon name="undo" />Undo</button>}
          {!play.over && <button className="btn danger" onClick={onResign}><ColorIcon name="flag" />Resign</button>}
        </div>
        {play.over && (
          <div className="row"><button className="btn primary" onClick={onRematch}>Rematch</button></div>
        )}
        <div className="row"><button className="btn" onClick={onNewGame}>New game</button></div>
      </div>
    </>
  );
}
