"use client";
import { useMemo, useState } from "react";
import { buildGame } from "@/lib/chessUtil";
import Board from "./Board";
import { Nav } from "./PlayPanel";
import GameExport from "./GameExport";
export default function SharedReplay({ game }) {
  const [view, setView] = useState(game.moves.length);
  const shown = useMemo(() => buildGame(undefined, game.moves, view), [game, view]);
  return <><h1>{game.names.w} vs {game.names.b}</h1><p>{game.result.title} · {game.result.detail}</p>
    <div className="history-board"><Board game={shown} orient="w" lastMove={game.moves[view - 1]} canMove={false} winner={view === game.moves.length && game.outcome !== "draw" ? game.outcome === "win" ? game.color : game.color === "w" ? "b" : "w" : null} /></div>
    <Nav view={view} total={game.moves.length} onGoto={setView} />
    <div className="friend-moves">{game.moves.map((move, index) => <button className="btn" key={index} onClick={() => setView(index + 1)}>{index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ""}{move.san}</button>)}</div>
    <GameExport game={game} fen={shown.fen()} />
  </>;
}
