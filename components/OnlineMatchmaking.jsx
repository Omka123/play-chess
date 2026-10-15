"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import ColorIcon from "./ColorIcon";

export default function OnlineMatchmaking({ onMatch, disabled }) {
  const { data: account } = useSession();
  const [searching, setSearching] = useState(false);
  const [tc, setTc] = useState(300);
  const [increment, setIncrement] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const callback = useRef(onMatch); callback.current = onMatch;
  const request = async (type) => {
    const response = await fetch("/api/matchmaking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, tc, increment }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  };
  useEffect(() => {
    if (!searching) return;
    let cancelled = false, timer;
    const poll = async () => {
      try {
        const data = await request("join");
        if (cancelled) return;
        if (data.session) { setSearching(false); callback.current(data.session); return; }
        setError("");
      } catch (error) { if (!cancelled) setError(error.message); }
      if (!cancelled) timer = setTimeout(poll, 2000);
    };
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searching, tc, increment]);
  return <div className="card online-matchmaking"><span className="eyebrow">FIND YOUR OPPONENT</span><h2><ColorIcon name="friends" />Play online</h2><p className="sub">Rated bullet, blitz and rapid. Matches pair available players using the same clock, preferring nearby ratings.</p>
    {!account?.user ? <Link className="btn primary" href="/login">Sign in to play online</Link> : <>
      <div className="seg">{[[60, "1 min"], [180, "3 min"], [300, "5 min"], [600, "10 min"]].map(([value, label]) => <button key={value} disabled={searching} aria-pressed={tc === value} onClick={() => setTc(value)}>{label}</button>)}</div>
      <label className="field-label">Increment <select disabled={searching} value={increment} onChange={(event) => setIncrement(Number(event.target.value))}><option value={0}>None</option><option value={2}>+2 seconds</option><option value={5}>+5 seconds</option></select></label>
      {searching ? <><p role="status">Looking for an opponent… Keep this page open.</p><button className="btn" disabled={busy} onClick={async () => {
        setBusy(true);
        try { const data = await request("cancel"); setSearching(false); if (data.session) callback.current(data.session); }
        catch (error) { setError(error.message); } finally { setBusy(false); }
      }}>Cancel search</button></> : <button className="btn primary start" disabled={disabled} onClick={() => { setError(""); setSearching(true); }}>Find a game / resume</button>}
      {error && <p role="alert">{error}</p>}
    </>}
  </div>;
}
