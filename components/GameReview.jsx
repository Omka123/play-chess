"use client";

import { useEffect, useRef, useState } from "react";

export default function GameReview({ result, moves, color, visible = true, onGoto, onSelect, selectedPly }) {
  const dialog = useRef(null);
  const section = useRef(null);
  const opened = useRef(false);
  const [review, setReview] = useState({ status: "loading", progress: 0, findings: [] });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (visible && !opened.current) { dialog.current.showModal(); opened.current = true; }
    if (!visible) dialog.current?.close();
  }, [visible]);
  useEffect(() => {
    let worker;
    setReview({ status: "loading", progress: 0, findings: [] });
    try {
      worker = new Worker(new URL("../lib/review.worker.js", import.meta.url));
      worker.onmessage = ({ data }) => {
        if (data.error) setReview({ status: "error", error: data.error, findings: [] });
        else if (data.done) { setReview({ status: "done", findings: data.findings }); worker.terminate(); }
        else setReview((current) => ({ ...current, progress: data.progress }));
      };
      worker.onerror = () => { setReview({ status: "error", findings: [], error: "Review could not load. Please try again." }); worker.terminate(); };
      worker.postMessage({ moves, color });
    } catch { setReview({ status: "error", findings: [], error: "Game review needs browser worker support." }); }
    return () => worker?.terminate();
  }, [moves, color, attempt]);
  const close = () => dialog.current.close();
  return <>
    <dialog ref={dialog} className="game-result-dialog" aria-labelledby="game-result-heading" aria-describedby="game-result-detail">
      <span className="result-piece" aria-hidden="true">♚</span>
      <h2 id="game-result-heading">{result.detail === "Checkmate." ? "Checkmate!" : "Game over"}</h2>
      <h3>{result.title}</h3><p id="game-result-detail">{result.detail}</p>
      <button className="btn primary" autoFocus onClick={() => { close(); section.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Review my mistakes</button>
      <button className="btn" onClick={close}>Back to board</button>
    </dialog>
    <section className="card game-review" ref={section} aria-label="Post-game review">
      <h2>Game review</h2>
      <p className="sub">Your moves · Basic two-ply analysis. Deeper tactics may be missed.</p>
      <p className="review-legend"><span className="mistake">Red: played move</span><span className="best">Green: better move</span></p>
      {review.status === "loading" && <p role="status">Reviewing moves… {review.progress}/{moves.length}</p>}
      {review.status === "error" && <><p role="alert">{review.error}</p><button className="btn" onClick={() => setAttempt((value) => value + 1)}>Retry review</button></>}
      {review.status === "done" && <>
        <p role="status">{review.findings.length ? `${review.findings.length} moves to improve` : moves.length ? "No significant mistakes found in this basic review." : "No moves to review."}</p>
        <div className="review-findings">{review.findings.map((entry) => <div className={`review-finding${selectedPly === entry.ply ? " selected" : ""}`} key={entry.ply}>
          <strong>{Math.ceil(entry.ply / 2)}{entry.color === "w" ? "." : "…"} {entry.played} <span className={`review-label ${entry.label.toLowerCase()}`}>{entry.label}</span></strong>
          <p>{entry.reason}</p><p>Better move: <strong>{entry.best}</strong></p>
          <button className="btn" aria-pressed={selectedPly === entry.ply} onClick={() => { onSelect?.(entry); onGoto(entry.ply - 1); }}>Show mistake & better move</button>
        </div>)}</div>
      </>}
    </section>
  </>;
}
