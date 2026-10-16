"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "./Board";
import PlayerBar from "./PlayerBar";
import GameReview from "./GameReview";
import { reviewArrows } from "@/lib/reviewArrows";
import { TIMES } from "@/lib/constants";
import { buildGame, capturedInfo } from "@/lib/chessUtil";
import { Nav, MoveList } from "./PlayPanel";
import { resolveFriendSession } from "@/lib/friendSession";
import { useSession } from "next-auth/react";
import OnlineMatchmaking from "./OnlineMatchmaking";
import MatchPanel from "./MatchPanel";
import MatchPromotion from "./MatchPromotion";
import GameExport from "./GameExport";

export default function Friends({ visible = true }) {
  const { data: account } = useSession();
  const [room, setRoom] = useState(null);
  const [reviewSelection, setReviewSelection] = useState(null);
  const [premove, setPremove] = useState(null);
  const [session, setSession] = useState(null);
  const [invite, setInvite] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("w");
  const [tc, setTc] = useState(300);
  const [increment, setIncrement] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("Connecting…");
  const [copied, setCopied] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [view, setView] = useState(null);
  const lock = useRef(false);
  const revision = useRef(0);
  useEffect(() => { setName(account?.user?.name || ""); }, [account?.user?.name]);

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
    window.history.replaceState(null, "", `?room=${value.id}`);
  };
  const request = async (url, token, action) => {
    const response = await fetch(url, { method: action ? "POST" : "GET", cache: "no-store",
      signal: AbortSignal.timeout(10000),
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
    let failures = 0;
    const poll = async () => {
      const started = Date.now();
      let finished = false;
      if (!lock.current) {
        const version = revision.current;
        try {
          const data = await request(`/api/rooms/${session.id}`, session.token);
          if (!cancelled && !lock.current && version === revision.current) {
            if (data.rematchSession) { saveSession(data.rematchSession); setRoom(null); setView(null); return; }
            setRoom((previous) => ({ ...data, moves: previous && JSON.stringify(previous.moves) === JSON.stringify(data.moves) ? previous.moves : data.moves })); setError(""); setConnection("Connected"); failures = 0; finished = false;
          }
        } catch (e) {
          if (!cancelled && version === revision.current) {
            if ([403, 404, 410].includes(e.status)) {
              try { sessionStorage.removeItem("gambit:room"); } catch { /* Storage unavailable. */ }
              setSession(null); setRoom(null); setView(null);
              setError(`${e.message} Create a new invite below.`);
              return;
            }
            failures++; setConnection("Connection interrupted. Reconnecting… Your game is saved."); setError(e.message);
          }
        }
      }
      // Schedule from request start; avoid adding a full delay after network latency.
      if (!cancelled && !finished) timer = setTimeout(poll, Math.max(100, (failures ? Math.min(10000, 1000 * 2 ** failures) : document.hidden ? 5000 : 1000) - (Date.now() - started)));
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
        const data = await request("/api/rooms", null, { name, color, tc, increment });
        setRoom(data);
        saveSession({ id: data.id, token: data.token });
      }
    } catch (e) { setError(e.message); }
    finally { lock.current = false; setBusy(false); }
  };
  const act = async (action) => {
    if (lock.current) return;
    revision.current += 1;
    lock.current = true; setBusy(true); setError("");
    const previous = room;
    if (action.type === "move") {
      // Show a legal move immediately while the server confirms it.
      const optimistic = buildGame(undefined, room.moves);
      try {
        const move = optimistic.move({ from: action.from, to: action.to, promotion: action.promotion || "q" });
        setRoom({ ...room, moves: [...room.moves, { from: move.from, to: move.to, san: move.san, ...(move.promotion ? { promotion: move.promotion } : {}) }] });
        setView(null);
      } catch { lock.current = false; setBusy(false); return; }
    }
    try {
      const data = await request(`/api/rooms/${session.id}`, session.token, action);
      if (data.rematchSession) { saveSession(data.rematchSession); setRoom(null); }
      else setRoom((current) => ({ ...data, moves: current && JSON.stringify(current.moves) === JSON.stringify(data.moves) ? current.moves : data.moves }));
      setView(null);
    }
    catch (e) { setRoom(previous); setError(e.message); }
    finally { lock.current = false; setBusy(false); }
  };
  const reset = () => {
    if (room?.joined && !room.result && !window.confirm("Leave this game? You can return by reloading before creating another game.")) return;
    try { sessionStorage.removeItem("gambit:room"); } catch { /* Storage unavailable. */ }
    setSession(null); setRoom(null); setInvite(null); setView(null); setError(""); setFlipped(false); setCopied(false);
    window.history.replaceState(null, "", window.location.pathname);
  };

  const moves = useMemo(() => room?.moves || [], [room?.moves]);
  const ply = view === null ? moves.length : Math.min(view, moves.length);
  const game = useMemo(() => buildGame(undefined, moves), [moves]);
  const shown = useMemo(() => ply === moves.length ? game : buildGame(undefined, moves, ply), [game, moves, ply]);
  const orient = flipped ? (room?.color === "w" ? "b" : "w") : room?.color || "w";
  const top = orient === "w" ? "b" : "w";
  const info = capturedInfo(shown);
  const active = room?.joined && !room.result;
  useEffect(() => {
    if (!premove || premove.roomId !== room?.id || !active || busy || lock.current || game.turn() !== room.color) return;
    setPremove(null);
    try { const position = buildGame(undefined, moves); position.move({ from: premove.from, to: premove.to, promotion: premove.promotion }); }
    catch { return; }
    act({ type: "move", from: premove.from, to: premove.to, promotion: premove.promotion, ply: moves.length });
  }, [premove, room?.id, active, busy, moves]); // eslint-disable-line react-hooks/exhaustive-deps
  const player = (side) => ({ name: room?.names[side] || "Waiting for a friend", avatar: side.toUpperCase(),
    captured: info.lostBy[side === "w" ? "b" : "w"], diff: side === "w" ? info.diff : -info.diff,
    showClock: !!room?.tc, clock: room?.clocks[side] || 0, running: active && game.turn() === side, low: room?.clocks[side] < 20000 });
  const link = room?.invite ? `${window.location.origin}${window.location.pathname}?room=${room.id}#invite=${room.invite}` : "";

  return <main className="layout friends-layout match-layout">
    <section className="stage" aria-label="Online chess board">
      <PlayerBar {...player(top)} />
      <Board game={room ? shown : new Chess()} orient={orient} lastMove={moves[ply - 1]} myColor={room?.color}
        winner={room?.result && ply === moves.length ? room.winner : null}
        arrows={room?.result && reviewSelection?.roomId === room.id && ply === reviewSelection.entry.ply - 1 ? reviewArrows(reviewSelection.entry, shown.fen()) : []}
        canMove={!!active && !busy && ply === moves.length && game.turn() === room.color}
        canPremove={!!active && !busy && ply === moves.length && game.turn() !== room.color}
        premove={active && premove?.roomId === room.id ? premove : null}
        onPremove={(from, to, promotion) => setPremove({ from, to, promotion, roomId: room.id })}
        onMove={(from, to, promotion) => act({ type: "move", from, to, promotion, ply: moves.length })} />
      <PlayerBar {...player(orient)} />
      {active && premove?.roomId === room.id && <button className="btn" onClick={() => setPremove(null)}>Cancel premove · {premove.from}–{premove.to}</button>}
      <p className="board-note">{room ? `You play ${room.color === "w" ? "white" : "black"}. Games expire after 24 hours.` : "A board for you. A link for your friend."}</p>
    </section>
    <MatchPanel>
      {room?.result && account?.user && <p role="status">{room.historySaved === false ? "Game history could not be saved. Reload to retry before this room expires." : "Game saved to your account history."}</p>}
      <div className={`card friend-game-card ${!session ? "play-setup friend-setup" : ""}`}>
          <span className="eyebrow">PLAY TOGETHER</span>
          {session && <p role="status" className="sub">{connection}</p>}
          {session && room && !room.dailyDays && <details><summary>Share a spectator board</summary><p>Anyone with this link can watch both players’ names and moves. They cannot play.</p><button className="btn" disabled={busy} onClick={() => act({ type: "watchLink", enabled: !room.watchToken })}>{room.watchToken ? "Disable spectator link" : "Enable spectator link"}</button>{room.watchToken && <label className="field-label">Spectator link<input className="text-input" readOnly value={`${typeof window !== "undefined" ? window.location.origin : ""}/watch/${room.id}#key=${room.watchToken}`} onFocus={(event) => event.target.select()} /></label>}</details>}
          {room?.dailyDays && <p className="sub">Daily chess · {room.dailyDays} days per move · Next move due {new Date(room.moveDeadline).toLocaleString()}</p>}
        <h2>{session ? room?.result?.title || (room?.joined ? (game.turn() === room.color ? "Your move" : "Your friend’s move") : "Waiting for your friend") : invite ? "You’re invited" : "Chess is better with friends"}</h2>
        <p className="sub">{room?.result?.detail || (session ? (game.isCheck() && active ? "Check. Protect your king." : "Live moves, your own clock, and a little friendly competition.") : "Invite a friend and play from separate devices. No account needed.")}</p>
        {!session && <div className="friend-setup-fields">
          <label className="field-label" htmlFor="friend-name">Your name</label>
          <input id="friend-name" className="text-input" maxLength={30} value={name} readOnly={Boolean(account?.user)} placeholder="Enter your name" onChange={(e) => setName(e.target.value)} />
          {!invite && <>
            <fieldset className="setup-field"><legend>Your pieces</legend><div className="seg setup-colors">{[["w", "White"], ["r", "Random"], ["b", "Black"]].map(([value, label]) => <button key={value} aria-pressed={color === value} onClick={() => setColor(value)}>{label}</button>)}</div></fieldset>
            <fieldset className="setup-field"><legend>Time per player</legend><div className="seg setup-clocks">{TIMES.map((time) => <button key={time.s} aria-pressed={tc === time.s} onClick={() => setTc(time.s)}>{time.label}</button>)}</div></fieldset>
            <label className="field-label setup-increment">Increment<select disabled={!tc} value={tc ? increment : 0} onChange={(event) => setIncrement(Number(event.target.value))}><option value={0}>None</option><option value={2}>+2 seconds per move</option><option value={5}>+5 seconds per move</option></select></label>
          </>}
          <button className="btn primary start" disabled={busy} onClick={enter}>{busy ? "Connecting…" : invite ? "Join game" : "Create invite link"}</button>
        </div>}
        {session && !room && <p className="sub">Connecting to your game…</p>}
        {link && !room.joined && <div className="invite-box">
          <label className="field-label" htmlFor="invite-link">Send this link to your friend</label>
          <input id="invite-link" className="text-input" value={link} readOnly onFocus={(e) => e.target.select()} />
          <button className="btn primary start" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setError("Select the link above and copy it manually."); } }}>{copied ? "Link copied ✓" : "Copy invite link"}</button>
          <p className="sub">The clock starts when your friend joins.</p>
        </div>}
        {error && <p className="msg bad" role="status">{error}</p>}
      </div>
      {!session && !invite && <OnlineMatchmaking onMatch={(matched) => { setRoom(null); saveSession(matched); }} disabled={busy} />}
      {room && <div className="card">
        {account?.user && <a className="report-game-link" href={`/report?type=game&target=${room.id}`}>Report a game issue</a>}
        {room.result && <GameExport game={{ moves, names: room.names, color: room.color, tc: room.tc, increment: room.increment, result: room.result, outcome: room.result.title === "Draw" ? "draw" : room.winner === room.color ? "win" : "loss" }} fen={shown.fen()} />}
        <p className="sub">{room.rated ? "Rated online game" : "Unrated friend game"} · {room.tc ? `${room.tc / 60}+${room.increment || 0}` : "Unlimited"}</p>
        {active && <div className="row"><button className="btn" disabled={busy || room.drawOffer === room.color} onClick={() => act({ type: "offerDraw" })}>{room.drawOffer === room.color ? "Draw offered" : "Offer draw"}</button>
          {room.drawOffer && room.drawOffer !== room.color && <><button className="btn" disabled={busy} onClick={() => act({ type: "acceptDraw" })}>Accept draw</button><button className="btn" disabled={busy} onClick={() => act({ type: "declineDraw" })}>Decline draw</button></>}
        </div>}
        {room.result && <div className="row"><button className="btn primary" disabled={busy || room.rematchOffered} onClick={() => act({ type: "rematch" })}>{room.rematchOffered ? "Waiting for rematch…" : room.rematchRequested ? "Accept rematch" : "Request rematch"}</button><small>Rematches are unrated.</small></div>}
        <p className="move-time-heading">Move history <span>Time per move</span></p>
        <MoveList moves={moves} view={ply} onGoto={setView} />
        <Nav view={ply} total={moves.length} onGoto={(value) => setView(value === moves.length ? null : value)} />
        <div className="row first"><button className="btn" onClick={() => setFlipped(!flipped)}>Flip board</button>{active && <button className="btn danger" disabled={busy} onClick={() => { if (window.confirm("Resign this game?")) act({ type: "resign" }); }}>Resign</button>}</div>
      </div>}
      {room?.result && <GameReview key={room.id} result={room.result} moves={moves} color={room.color} visible={visible} onGoto={setView}
        outcome={room.result.title === "Draw" ? "draw" : room.winner === room.color ? "win" : "loss"}
        rated={room.rated} gameId={room.id} onNewGame={reset} onRematch={() => act({ type: "rematch" })} rematchPending={room.rematchOffered} actionsBusy={busy} clockLabel={room.tc ? `${room.tc / 60} + ${room.increment || 0}` : "game"}
        selectedPly={reviewSelection?.roomId === room.id && ply === reviewSelection.entry.ply - 1 ? reviewSelection.entry.ply : null}
        onSelect={(entry) => setReviewSelection(entry ? { roomId: room.id, entry } : null)} />}
      {session && <button className="btn" onClick={reset}>Create another game</button>}
      {!session && <div className="card friend-tip"><span className="eyebrow">HOW IT WORKS</span><p>Create a game, send the invite, and make your first move. Keep this tab open or reload to reconnect.</p></div>}
    </MatchPanel>
    <MatchPromotion />
  </main>;
}
