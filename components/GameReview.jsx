"use client";

import { useEffect, useId, useRef, useState } from "react";
import { StockfishReview, stockfishGameReview } from "@/lib/stockfish";
import ReviewPractice from "./ReviewPractice";
import { formatReviewScore } from "@/lib/reviewFeedback";
import { useSession } from "next-auth/react";

const reviewCache = new Map();
const remember = (key, findings) => { if (reviewCache.size >= 10) reviewCache.delete(reviewCache.keys().next().value); reviewCache.set(key, findings); };

export default function GameReview({ result, moves, color, visible = true, onGoto, onSelect, selectedPly, outcome, onNewGame, onRematch, rematchPending = false, actionsBusy = false, clockLabel, rated = false, gameId }) {
  const { data: account } = useSession();
  const [rating, setRating] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");
  const dialog = useRef(null);
  const section = useRef(null);
  const opened = useRef(false);
  const reviewRequested = useRef(false);
  const [review, setReview] = useState({ status: "loading", progress: 0, findings: [] });
  const [attempt, setAttempt] = useState(0);
  const [engineMode, setEngineMode] = useState("stockfish");
  const [practice, setPractice] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [arrowMode, setArrowMode] = useState("both");
  const headingId = useId();
  const detailId = useId();
  const callbacks = useRef({ onSelect, onGoto }); callbacks.current = { onSelect, onGoto };
  const active = review.findings[activeIndex];
  const isDraw = outcome === "draw" || result.title === "Draw";
  const won = !isDraw && (outcome === "win" || (!outcome && result.title === "You win"));
  const resultHeading = isDraw ? "Game Drawn" : won ? "You Won!" : "You Lost";
  const resultReason = result.detail === "Checkmate." ? "By Checkmate" : /resign/i.test(result.detail) ? "By Resignation" : /time/i.test(result.detail) ? "On Time" : result.detail;
  useEffect(() => {
    if (!visible || !rated || !gameId || !account?.user?.id) return;
    let cancelled = false;
    fetch("/api/community", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((data) => {
      const entry = data?.profile?.ratingHistory?.find((entry) => entry.gameId === gameId);
      if (!cancelled && entry) setRating(entry);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [visible, rated, gameId, account?.user?.id]);
  function selectFinding(index, arrows = arrowMode) {
    const entry = review.findings[index];
    if (!entry) return;
    setActiveIndex(index); setPractice(null);
    callbacks.current.onSelect?.({ ...entry, arrowMode: arrows });
    callbacks.current.onGoto(entry.ply - 1);
  }
  useEffect(() => {
    if (reviewRequested.current && review.status === "done" && review.findings.length) {
      setActiveIndex(0); setPractice(null); setArrowMode("both");
      callbacks.current.onSelect?.({ ...review.findings[0], arrowMode: "both" });
      callbacks.current.onGoto(review.findings[0].ply - 1);
    }
  }, [review.status, review.findings]);
  useEffect(() => {
    if (visible && !opened.current) { dialog.current.showModal(); opened.current = true; }
    if (!visible) dialog.current?.close();
  }, [visible]);
  useEffect(() => {
    let worker;
    let engine;
    let cancelled = false;
    const cacheKey = JSON.stringify([engineMode, color, moves.map(({ from, to, promotion }) => [from, to, promotion])]);
    callbacks.current.onSelect?.(null);
    setPractice(null);
    if (reviewCache.has(cacheKey)) { setReview({ status: "done", ...reviewCache.get(cacheKey) }); return; }
    setReview({ status: "loading", progress: 0, findings: [] });
    if (engineMode === "stockfish") {
      try {
        engine = new StockfishReview();
        stockfishGameReview(engine, moves, color, (progress) => { if (!cancelled) setReview((current) => ({ ...current, progress })); }, () => cancelled)
          .then((data) => { if (!cancelled) { remember(cacheKey, data); setReview({ status: "done", ...data }); } })
          .catch((error) => { if (!cancelled) setReview({ status: "error", error: error.message, findings: [] }); })
          .finally(() => engine.terminate());
      } catch { setReview({ status: "error", error: "Stockfish is unavailable. Try basic review.", findings: [] }); }
      return () => { cancelled = true; engine?.terminate(); };
    }
    try {
      worker = new Worker(new URL("../lib/review.worker.js", import.meta.url));
      worker.onmessage = ({ data }) => {
        if (data.error) setReview({ status: "error", error: data.error, findings: [] });
        else if (data.done) { const completed = { findings: data.findings, summary: data.summary }; remember(cacheKey, completed); setReview({ status: "done", ...completed }); worker.terminate(); }
        else setReview((current) => ({ ...current, progress: data.progress }));
      };
      worker.onerror = () => { setReview({ status: "error", findings: [], error: "Review could not load. Please try again." }); worker.terminate(); };
      worker.postMessage({ moves, color });
    } catch { setReview({ status: "error", findings: [], error: "Game review needs browser worker support." }); }
    return () => worker?.terminate();
  }, [moves, color, attempt, engineMode]);
  const close = () => dialog.current.close();
  const backToBoard = () => { reviewRequested.current = false; close(); callbacks.current.onSelect?.(null); callbacks.current.onGoto(moves.length); };
  return <>
    <dialog ref={dialog} className={`game-result-dialog result-popup ${won ? "victory" : isDraw ? "drawn" : "defeat"}`} aria-labelledby={headingId} aria-describedby={detailId} onCancel={(event) => { event.preventDefault(); backToBoard(); }}>
      <button className="result-close" aria-label="Back to board" onClick={backToBoard}>×</button>
      <header className="result-popup-heading"><h2 id={headingId}><span aria-hidden="true">{won ? "🏆" : isDraw ? "🤝" : "♚"}</span> {resultHeading}</h2><p id={detailId}>{resultReason}</p></header>
      <div className="result-game-stats"><div><span className="result-stat-icon" aria-hidden="true">◴</span><div><strong>{rating ? rating.rating : rated ? "…" : "Unrated"}{rating && <small className={rating.change < 0 ? "negative" : "positive"}>{rating.change > 0 ? "+" : ""}{rating.change}</small>}</strong><span>{rated ? `${rating?.category || "Online"} rating` : "Practice game"}</span></div></div><div><span className="result-stat-icon trophy" aria-hidden="true">♜</span><div><strong>{Math.ceil(moves.length / 2)}</strong><span>Moves played</span></div></div></div>
      <div className="result-coach"><span className="result-coach-avatar" aria-hidden="true">♞</span><p>{review.status === "loading" ? "Let's take a closer look. Your move-by-move review is being prepared." : review.status === "error" ? "There is more to learn from this game. Open Game Review to retry the analysis." : !moves.length ? "Ready for another game? Every game is a fresh start." : review.findings.length ? `${won ? "Nice win! " : "Keep going! "}We found ${review.findings.length} key ${review.findings.length === 1 ? "moment" : "moments"} worth reviewing. Try the better moves and build on your game.` : "You kept your moves on track at this analysis depth. Review the game to see how it unfolded."}</p></div>
      <div className="result-quality" aria-label="Engine move summary">{[["best", "★", "Best"], ["excellent", "✓", "Excellent"], ["mistakes", "?!", "To improve"]].map(([key, symbol, label]) => <div key={key} className={key}><strong><span aria-hidden="true">{symbol}</span> {review.status === "done" ? review.summary?.[key] ?? "—" : "—"}</strong><span>{label}</span></div>)}</div>
      <button className="result-review-button" autoFocus onClick={() => { reviewRequested.current = true; close(); if (review.findings.length) selectFinding(activeIndex); section.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><span aria-hidden="true">★</span> Game Review</button>
      <div className="result-popup-actions">{onNewGame && <button onClick={() => { close(); onNewGame(); }}>New {clockLabel || "game"}</button>}{onRematch && <button disabled={actionsBusy || rematchPending} onClick={() => { close(); onRematch(); }}>{rematchPending ? "Rematch requested" : "Rematch"}</button>}{!onNewGame && !onRematch && <button onClick={backToBoard}>Back to game</button>}</div>
    </dialog>
    <section className="card game-review" ref={section} aria-label="Post-game review">
      <div className="review-title"><span className="eyebrow">LEARN FROM YOUR GAME</span><h2>Game review</h2></div>
      <p className="sub">{engineMode === "stockfish" ? "Stockfish 19 · Up to depth 16, limited to 0.4 seconds per position." : "Basic two-ply review. Deeper tactics may be missed."}</p>
      <label className="field-label">Analysis engine <select value={engineMode} onChange={(event) => { setEngineMode(event.target.value); setPractice(null); }}><option value="stockfish">Stockfish (deeper review)</option><option value="basic">Basic (quick review)</option></select></label>
      <p className="review-legend"><span className="mistake">Red: played move</span><span className="best">Green: better move</span></p>
      {review.status === "loading" && <div className="review-loading"><p role="status">Finding your key moments… {review.progress}/{moves.length}</p><progress value={review.progress} max={Math.max(1, moves.length)} aria-label="Game analysis progress" /><p className="sub">Your board stays available while we analyse.</p></div>}
      {review.status === "error" && <div className="review-error"><p role="alert">{review.error}</p><div className="row"><button className="btn" onClick={() => setAttempt((value) => value + 1)}>Retry review</button>{engineMode === "stockfish" && <button className="btn" onClick={() => setEngineMode("basic")}>Use basic review</button>}</div></div>}
      {review.status === "done" && <>
        <p role="status">{review.findings.length ? `${review.findings.length} key moments to improve` : moves.length ? "No significant mistakes found at this analysis depth." : "No moves to review."}</p>
        {review.findings.length > 0 && <div className="review-counts">{["Inaccuracy", "Mistake", "Blunder"].map((label) => <div key={label} className={label.toLowerCase()}><strong>{review.findings.filter((entry) => entry.label === label).length}</strong><span>{label === "Inaccuracy" ? "Inaccuracies" : `${label}s`}</span></div>)}</div>}
        {active && <>
          {account?.user && <><button className="btn" onClick={async () => { try { const response = await fetch("/api/platform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "saveMistake", fen: active.fen, bestMove: active.bestMove }) }); const value = await response.json(); if (!response.ok) throw new Error(value.error); setSaveMessage("Saved to your personal practice in Training."); } catch (error) { setSaveMessage(error.message); } }}>Save to personal practice</button><p role="status">{saveMessage}</p></>}
          <div className="review-moment-nav"><button className="btn" aria-label="Previous mistake" disabled={activeIndex === 0} onClick={() => selectFinding(activeIndex - 1)}>←</button><span>Moment {activeIndex + 1} of {review.findings.length}</span><button className="btn" aria-label="Next mistake" disabled={activeIndex === review.findings.length - 1} onClick={() => selectFinding(activeIndex + 1)}>→</button></div>
          <article className={`review-moment ${active.label.toLowerCase()}`}>
            <div className="review-moment-heading"><span className="review-move-number">{Math.ceil(active.ply / 2)}{active.color === "w" ? "." : "…"} {active.played}</span><span className={`review-label ${active.label.toLowerCase()}`}>{active.label === "Blunder" ? "??" : active.label === "Mistake" ? "?" : "?!"} {active.label}</span></div>
            <p>{active.reason}</p>
            <div className="review-move-comparison"><div><span>You played</span><strong>{active.played}</strong><small>{formatReviewScore(active.playedScore, active.color)}</small></div><div className="review-best-move"><span>Better move</span><strong>{active.best}</strong><small>{formatReviewScore(active.bestScore, active.color)}</small></div></div>
            <p className="review-eval-note">Evaluation for White. + favours White, − favours Black; M means a forced mate.</p>
            {active.line?.length > 0 && <p className="review-continuation"><span>Suggested continuation</span><strong>{active.line.join("  ")}</strong></p>}
            <div className="review-arrow-options" role="group" aria-label="Review arrows">{[["both", "Both arrows"], ["played", "Your move"], ["best", "Better move"]].map(([value, label]) => <button key={value} aria-pressed={arrowMode === value} onClick={() => { setArrowMode(value); selectFinding(activeIndex, value); }}>{label}</button>)}</div>
            <button className="btn review-position-btn" onClick={() => selectFinding(activeIndex)}>{selectedPly === active.ply ? "Showing position before your move" : "Show mistake & better move"}</button>
            <button className="btn primary review-practice-btn" aria-expanded={practice === active.ply} onClick={() => setPractice(practice === active.ply ? null : active.ply)}>{practice === active.ply ? "Close practice" : "Try the better move"}</button>
            {practice === active.ply && <ReviewPractice key={`${engineMode}-${active.ply}`} entry={active} />}
          </article>
          <div className="review-moment-list" aria-label="Key moments">{review.findings.map((entry, index) => <button key={entry.ply} className={entry.label.toLowerCase()} aria-pressed={activeIndex === index} aria-label={`Move ${Math.ceil(entry.ply / 2)} ${entry.played}, ${entry.label}`} onClick={() => selectFinding(index)}><span>{Math.ceil(entry.ply / 2)}{entry.color === "w" ? "." : "…"} {entry.played}</span><span>{entry.label === "Blunder" ? "??" : entry.label === "Mistake" ? "?" : "?!"}</span></button>)}</div>
        </>}
      </>}
      <p className="engine-credit"><a href="/engine/SOURCE.txt">Stockfish source</a> · <a href="/engine/COPYING.txt">GPL-3.0 license</a></p>
    </section>
  </>;
}
