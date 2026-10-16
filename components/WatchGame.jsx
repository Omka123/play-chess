"use client";
import { useEffect, useMemo, useState } from "react";
import Board from "./Board";
import { buildGame } from "@/lib/chessUtil";
export default function WatchGame({ id }) {
  const [data, setData] = useState(null), [error, setError] = useState("");
  useEffect(() => { let stopped = false, timer; const token = new URLSearchParams(window.location.hash.slice(1)).get("key");
    async function poll() { try { const response = await fetch(`/api/watch/${id}`, { cache: "no-store", headers: { Authorization: `Bearer ${token || ""}` }, signal: AbortSignal.timeout(10000) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); if (!stopped) { setData(result); setError(""); } } catch (error) { if (!stopped) setError(error.message); } if (!stopped) timer = setTimeout(poll, 3000); }
    poll(); return () => { stopped = true; clearTimeout(timer); };
  }, [id]);
  const game = useMemo(() => buildGame(undefined, data?.moves || []), [data]);
  return <><h1>Watch live chess</h1>{error && <p role="alert">{error}</p>}{data ? <><h2>{data.names.w || "White"} vs {data.names.b || "Black"}</h2><p>{data.result ? `${data.result.title} · ${data.result.detail}` : `${game.turn() === "w" ? "White" : "Black"} to move · Spectator view updates every three seconds`}</p><div className="lesson-board"><Board game={game} orient="w" canMove={false} lastMove={data.moves.at(-1)} winner={data.winner} /></div></> : <p>Opening the spectator board… The player must enable the full spectator link first.</p>}</>;
}
