"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SaveBotGame({ play, userId }) {
  const [status, setStatus] = useState("saving");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!play.historyUserId || play.historyUserId !== userId) return;
    let cancelled = false;
    setStatus("saving");
    const reason = play.result.detail.includes("resigned") ? "resign" : play.result.detail.includes("time") ? "timeout" : "board";
    fetch("/api/history", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: play.historyId, botId: play.botId, color: play.human, moves: play.moves, tc: play.tc, increment: play.increment || 0, reason }),
    }).then((response) => { if (!response.ok) throw new Error(); if (!cancelled) setStatus("saved"); })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [play.historyId, userId, attempt]); // Finished game data does not change when replaying moves.
  if (!play.historyUserId) return <p className="sub">Sign in before starting your next game to save it to your history.</p>;
  if (play.historyUserId !== userId) return <p role="status">Sign in with the account that started this game to save it.</p>;
  return <div className="card" role="status">{status === "saved" ? <Link href="/account" prefetch={false}>Saved to your game history</Link> : status === "saving" ? "Saving game…" : <><p>Could not save this game.</p><button className="btn" onClick={() => setAttempt(attempt + 1)}>Retry saving</button></>}</div>;
}
