"use client";
import { useMemo, useState } from "react";
import Board from "./Board";
import { Nav, MoveList } from "./PlayPanel";
import { buildGame } from "@/lib/chessUtil";
import GameReview from "./GameReview";
import { reviewArrows } from "@/lib/reviewArrows";
import GameExport from "./GameExport";
import ColorIcon from "./ColorIcon";
import { filterGames, colorStats, openingName } from "@/lib/gameInsights";

export default function GameHistory({ games }) {
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState(0);
  const [entry, setEntry] = useState(null);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState({ outcome: "all", color: "all", query: "", after: "", before: "" });
  function change(key, value) { setSearch((previous) => ({ ...previous, [key]: value })); setPage(0); }
  const shown = useMemo(() => buildGame(undefined, selected?.moves || [], view), [selected, view]);
  const filtered = filterGames(games, { ...search, mode: filter });
  const wins = games.filter((game) => game.outcome === "win").length;
  const losses = games.filter((game) => game.outcome === "loss").length;
  return <section className="game-history"><h2><ColorIcon name="history" />Game history</h2>
    <p>{games.length} games · {wins} wins · {losses} losses · {games.length - wins - losses} draws</p>
    <p className="sub">Online matchmaking games are rated. Bot and direct friend games are unrated.</p>
    <div className="rating-cards">{["w", "b"].map((color) => { const stats = colorStats(games, color); return <div className="card" key={color}><span>As {color === "w" ? "White" : "Black"}</span><strong>{stats.winRate}% wins</strong><small>{stats.wins} wins in {stats.total} games</small></div>; })}</div>
    <div className="hub-form history-filters"><label>Opponent or opening<input placeholder="Search games" value={search.query} onChange={(event) => change("query", event.target.value)} /></label><label>Result<select value={search.outcome} onChange={(event) => change("outcome", event.target.value)}>{["all", "win", "loss", "draw"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Your colour<select value={search.color} onChange={(event) => change("color", event.target.value)}><option value="all">Both</option><option value="w">White</option><option value="b">Black</option></select></label><label>From (UTC)<input type="date" value={search.after} onChange={(event) => change("after", event.target.value)} /></label><label>Through (UTC)<input type="date" value={search.before} onChange={(event) => change("before", event.target.value)} /></label></div>
    <label>Show games <select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(0); }}><option value="all">All games</option><option value="friend">Friends</option><option value="bot">Computer</option></select></label>
    {!filtered.length ? <p>{games.length ? "No games match these filters." : "No saved games yet. Finish a game while signed in to see it here."}</p> : <div className="history-table-wrap"><table className="history-table"><thead><tr><th>Opponent</th><th>Result</th><th>Type / clock</th><th>Moves</th><th>Date</th><th>Replay</th></tr></thead><tbody>
      {filtered.slice(page * 20, (page + 1) * 20).map((game) => <tr key={game.id}><td>{game.names[game.color === "w" ? "b" : "w"]}<small>You played {game.color === "w" ? "White" : "Black"}</small></td><td className={`history-${game.outcome}`}>{game.outcome}<small>{game.result.detail}</small></td><td>{game.mode === "bot" ? "Computer" : "Friend"}<small>{game.tc ? `${game.tc / 60} min` : "Unlimited"}</small></td><td>{Math.ceil(game.moves.length / 2)}</td><td>{new Date(game.finishedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</td><td><button className="btn" onClick={() => { setSelected(game); setView(game.moves.length); setEntry(null); }}>Replay</button></td></tr>)}
    </tbody></table></div>}
    {filtered.length > 20 && <div className="row"><button className="btn" disabled={!page} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1}</span><button className="btn" disabled={(page + 1) * 20 >= filtered.length} onClick={() => setPage(page + 1)}>Next</button></div>}
    {selected && <div className="history-replay"><h3>{selected.names.w} vs {selected.names.b}</h3><p>{selected.result.title} · {selected.result.detail}</p><p>{openingName(selected.moves)}{selected.rating ? ` · ${selected.rating.category}: ${selected.rating.before} → ${selected.rating.after} (${selected.rating.change >= 0 ? "+" : ""}${selected.rating.change})` : " · Unrated"}</p>
      <div className="history-board"><Board game={shown} orient={selected.color} lastMove={selected.moves[view - 1]} canMove={false} winner={view === selected.moves.length && selected.outcome !== "draw" ? selected.outcome === "win" ? selected.color : selected.color === "w" ? "b" : "w" : null} arrows={entry?.ply - 1 === view ? reviewArrows(entry, shown.fen()) : []} /></div>
      <Nav view={view} total={selected.moves.length} onGoto={setView} />
      <GameExport game={selected} fen={shown.fen()} shareable />
      <p className="move-time-heading">Moves <span>Time per move</span></p>
      <MoveList moves={selected.moves} view={view} onGoto={setView} />
      <GameReview key={selected.id} result={selected.result} moves={selected.moves} color={selected.color} outcome={selected.outcome} visible={false} onGoto={setView} onSelect={setEntry} selectedPly={entry?.ply - 1 === view ? entry.ply : null} />
      <button className="btn" onClick={() => setSelected(null)}>Close replay</button>
    </div>}
  </section>;
}
