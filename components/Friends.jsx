"use client";

import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "./Board";
import PlayerBar from "./PlayerBar";
import { TIMES } from "@/lib/constants";
import { buildGame, capturedInfo } from "@/lib/chessUtil";
import { Nav } from "./PlayPanel";
import { resolveFriendSession } from "@/lib/friendSession";

export default function Friends() {
  const [room, setRoom] = useState(null);
  const [session, setSession] = useState(null);
  const [invite, setInvite] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("w");
  const [tc, setTc] = useState(300);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [view, setView] = useState(null);
  const lock = useRef(false);
  const revision = useRef(0);

  useEffect(() => {
    let saved;
    try {
      saved = JSON.parse(sessionStorage.getItem("gambit:room") || "null");
    } catch { /* Private browsing may disable storage. */ }
    const initial = resolveFriendSession(window.location.search, window.location.hash, saved);
    if (initial.invite) setInvite(initial.invite);
    else if (initial.session) setSession(initial.session);
  }, []);

  const saveSession = (value) => {
    try { sessionStorage.setItem("gambit:room", JSON.stringify(value)); } catch { /* Session remains in memory. */ }
    setSession(value);
  };
  const request = async (url, token, action) => {
    const response = await fetch(url, { method: action ? "POST" : "GET", cache: "no-store",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(action ? { body: JSON.stringify(action) } : {}) });
    let data;
    try { data = await response.json(); }
    catch { throw new Error("The game server returned an invalid response. Restart the local server and try again."); }
    if (!response.ok) throw Object.assign(new Error(data.error || "Could not connect. Please try again."), { status: response.status });
    return data;
  };

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    let timer;
    const poll = async () => {
      if (!lock.current) {
        const version = revision.current;
        try {
          const data = await request(`/api/rooms/${session.id}`, session.token);
          if (!cancelled && !lock.current && version === revision.current) { setRoom(data); setError(""); }
        } catch (e) {
          if (!cancelled && version === revision.current) {
            if ([403, 404, 410].includes(e.status)) {
              try { sessionStorage.removeItem("gambit:room"); } catch { /* Storage unavailable. */ }
              setSession(null); setRoom(null); setView(null);
              setError(`${e.message} Create a new invite below.`);
              return;
            }
            setError(e.message);
          }
        }
      }
      if (!cancelled) timer = setTimeout(poll, 1000);
    };
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [session]);

  const enter = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      if (invite) {
        const data = await request(`/api/rooms/${invite.id}`, invite.token, { type: "join", name });
        setRoom(data); saveSession({ id: invite.id, token: data.token }); setInvite(null);
        window.history.replaceState(null, "", `?room=${invite.id}`);
      } else {
        const data = await request("/api/rooms", null, { name, color, tc });
        saveSession({ id: data.id, token: data.token });
      }
    } catch (e) { setError(e.message); }
    finally { lock.current = false; setBusy(false); }
  };
  const act = async (action) => {
    if (lock.current) return;
    revision.current += 1;
    lock.current = true; setBusy(true); setError("");
    try { setRoom(await request(`/api/rooms/${session.id}`, session.token, action)); setView(null); }
    catch (e) { setError(e.message); }
    finally { lock.current = false; setBusy(false); }
  };
  const reset = () => {
    if (room?.joined && !room.result && !window.confirm("Leave this game? You can return by reloading before creating another game.")) return;
    try { sessionStorage.removeItem("gambit:room"); } catch { /* Storage unavailable. */ }
    setSession(null); setRoom(null); setInvite(null); setView(null); setError(""); setFlipped(false); setCopied(false);
    window.history.replaceState(null, "", window.location.pathname);
  };

  const moves = room?.moves || [];
  const ply = view === null ? moves.length : Math.min(view, moves.length);
  const game = buildGame(undefined, moves);
  const shown = ply === moves.length ? game : buildGame(undefined, moves, ply);
  const orient = flipped ? (room?.color === "w" ? "b" : "w") : room?.color || "w";
  const top = orient === "w" ? "b" : "w";
  const info = capturedInfo(shown);
  const active = room?.joined && !room.result;
  const player = (side) => ({ name: room?.names[side] || "Waiting for a friend", avatar: side.toUpperCase(),
    captured: info.lostBy[side === "w" ? "b" : "w"], diff: side === "w" ? info.diff : -info.diff,
    showClock: !!room?.tc, clock: room?.clocks[side] || 0, running: active && game.turn() === side, low: room?.clocks[side] < 20000 });
  const link = room?.invite ? `${window.location.origin}${window.location.pathname}?room=${room.id}#invite=${room.invite}` : "";

  return <main className="layout">
    <section className="stage" aria-label="Online chess board">
      <PlayerBar {...player(top)} />
      <Board game={room ? shown : new Chess()} orient={orient} lastMove={moves[ply - 1]} myColor={room?.color}
        canMove={!!active && !busy && ply === moves.length && game.turn() === room.color}
        onMove={(from, to, promotion) => act({ type: "move", from, to, promotion, ply: moves.length })} />
      <PlayerBar {...player(orient)} />
      <p className="board-note">{room ? `You play ${room.color === "w" ? "white" : "black"}. Games expire after 24 hours.` : "A board for you. A link for your friend."}</p>
    </section>
    <aside className="panel">
      <div className="card">
        <span className="eyebrow">PLAY TOGETHER</span>
        <h2>{session ? room?.result?.title || (room?.joined ? (game.turn() === room.color ? "Your move" : "Your friend’s move") : "Waiting for your friend") : invite ? "You’re invited" : "Chess is better with friends"}</h2>
        <p className="sub">{room?.result?.detail || (session ? (game.isCheck() && active ? "Check. Protect your king." : "Live moves, your own clock, and a little friendly competition.") : "Invite a friend and play from separate devices. No account needed.")}</p>
        {!session && <>
          <label className="field-label" htmlFor="friend-name">Your name</label>
          <input id="friend-name" className="text-input" maxLength={30} value={name} placeholder="Enter your name" onChange={(e) => setName(e.target.value)} />
          {!invite && <>
            <div className="label">Your pieces</div><div className="seg">{[["w", "White"], ["r", "Random"], ["b", "Black"]].map(([value, label]) => <button key={value} aria-pressed={color === value} onClick={() => setColor(value)}>{label}</button>)}</div>
            <div className="label">Time per player</div><div className="seg">{TIMES.map((time) => <button key={time.s} aria-pressed={tc === time.s} onClick={() => setTc(time.s)}>{time.label}</button>)}</div>
          </>}
          <button className="btn primary start" disabled={busy} onClick={enter}>{busy ? "Connecting…" : invite ? "Join game" : "Create invite link"}</button>
        </>}
        {session && !room && <p className="sub">Connecting to your game…</p>}
        {link && !room.joined && <div className="invite-box">
          <label className="field-label" htmlFor="invite-link">Send this link to your friend</label>
          <input id="invite-link" className="text-input" value={link} readOnly onFocus={(e) => e.target.select()} />
          <button className="btn primary start" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setError("Select the link above and copy it manually."); } }}>{copied ? "Link copied ✓" : "Copy invite link"}</button>
          <p className="sub">The clock starts when your friend joins.</p>
        </div>}
        <p className="msg bad" role="status">{error}</p>
      </div>
      {room && <div className="card">
        <div className="label">Move history <span className="badge">{moves.length} plies</span></div>
        <div className="friend-moves">{moves.length ? moves.map((move, i) => <button key={i} className={`btn ${ply === i + 1 ? "selected-move" : ""}`} onClick={() => setView(i + 1)}>{i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ""}{move.san}</button>) : <p className="sub">Your opening story starts here.</p>}</div>
        <Nav view={ply} total={moves.length} onGoto={(value) => setView(value === moves.length ? null : value)} />
        <div className="row first"><button className="btn" onClick={() => setFlipped(!flipped)}>Flip board</button>{active && <button className="btn danger" disabled={busy} onClick={() => { if (window.confirm("Resign this game?")) act({ type: "resign" }); }}>Resign</button>}</div>
      </div>}
      {session && <button className="btn" onClick={reset}>Create another game</button>}
      {!session && <div className="card friend-tip"><span className="eyebrow">HOW IT WORKS</span><p>Create a game, send the invite, and make your first move. Keep this tab open or reload to reconnect.</p></div>}
    </aside>
  </main>;
}
