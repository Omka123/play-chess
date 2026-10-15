"use client";
import { useState } from "react";
import { gamePgn } from "@/lib/gameExport";
export default function GameExport({ game, fen, shareable = false }) {
  const [notice, setNotice] = useState("");
  const [share, setShare] = useState("");
  const [busy, setBusy] = useState(false);
  return <div className="game-export"><div className="row">
    <button className="btn" onClick={() => {
      try {
        const url = URL.createObjectURL(new Blob([gamePgn(game)], { type: "application/x-chess-pgn;charset=utf-8" }));
        const link = document.createElement("a"); link.href = url; link.download = "chessnexa-game.pgn"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice("PGN downloaded.");
      } catch { setNotice("Could not export this game."); }
    }}>Download PGN</button>
    <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(fen); setNotice("Position FEN copied."); } catch { setNotice(`Copy this FEN: ${fen}`); } }}>Copy FEN</button>
    {shareable && <button className="btn" disabled={busy} onClick={async () => {
      setBusy(true);
      try {
        const response = await fetch("/api/history/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: game.id }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        const url = `${window.location.origin}/game/${data.id}`;
        setShare(url); setNotice("Anyone with this link can view the names, result and moves.");
        try { await navigator.clipboard.writeText(url); } catch { /* The visible link can be copied manually. */ }
      } catch (error) { setNotice(error.message); }
      finally { setBusy(false); }
    }}>Share replay</button>}
  </div>{share && <input className="text-input" aria-label="Shared game replay link" value={share} readOnly onFocus={(event) => event.target.select()} />}{notice && <p className="sub" role="status">{notice}</p>}</div>;
}
