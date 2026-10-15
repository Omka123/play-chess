"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { PUZZLES } from "@/lib/puzzles";
export default function PuzzleProgress({ puzzle, onPick, onProgress }) {
  const { data: account } = useSession();
  const [streak, setStreak] = useState(0);
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const callback = useRef(onProgress); callback.current = onProgress;
  const day = new Date().toISOString().slice(0, 10);
  const daily = Math.floor(Date.now() / 86400000) % PUZZLES.length;
  useEffect(() => {
    if (!account?.user?.id) { setStreak(0); return; }
    let cancelled = false;
    fetch("/api/puzzles", { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error(); return response.json(); }).then((data) => {
      if (!cancelled) { callback.current(data.solved); setStreak(data.streak); setNotice("Account puzzle progress loaded."); }
    }).catch(() => { if (!cancelled) setNotice("Could not load account puzzle progress. Your local progress is still available."); });
    return () => { cancelled = true; };
  }, [account?.user?.id, retry]);
  useEffect(() => {
    if (!account?.user?.id || !puzzle.solved || !puzzle.moves.length) return;
    let cancelled = false;
    fetch("/api/puzzles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ puzzleId: puzzle.idx, move: puzzle.moves[0], day }) })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => { if (!cancelled) { callback.current(data.solved); setStreak(data.streak); setNotice("Puzzle saved to your account."); } })
      .catch(() => { if (!cancelled) setNotice("Could not save puzzle progress. Retry while this puzzle is open."); });
    return () => { cancelled = true; };
  }, [account?.user?.id, puzzle.idx, puzzle.solved, retry, day]);
  return <div className="puzzle-progress"><button className="btn primary" onClick={() => onPick(daily)}>Daily puzzle · {day}</button><p className="sub">{account?.user ? `${streak} day streak · Progress saved to your account` : "Sign in to save your puzzle progress and daily streak."}</p>
    {notice && <p className="sub" role="status">{notice}</p>}{notice.startsWith("Could not") && <button className="btn" onClick={() => setRetry(retry + 1)}>Retry sync</button>}
  </div>;
}
