"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { INITIAL_RATING } from "@/lib/ratings";
const avatars = { knight: "♞", king: "♚", queen: "♛", rook: "♜", bishop: "♝", pawn: "♟" };
export default function CommunityDashboard() {
  const { update } = useSession();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState("blitz");
  async function request(action) {
    const response = await fetch("/api/community", { cache: "no-store", ...(action ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) } : {}) });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error);
    return value;
  }
  useEffect(() => {
    let cancelled = false, timer;
    const poll = async () => {
      try { const value = await request(); if (!cancelled) { setData(value); setForm((previous) => previous || value.profile); setError(""); } }
      catch (error) { if (!cancelled) setError(error.message); }
      if (!cancelled) timer = setTimeout(poll, 15000);
    };
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);
  async function act(action, message) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try { const value = await request(action); setData(value); setNotice(message); if (action.type === "profile") { setForm(value.profile); await update(); } }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  function openGame() {
    try { sessionStorage.setItem("gambit:room", JSON.stringify(data.active)); window.location.assign("/?online=1"); }
    catch { setError("Allow browser storage to open your game."); }
  }
  const history = data?.profile.ratingHistory.filter((entry) => entry.category === category) || [];
  const startingRating = history.length ? history[0].rating - history[0].change : data?.profile.ratings[category] ?? INITIAL_RATING;
  const points = [startingRating, ...history.map((entry) => entry.rating)];
  const low = Math.min(...points) - 20, high = Math.max(...points) + 20;
  return <section className="community-dashboard" aria-label="Player profile and friends">
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!data ? <p>Loading profile…</p> : <>
      {data.profile.suspended && <div className="card suspension-notice" role="alert"><strong>Your account is suspended from online play and community actions.</strong><p>{data.profile.suspensionReason}</p><a href="/contact">Contact the operator to appeal</a></div>}
      <div className="profile-heading"><span className="profile-avatar" aria-hidden="true">{avatars[data.profile.avatar]}</span><div><h2>{data.profile.name}</h2><p>@{data.profile.username}</p></div></div>
      <div className="rating-cards">{Object.entries(data.profile.ratings).map(([name, rating]) => <div className="card" key={name}><span>{name}</span><strong>{rating}</strong></div>)}</div>
      <p className="sub">{data.profile.ratedCount} rated games · New players start at {INITIAL_RATING}. Win rated games to gain points; changes depend on your opponent's rating. Computer and direct friend games are unrated.</p>
      <details className="card"><summary>Edit player profile</summary><form onSubmit={(event) => { event.preventDefault(); act({ type: "profile", username: form.username, name: form.name, avatar: form.avatar }, "Profile saved."); }}>
        <label className="field-label">Username<input className="text-input" value={form.username} minLength={3} maxLength={20} pattern="[a-z][a-z0-9_]{2,19}" required onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
        <label className="field-label">Display name<input className="text-input" value={form.name} maxLength={30} required onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="field-label">Avatar<select value={form.avatar} onChange={(event) => setForm({ ...form, avatar: event.target.value })}>{Object.entries(avatars).map(([name, symbol]) => <option key={name} value={name}>{symbol} {name}</option>)}</select></label>
        <button className="btn primary" disabled={busy}>Save profile</button>
      </form></details>
      <div className="card"><h3>Rating progress</h3><label>Time control <select value={category} onChange={(event) => setCategory(event.target.value)}><option>bullet</option><option>blitz</option><option>rapid</option></select></label>
        {history.length ? <><svg className="rating-chart" viewBox="0 0 600 140" role="img" aria-label={`${category} rating: ${points.join(", ")}`}><polyline fill="none" stroke="currentColor" strokeWidth="3" points={points.map((value, index) => `${10 + index * 580 / Math.max(1, points.length - 1)},${130 - (value - low) / (high - low) * 120}`).join(" ")} /></svg><p>Latest: {history.at(-1).rating} ({history.at(-1).change >= 0 ? "+" : ""}{history.at(-1).change})</p></> : <p className="sub">Finish a rated online game to start your chart.</p>}
      </div>
      <div className="card"><h3>Friends</h3><form className="row" onSubmit={(event) => { event.preventDefault(); act({ type: "request", username }, "Friend request sent."); }}><input className="text-input" aria-label="Friend username" placeholder="Enter a friend's username" value={username} required onChange={(event) => setUsername(event.target.value)} /><button className="btn" disabled={busy}>Add friend</button></form>
        {!data.friends.length && <p className="sub">Share your username to connect with a friend.</p>}
        {data.friends.map((friend) => <div className="social-row" key={friend.id}><span><strong>{avatars[friend.avatar]} {friend.name}</strong><small>@{friend.username} · {friend.online ? "Online" : "Offline"}</small></span><button className="btn" disabled={busy} onClick={() => act({ type: "challenge", userId: friend.id }, "Challenge sent. It expires in two minutes.")}>Challenge · 5 min</button><button className="btn" disabled={busy} onClick={() => act({ type: "remove", userId: friend.id }, "Friend removed.")}>Remove</button></div>)}
        {data.requests.map((player) => <div className="social-row" key={player.id}><span>@{player.username} wants to be friends</span><button className="btn" disabled={busy} onClick={() => act({ type: "accept", userId: player.id }, "Friend added.")}>Accept</button><button className="btn" disabled={busy} onClick={() => act({ type: "decline", userId: player.id }, "Request declined.")}>Decline</button></div>)}
        {data.challenges.map((challenge) => <div className="social-row" key={challenge.id}><span>{challenge.player.name} challenged you · 5 min</span><button className="btn primary" disabled={busy} onClick={() => act({ type: "acceptChallenge", id: challenge.id }, "Challenge accepted. Open your game below.")}>Accept</button><button className="btn" disabled={busy} onClick={() => act({ type: "declineChallenge", id: challenge.id }, "Challenge declined.")}>Decline</button></div>)}
        {data.active && <button className="btn primary" onClick={openGame}>Open your active game</button>}
      </div>
    </>}
  </section>;
}
