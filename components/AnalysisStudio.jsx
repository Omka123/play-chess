"use client";
import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "./Board";
import { StockfishReview, uciMove } from "@/lib/stockfish";
import { formatReviewScore, reviewLine } from "@/lib/reviewFeedback";
import SavedStudies from "./SavedStudies";
import { importStudy } from "@/lib/studies";
import PositionExplorer from "./PositionExplorer";
import AnalysisCandidates from "./AnalysisCandidates";

export default function AnalysisStudio() {
  const [source, setSource] = useState(""), [game, setGame] = useState(() => new Chess()), [fens, setFens] = useState([new Chess().fen()]), [ply, setPly] = useState(0), [message, setMessage] = useState(""), [analysis, setAnalysis] = useState(null), [busy, setBusy] = useState(false), [orient, setOrient] = useState("w");
  const engine = useRef(null), version = useRef(0);
  useEffect(() => () => { version.current++; engine.current?.terminate(); }, []);
  function position(next) { version.current++; engine.current?.terminate(); engine.current = null; setBusy(false); setAnalysis(null); setGame(next); }
  function load() { try { const { game: next, fens: list, moveCount } = importStudy(source); setFens(list); setPly(list.length - 1); position(next); setMessage(`Loaded ${moveCount} moves. You can explore a variation on the board.`); } catch { setMessage("Could not read this PGN or FEN. Check the notation and try again."); } }
  async function analyze() { if (busy) return; setBusy(true); setMessage(""); const current = version.current; try { engine.current ||= new StockfishReview(); const value = await engine.current.analyze(game.fen(), { lines: 3 }); if (current === version.current) setAnalysis(value); } catch (error) { if (current === version.current) setMessage(error.message); } finally { if (current === version.current) setBusy(false); } }
  const savedStudies = <SavedStudies fens={fens} onLoad={(values) => { setFens(values); setPly(values.length - 1); position(new Chess(values.at(-1))); setMessage("Private study loaded."); }} />;
  const explorer = <PositionExplorer fen={game.fen()} onMove={move} />;
  function move(from, to, promotion) { const next = new Chess(game.fen()); try { next.move({ from, to, promotion: promotion || "q" }); } catch { return; } const list = [...fens.slice(0, ply + 1), next.fen()]; setFens(list); setPly(list.length - 1); position(next); }
  function go(index) { setPly(index); position(new Chess(fens[index])); }
  return <><h1>Analysis studio</h1><p>Import a completed game or position, explore variations, and ask Stockfish for a suggested move. Use this for study after a game.</p><div className="training-layout"><section><Board game={game} orient={orient} canMove={!busy && !game.isGameOver()} myColor={game.turn()} onMove={move} arrows={analysis?.best ? [{ ...uciMove(analysis.best), kind: "best", label: "Suggested move", badge: "★" }] : []} /><div className="row"><button className="btn" disabled={!ply} onClick={() => go(ply - 1)}>Previous</button><span>Position {ply} / {fens.length - 1}</span><button className="btn" disabled={ply === fens.length - 1} onClick={() => go(ply + 1)}>Next</button><button className="btn" onClick={() => setOrient(orient === "w" ? "b" : "w")}>Flip board</button></div><p><button className="btn primary" disabled={busy} onClick={analyze}>{busy ? "Analysing…" : "Analyse position"}</button></p>{analysis && <div className="card"><p>Evaluation: {formatReviewScore(analysis.score * (game.turn() === "w" ? 1 : -1))} · Depth {analysis.depth}</p><p>Suggested line: {reviewLine(game.fen(), analysis.pv).join(" ") || "Game over"}</p></div>}<p role="status">{message}</p></section><section className="card"><h2>Load a game or position</h2><label className="field-label">PGN or FEN<textarea className="text-input" rows={10} value={source} maxLength={100000} onChange={(event) => setSource(event.target.value)} /></label><button className="btn primary" onClick={load} disabled={!source.trim()}>Load notation</button><label className="field-label">Or choose a PGN file<input type="file" accept=".pgn,.txt" onChange={async (event) => { const file = event.target.files?.[0]; if (file?.size > 100000) { setMessage("Choose a file smaller than 100 KB."); return; } if (file) setSource(await file.text()); }} /></label><h3>Current FEN</h3><textarea className="text-input" readOnly value={game.fen()} rows={3} /><p>Importing keeps your data in this page. It does not change your rated game history.</p><button className="btn" onClick={() => { const next = new Chess(); setFens([next.fen()]); setPly(0); position(next); setMessage(""); }}>Reset board</button></section></div><AnalysisCandidates fen={game.fen()} analysis={analysis} onMove={move} />{explorer}{savedStudies}</>;
}
