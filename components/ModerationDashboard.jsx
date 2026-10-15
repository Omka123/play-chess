"use client";
import { useState } from "react";
export default function ModerationDashboard({ initial }) {
  const [data, setData] = useState(initial);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("open");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const reports = data.reports.filter((report) => filter === "all" || report.status === filter);
  async function act(action) {
    if (note.trim().length < 5) { setError("Add a moderation note before choosing an action."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/moderation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...action, note }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      const refresh = await fetch("/api/moderation", { cache: "no-store" }); const next = await refresh.json(); if (!refresh.ok) throw new Error(next.error);
      setData(next); setNote(""); setNotice("Action saved to the moderation log.");
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <div className="moderation-dashboard">
    <div className="rating-cards"><div className="card"><span>Open reports</span><strong>{data.reports.filter((report) => report.status === "open").length}</strong></div><div className="card"><span>Players</span><strong>{data.players.length}</strong></div><div className="card"><span>Suspended</span><strong>{data.players.filter((player) => player.suspended).length}</strong></div></div>
    <div className="card moderation-note"><label className="field-label">Note for the next action<textarea className="text-input" value={note} maxLength={500} minLength={5} rows={3} onChange={(event) => setNote(event.target.value)} placeholder="Explain the evidence and reason. Suspension reasons are visible to the affected player." /></label><p className="sub">Every action requires a note and is recorded. Reports alone do not establish cheating.</p>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}</div>
    <section><h2>Reports</h2><label className="field-label">Status<select value={filter} onChange={(event) => setFilter(event.target.value)}>{["open", "resolved", "dismissed", "all"].map((value) => <option key={value}>{value}</option>)}</select></label>
      {!reports.length && <p>No reports with this status.</p>}
      {reports.map((report) => <article className="card moderation-report" key={report.id}><span className="eyebrow">{report.type} · {report.status}</span><h3>{report.reason.replaceAll("-", " ")}</h3><p className="report-details">{report.details}</p><p><strong>Target:</strong> <code>{report.target}</code></p><p className="sub">Reporter: {report.reporterId} · Reference: {report.id}</p>
        {report.evidence && <details><summary>Game evidence</summary><p>{report.evidence.names.w} vs {report.evidence.names.b}</p><p>{report.evidence.result?.detail || "Game in progress"}</p><p className="report-details">{report.evidence.moves.map((move, index) => `${index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ""}${move.san}`).join(" ")}</p></details>}
        {report.moderatorNote && <p>Decision note: {report.moderatorNote}</p>}
        <div className="row">{report.status === "open" && <><button className="btn" disabled={busy} onClick={() => act({ type: "resolve", reportId: report.id })}>Resolve report</button><button className="btn" disabled={busy} onClick={() => act({ type: "dismiss", reportId: report.id })}>Dismiss report</button></>}
          {report.targetUserId && <button className="btn danger" disabled={busy} onClick={() => act({ type: "suspend", userId: report.targetUserId })}>Suspend player</button>}
          {report.type === "replay" && <button className="btn danger" disabled={busy} onClick={() => act({ type: "hideReplay", replayId: report.target })}>Hide replay</button>}
        </div></article>)}
    </section>
    <section><h2>Manage players</h2><input className="text-input" aria-label="Search players" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search username or display name" />
      <div className="history-table-wrap"><table className="history-table"><thead><tr><th>Player</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.players.filter((player) => `${player.name} ${player.username}`.toLowerCase().includes(search.toLowerCase())).map((player) => <tr key={player.id}><td>{player.name}<small>@{player.username}</small></td><td>{player.staff ? "Moderator" : player.suspended ? "Suspended" : "Active"}{player.suspensionReason && <small>{player.suspensionReason}</small>}</td><td>{!player.staff && <div className="row"><button className="btn" disabled={busy} onClick={() => act({ type: player.suspended ? "restore" : "suspend", userId: player.id })}>{player.suspended ? "Restore account" : "Suspend account"}</button><button className="btn" disabled={busy} onClick={() => act({ type: "resetProfile", userId: player.id })}>Reset profile</button></div>}</td></tr>)}</tbody></table></div>
    </section>
    <section><h2>Hidden shared replays</h2>{data.hiddenReplays.length ? data.hiddenReplays.map((id) => <div className="social-row" key={id}><code>{id}</code><button className="btn" disabled={busy} onClick={() => act({ type: "restoreReplay", replayId: id })}>Restore replay</button></div>) : <p>No hidden replays.</p>}</section>
    <details className="card"><summary>Recent moderation actions</summary>{data.audit.map((entry) => <div className="moderation-audit" key={entry.id}><strong>{entry.action}</strong><p>{entry.note}</p><small>{entry.target} · {new Date(entry.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</small></div>)}</details>
  </div>;
}
