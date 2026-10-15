"use client";
import { useState } from "react";
export default function ReportForm({ initialType = "player", initialTarget = "" }) {
  const [type, setType] = useState(["player", "game", "replay"].includes(initialType) ? initialType : "player");
  const [target, setTarget] = useState(initialTarget);
  const [reason, setReason] = useState("other");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  return <form className="report-form card" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    let identifier = target.trim();
    if (type !== "player") { try { const url = new URL(identifier); identifier = type === "game" ? url.searchParams.get("room") || url.pathname.split("/").filter(Boolean).at(-1) : url.pathname.split("/").filter(Boolean).at(-1); } catch { /* Already an ID. */ } }
    try {
      const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, target: identifier, reason, details }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setReceipt(data);
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }}>
    {receipt ? <div role="status"><h2>Report received</h2><p>{receipt.duplicate ? "Your existing report is already waiting for review." : "A moderator can now review your report. Sending a report does not automatically penalise a player."}</p><p>Reference: <code>{receipt.id}</code></p><button type="button" className="btn" onClick={() => { setReceipt(null); setDetails(""); }}>Report another issue</button></div> : <>
      <label className="field-label">What are you reporting?<select value={type} onChange={(event) => { setType(event.target.value); setTarget(""); }}><option value="player">Player profile or behaviour</option><option value="game">A game I played</option><option value="replay">Public shared replay</option></select></label>
      <label className="field-label">{type === "player" ? "Player username" : type === "game" ? "Game ID or game page URL" : "Replay ID or public replay URL"}<input className="text-input" required maxLength={500} value={target} onChange={(event) => setTarget(event.target.value)} placeholder={type === "player" ? "Their username, without @" : "Paste the ID or page URL"} /></label>
      <label className="field-label">Reason<select value={reason} onChange={(event) => setReason(event.target.value)}><option value="inappropriate-name">Inappropriate profile name</option><option value="harassment">Harassment</option><option value="cheating">Suspected unfair play</option><option value="spam">Spam or advertising abuse</option><option value="other">Other</option></select></label>
      <label className="field-label">Describe what happened<textarea className="text-input" required minLength={20} maxLength={2000} rows={6} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Give the facts and relevant move numbers. Do not include passwords, email credentials, or private invitation secrets." /></label>
      <p className="sub">Reports are private to moderators. Up to five reports per account per day.</p>{error && <p role="alert">{error}</p>}
      <button className="btn primary" disabled={busy}>{busy ? "Sending report…" : "Submit report"}</button>
    </>}
  </form>;
}
