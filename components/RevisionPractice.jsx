"use client";
import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "./Board";
import { StockfishReview, uciMove } from "@/lib/stockfish";
function PositionPractice({ entry, act, refresh }) {
  const [game, setGame] = useState(() => new Chess(entry.fen)), [ply, setPly] = useState(0), [plan, setPlan] = useState(""), [message, setMessage] = useState("Choose the improvement without an arrow, then play the position out against Stockfish."), [busy, setBusy] = useState(false);
  const engine = useRef(null);
  useEffect(() => { if (!ply || game.turn() === entry.color || game.isGameOver() || ply >= 12) return; let cancelled = false; setBusy(true);
    async function reply() { try { engine.current ||= new StockfishReview(); const analysis = await engine.current.analyze(game.fen()); if (!cancelled && analysis.best) { const next = new Chess(game.fen()); next.move(uciMove(analysis.best)); setGame(next); setPly((value) => value + 1); } } catch (error) { if (!cancelled) setMessage(error.message); } finally { if (!cancelled) setBusy(false); } }
    const timer = setTimeout(reply, 700); return () => { cancelled = true; clearTimeout(timer); engine.current?.terminate(); engine.current = null; };
  }, [game, ply]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => engine.current?.terminate(), []);
  async function play(from, to, promotion) {
    const next = new Chess(game.fen()); let move; try { move = next.move({ from, to, promotion: promotion || "q" }); } catch { return; }
    if (!ply) {
      setBusy(true); try { const result = await act({ type: "revise", id: entry.id, move: { from, to, promotion }, plan });
        if (!result.correct) { setMessage("That is legal, but compare it with the saved improvement. Check threats and king safety, then try again."); return; }
        setMessage(`Improvement found: ${move.san}. Next revision ${new Date(result.dueAt).toLocaleDateString()}. Now practise the continuation.`); setGame(next); setPly(1); await refresh();
      } catch (error) { setMessage(error.message); } finally { setBusy(false); }
    } else { setGame(next); setPly(ply + 1); }
  }
  return <div className="training-layout"><section><Board game={game} orient={entry.color} myColor={entry.color} canMove={!busy && game.turn() === entry.color && !game.isGameOver() && ply < 12} onMove={play} /><p role="status">{message}</p>{(game.isGameOver() || ply >= 12) && <p>Practice complete. Review the resulting position in Analysis if you want to explore further.</p>}<button className="btn" onClick={() => { engine.current?.terminate(); engine.current = null; setGame(new Chess(entry.fen)); setPly(0); setBusy(false); }}>Restart position</button></section><section className="card"><h3>Explain your choice</h3><label className="field-label">What are you trying to achieve?<textarea className="text-input" value={plan} maxLength={500} onChange={(event) => setPlan(event.target.value)} /></label><p>Before moving, name the threat, your opponent’s strongest reply, and any loose pieces. Your intention is saved with this practice attempt.</p><details><summary>Show the saved improvement</summary><p>{entry.best}</p></details><p>Revision level: {entry.stage || 0}/3. Reviews are scheduled after 1 day, 7 days and 30 days. Extra practice does not fast-forward the schedule.</p></section></div>;
}
export default function RevisionPractice({ profile, act, refresh }) {
  const [selected, setSelected] = useState(null), [dueOnly, setDueOnly] = useState(true);
  const mistakes = (profile?.mistakes || []).filter((entry) => entry.id === selected || !dueOnly || !entry.dueAt || entry.dueAt <= Date.now());
  const entry = mistakes.find((entry) => entry.id === selected) || mistakes[0];
  useEffect(() => { if (entry && !selected) setSelected(entry.id); }, [entry?.id, selected]);
  return <section><h2>Personal mistake revision</h2><p>Save mistakes from Game Review to build a spaced practice collection.</p><label><input type="checkbox" checked={dueOnly} onChange={(event) => setDueOnly(event.target.checked)} />Show positions due now</label>{!entry ? <p>No positions due. Save a mistake from a finished game or turn off the due filter for extra practice.</p> : <><label className="field-label">Position<select value={entry.id} onChange={(event) => setSelected(event.target.value)}>{mistakes.map((entry, index) => <option key={entry.id} value={entry.id}>{index + 1}. {entry.best} · {entry.dueAt ? new Date(entry.dueAt).toLocaleDateString() : "New"}</option>)}</select></label><PositionPractice key={entry.id} entry={entry} act={act} refresh={refresh} /></>}</section>;
}
