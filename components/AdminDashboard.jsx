"use client";
import { useEffect, useRef, useState } from "react";
import ModerationDashboard from "./ModerationDashboard";

const date = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "—";
export default function AdminDashboard({ initial }) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState("users");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [moderation, setModeration] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState(null);
  const [note, setNote] = useState("");
  const noteRef = useRef(null);
  useEffect(() => { if (action) noteRef.current?.focus(); }, [action]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const params = tab === "moderation" ? "view=moderation" : new URLSearchParams({ search: query, page: String(page) });
    fetch(`/api/admin?${params}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      const next = await response.json(); if (!response.ok) throw new Error(next.error || "Unable to load admin data.");
      if (!controller.signal.aborted) { if (tab === "moderation") setModeration(next); else setData(next); }
    }).catch(err => { if (!controller.signal.aborted) setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tab, query, page, refresh]);

  async function save(event) {
    event.preventDefault(); if (!action || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: action.type, userId: action.user.id, note }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to save action.");
      setAction(null); setNote(""); setNotice("Action saved with your reason in the audit history."); setRefresh(value => value + 1);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  function selectAction(type, user) { setError(""); setNotice(""); setNote(""); setAction({ type, user }); }
  const stats = [["Google accounts", data.stats.accounts], ["Player profiles", data.stats.players], ["Open reports", data.stats.openReports], ["Suspended players", data.stats.suspended], ["Shared studies", data.stats.studies], ["Running events", data.stats.runningEvents]];
  return <div className="admin-dashboard">
    <section className="admin-stats" aria-label="Platform overview">{stats.map(([label, value]) => <div className="card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
    <div className="admin-toolbar"><nav aria-label="Admin sections">{[["users", "Users"], ["moderation", "Reports & audit"], ["system", "Service status"]].map(([value, label]) => <button className={`btn ${tab === value ? "primary" : ""}`} key={value} aria-pressed={tab === value} disabled={busy} onClick={() => { setTab(value); setAction(null); }}>{label}</button>)}</nav><button className="btn" disabled={loading || busy} onClick={() => setRefresh(value => value + 1)}>Refresh</button></div>
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {loading && <p role="status">Updating admin data…</p>}
    {tab === "users" && <section aria-labelledby="admin-users-title" aria-busy={loading}>
      <h2 id="admin-users-title">Registered users</h2>
      <form className="admin-search" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(1); }}><label htmlFor="admin-user-search">{data.searchHint}</label><div><input id="admin-user-search" className="text-input" value={search} onChange={event => setSearch(event.target.value)} maxLength={100} type="search" /><button className="btn primary" disabled={loading}>Search</button></div></form>
      {action && <form className="card admin-action" onSubmit={save} aria-labelledby="admin-action-title"><h3 id="admin-action-title">{action.type === "suspend" ? "Suspend" : action.type === "restore" ? "Restore access for" : "Reset profile for"} {action.user.name}</h3><p>{action.type === "suspend" ? "This prevents online play and community actions. The player can see your reason." : action.type === "restore" ? "This restores online play and community access." : "This replaces the public name, username and avatar with safe defaults."}</p><label htmlFor="admin-note">Reason for this action</label><textarea id="admin-note" ref={noteRef} className="text-input" value={note} onChange={event => setNote(event.target.value)} minLength={5} maxLength={500} required rows={3} /><div className="row"><button className="btn primary" disabled={busy || note.trim().length < 5}>{busy ? "Saving…" : "Save action"}</button><button type="button" className="btn" disabled={busy} onClick={() => setAction(null)}>Cancel</button></div></form>}
      <div className="admin-table-wrap"><table className="history-table admin-users-table"><caption>{data.pagination.total} matching account{data.pagination.total === 1 ? "" : "s"}</caption><thead><tr><th scope="col">User</th><th scope="col">Email / joined</th><th scope="col">Ratings</th><th scope="col">Status</th><th scope="col">Manage</th></tr></thead><tbody>{data.users.map(user => <tr key={user.id}><td><strong>{user.name}</strong>{user.username && <small>@{user.username}</small>}<details><summary>User ID</summary><code>{user.id}</code></details></td><td>{user.email || "Not available"}<small>{date(user.createdAt)}</small></td><td>{user.ratings ? <><span>Bullet {user.ratings.bullet}</span><small>Blitz {user.ratings.blitz} · Rapid {user.ratings.rapid}</small></> : "No profile yet"}<small>{user.ratedCount} rated games</small></td><td><span className={`admin-status ${user.suspended ? "is-suspended" : ""}`}>{user.isOwner ? "Owner" : user.deleted ? "Deleted" : user.suspended ? "Suspended" : "Active"}</span></td><td>{user.isOwner ? <small>Protected account</small> : user.deleted || user.staff ? <small>Protected</small> : <div className="admin-user-actions"><button className="btn" disabled={busy || loading} onClick={() => selectAction(user.suspended ? "restore" : "suspend", user)}>{user.suspended ? "Restore access" : "Suspend"}</button><button className="btn" disabled={busy || loading} onClick={() => selectAction("resetProfile", user)}>Reset profile</button></div>}</td></tr>)}</tbody></table></div>
      {!data.users.length && <p>No users found.</p>}
      <div className="admin-pagination"><button className="btn" disabled={loading || data.pagination.page <= 1} onClick={() => setPage(data.pagination.page - 1)}>Previous</button><span>Page {data.pagination.page} of {data.pagination.pages}</span><button className="btn" disabled={loading || data.pagination.page >= data.pagination.pages} onClick={() => setPage(data.pagination.page + 1)}>Next</button></div>
    </section>}
    {tab === "moderation" && moderation && !loading && <ModerationDashboard key={refresh} initial={moderation} endpoint="/api/admin?view=moderation" />}
    {tab === "system" && <section className="card admin-system"><h2>Service status</h2><dl><dt>Storage connection</dt><dd>{data.storage} · Connected at last refresh</dd><dt>Last checked</dt><dd>{new Date(data.checkedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</dd><dt>Current process uptime</dt><dd>{Math.floor(data.metrics.uptimeSeconds / 60)} minutes</dd><dt>Recorded service errors</dt><dd>{Object.entries(data.metrics.counters).length ? Object.entries(data.metrics.counters).map(([key, value]) => <span key={key}>{key}: {value.count}<br /></span>) : "No errors recorded in this process"}</dd></dl><p className="sub">{data.metrics.scope}</p><p>Your admin access comes from server configuration. Player profile flags and moderator roles cannot grant access to this panel.</p></section>}
  </div>;
}
