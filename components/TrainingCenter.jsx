"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import Board from "./Board";
import { PUZZLES, matingMoves } from "@/lib/puzzles";
import { LESSONS } from "@/lib/lessons";
import ReviewPractice from "./ReviewPractice";

export default function TrainingCenter() {
  const [index, setIndex] = useState(0), [game, setGame] = useState(() => new Chess(PUZZLES[0].fen));
  const [message, setMessage] = useState(""), [hint, setHint] = useState(null), [hinted, setHinted] = useState(false), [done, setDone] = useState(false), [busy, setBusy] = useState(false), [profile, setProfile] = useState(null), [battleId, setBattleId] = useState(null), [last, setLast] = useState(null);
  useEffect(() => { setBattleId(new URLSearchParams(window.location.search).get("battle")); fetch("/api/platform").then((r) => r.ok ? r.json() : null).then((value) => setProfile(value?.profile || null)).catch(() => {}); }, []);
  const puzzle = PUZZLES[index];
  const [practiceIndex, setPracticeIndex] = useState(0);
  const personal = profile?.mistakes || [];
  function choose(value) { setIndex(value); setGame(new Chess(PUZZLES[value].fen)); setMessage(""); setHint(null); setHinted(false); setDone(false); setLast(null); }
  async function move(from, to, promotion) {
    if (busy || done) return; const next = new Chess(puzzle.fen); let played;
    try { played = next.move({ from, to, promotion: promotion || "q" }); } catch { return; }
    const correct = next.isCheckmate(); setMessage(correct ? "Checkmate! Well found." : "That move misses checkmate. Try again.");
    if (correct) { setGame(next); setLast(played); setDone(true); }
    if (profile) { setBusy(true); try { const response = await fetch("/api/platform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "puzzleAnswer", index, move: { from, to, promotion: promotion || "q" }, hinted, battleId }) }); const value = await response.json(); if (!response.ok) throw new Error(value.error); setProfile((p) => ({ ...p, puzzleRating: value.rating })); } catch (error) { setMessage(`${correct ? "Solved. " : ""}Progress could not be saved: ${error.message}`); } finally { setBusy(false); } }
  }
  async function complete(slug) { try { const response = await fetch("/api/platform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "lessonComplete", slug }) }); const value = await response.json(); if (!response.ok) throw new Error(value.error); setProfile((p) => ({ ...p, lessons: { ...p?.lessons, [slug]: Date.now() } })); setMessage("Lesson completion saved."); } catch (error) { setMessage(error.message); } }
  return <><h1>Train your next move</h1><p>Practise mating patterns and build your skills with guided lessons. {profile ? `Your puzzle rating: ${profile.puzzleRating ?? 200}. Only your first unhinted attempt changes it.` : "Sign in to save progress and earn a puzzle rating."}</p>{battleId && <p className="card">Puzzle battle active. <Link href="/hub">View scores and remaining time in your hub</Link>.</p>}
    <section className="card"><h2>Practise your mistakes</h2>{personal.length ? <><label>Saved position<select value={practiceIndex} onChange={(event) => setPracticeIndex(Number(event.target.value))}>{personal.map((entry, i) => <option key={entry.id} value={i}>Position {i + 1} · {new Date(entry.at).toLocaleDateString()}</option>)}</select></label><div className="lesson-board"><ReviewPractice key={personal[practiceIndex]?.id || personal[0].id} entry={personal[practiceIndex] || personal[0]} /></div></> : <p>After a game, open Game Review and choose “Save to personal practice” on a mistake. Your saved positions appear here.</p>}</section>
    <div className="training-layout"><section><label className="field-label">Choose a puzzle<select value={index} onChange={(event) => choose(Number(event.target.value))}>{PUZZLES.map((entry, i) => <option key={i} value={i}>{i + 1}. {entry.title} · {entry.difficulty}</option>)}</select></label><h2>{puzzle.title}</h2><p>{game.turn() === "w" ? "White" : "Black"} to move: find checkmate in one.</p><Board game={game} orient={new Chess(puzzle.fen).turn()} myColor={new Chess(puzzle.fen).turn()} canMove={!done && !busy} onMove={move} lastMove={last} hint={hint} /><p role="status">{message}</p><div className="row"><button className="btn" disabled={done} onClick={() => { setHint(matingMoves(puzzle.fen)[0]?.from); setHinted(true); setMessage("Move the highlighted piece to deliver checkmate. Hinted attempts do not earn points."); }}>Hint</button><button className="btn" onClick={() => choose(index)}>Retry</button><button className="btn primary" onClick={() => choose((index + 1) % PUZZLES.length)}>Next puzzle</button></div></section>
    <section><h2>Your learning path</h2>{LESSONS.map((lesson) => <article className="card" key={lesson.slug}><small>{lesson.category}</small><h3><Link href={`/learn/${lesson.slug}`}>{lesson.title}</Link></h3><p>{lesson.description}</p>{profile && <button className="btn" disabled={Boolean(profile.lessons?.[lesson.slug])} onClick={() => complete(lesson.slug)}>{profile.lessons?.[lesson.slug] ? "✓ Completed" : "Mark as studied"}</button>}</article>)}</section></div></>;
}
