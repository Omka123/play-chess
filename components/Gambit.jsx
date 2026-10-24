"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "./Board";
import Friends from "./Friends";
import MatchPanel from "./MatchPanel";
import MatchPromotion from "./MatchPromotion";
import GameReview from "./GameReview";
import SaveBotGame from "./SaveBotGame";
import { reviewArrows } from "@/lib/reviewArrows";
import AccountMenu from "./AccountMenu";
import { useSession } from "next-auth/react";
import Link from "next/link";
import SiteFooter from "./SiteFooter";
import { LESSONS } from "@/lib/lessons";
import PlayerBar from "./PlayerBar";
import PlayPanel from "./PlayPanel";
import PuzzlePanel from "./PuzzlePanel";
import { BOTS } from "@/lib/constants";
import { PUZZLES, matingMoves } from "@/lib/puzzles";
import { buildGame, capturedInfo, colorName, gameResult, tryMove } from "@/lib/chessUtil";
import { chooseMove } from "@/lib/engine";
import GameExport from "./GameExport";
import ColorIcon from "./ColorIcon";
import { clockAfterMove, tickPlayClock } from "@/lib/playClock";
import { elapsedMoveTime } from "@/lib/moveTiming";

const initialPlay = {
  stage: "setup", // "setup" | "game"
  moves: [], view: 0, human: "w", orient: "w",
  active: false, over: false, result: null, thinking: false,
  botId: 3, color: "w", tc: 0, increment: 0, clocks: { w: 0, b: 0 }, gameId: 0,
};

const sideOf = (idx) => new Chess(PUZZLES[idx].fen).turn();
const freshPuzzle = (idx) => ({
  idx, moves: [], view: 0, solved: false, busy: false, msg: "", msgKind: "", hint: null, orient: sideOf(idx),
});
const botById = (id) => BOTS.find((b) => b.id === id);

export default function Gambit() {
  const { data: account } = useSession();
  const [mode, setMode] = useState("play");
  const [reviewSelection, setReviewSelection] = useState(null);
  const [premove, setPremove] = useState(null);
  const [play, setPlay] = useState(initialPlay);
  const [puzzle, setPuzzle] = useState(() => freshPuzzle(0));
  const [solved, setSolved] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const playRef = useRef(play);
  const modeRef = useRef(mode);
  const workerRef = useRef(null);
  const reqId = useRef(0);
  const lastTick = useRef(null);
  playRef.current = play;
  modeRef.current = mode;

  /* ---------- saved settings ---------- */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("room") || new URLSearchParams(window.location.search).has("online")) setMode("friends");
    try {
      const savedTheme = localStorage.getItem("gambit:theme");
      document.documentElement.dataset.theme = savedTheme === "light" ? "light" : "dark";
      const pr = JSON.parse(localStorage.getItem("gambit:prefs") || "null");
      if (pr) setPlay((p) => ({ ...p, botId: pr.botId || p.botId, color: pr.color || p.color, tc: typeof pr.tc === "number" ? pr.tc : p.tc, increment: [0, 2, 5].includes(pr.increment) ? pr.increment : 0 }));
      const s = JSON.parse(localStorage.getItem("gambit:solved") || "null");
      if (Array.isArray(s)) setSolved(s);
    } catch { /* storage unavailable */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("gambit:solved", JSON.stringify(solved));
      localStorage.setItem("gambit:prefs", JSON.stringify({ botId: play.botId, color: play.color, tc: play.tc, increment: play.increment }));
    } catch { /* storage unavailable */ }
  }, [loaded, solved, play.botId, play.color, play.tc, play.increment]);

  /* ---------- derived position ---------- */
  const t = mode === "play" ? play : puzzle;
  const startFen = mode === "play" ? undefined : PUZZLES[puzzle.idx].fen;
  const full = useMemo(() => buildGame(startFen, t.moves), [startFen, t.moves]);
  const shown = useMemo(
    () => (t.view === t.moves.length ? full : buildGame(startFen, t.moves, t.view)),
    [full, startFen, t.moves, t.view]
  );
  const puzzleSide = useMemo(() => sideOf(puzzle.idx), [puzzle.idx]);

  /* ---------- bot (runs in a Web Worker) ---------- */
  const killWorker = useCallback(() => {
    if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null; }
  }, []);

  const askBot = useCallback((fen, bot) => new Promise((resolve) => {
    try {
      if (!workerRef.current) workerRef.current = new Worker(new URL("../lib/engine.worker.js", import.meta.url));
      const w = workerRef.current;
      const id = ++reqId.current;
      w.onmessage = (e) => { if (e.data.id === id) resolve(e.data.move); };
      w.onerror = () => resolve(chooseMove(fen, bot)); // fall back to the main thread
      w.postMessage({ id, fen, bot });
    } catch {
      resolve(chooseMove(fen, bot));
    }
  }), []);

  useEffect(() => () => killWorker(), [killWorker]);

  useEffect(() => {
    if (mode !== "play" || play.stage !== "game" || !play.active || play.over) return;
    if (full.turn() === play.human) return;
    const gid = play.gameId;
    const ply = play.moves.length;
    const fen = full.fen();
    const bot = botById(play.botId);
    let cancelled = false;
    let pending = true;
    setPlay((p) => ({ ...p, thinking: true }));

    const timer = setTimeout(async () => {
      const mv = await askBot(fen, bot);
      pending = false;
      if (cancelled || !mv) return;
      const moveAt = performance.now();
      setPlay((p) => {
        if (p.gameId !== gid || p.moves.length !== ply || p.over) return p;
        const r = tryMove(undefined, p.moves, mv.from, mv.to, mv.promotion);
        if (!r) return { ...p, thinking: false };
        const moves = [...p.moves, { ...r.move, timeSpentMs: elapsedMoveTime(p.turnStartedAt, moveAt) }];
        const over = r.game.isGameOver();
        return {
          ...p, moves, turnStartedAt: moveAt, thinking: false, over, active: !over,
          clocks: clockAfterMove(p, r.move.color),
          view: p.view === p.moves.length ? moves.length : p.view,
          result: over ? gameResult(r.game, p.human, bot.name) : null,
        };
      });
    }, 1400 + Math.random() * 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (pending) killWorker();
    };
  }, [mode, play.stage, play.active, play.over, play.gameId, play.moves.length, play.human, play.botId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- clocks ---------- */
  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now();
      const dt = lastTick.current === null ? 0 : now - lastTick.current;
      lastTick.current = now;
      const p = playRef.current;
      if (modeRef.current !== "play" || p.stage !== "game" || !p.active || p.over || !p.tc || p.moves.length < 2) return;
      setPlay((q) => {
        if (!q.active || q.over || q.gameId !== p.gameId || q.moves.length !== p.moves.length) return q;
        const tick = tickPlayClock(q, dt);
        if (!tick) return q;
        const { clocks, turn, expired } = tick;
        if (!expired) return { ...q, clocks };
        const bot = botById(q.botId);
        return {
          ...q, clocks, over: true, active: false, thinking: false,
          result: { title: turn === q.human ? `${bot.name} wins` : "You win", detail: `${colorName(turn)} ran out of time.` },
        };
      });
    }, 200);
    return () => clearInterval(id);
  }, []);

  /* ---------- play actions ---------- */
  const patchPrefs = (patch) => setPlay((p) => ({ ...p, ...patch }));

  const startGame = (swap) => {
    const p = playRef.current;
    let color = p.color;
    if (swap) color = p.human === "w" ? "b" : "w";
    else if (color === "r") color = Math.random() < 0.5 ? "w" : "b";
    lastTick.current = performance.now();
    setPlay({
      ...p, stage: "game", moves: [], view: 0, human: color, orient: color,
      historyId: crypto.randomUUID(), historyUserId: account?.user?.id || null,
      active: true, over: false, result: null, thinking: false, turnStartedAt: performance.now(),
      clocks: { w: p.tc * 1000, b: p.tc * 1000 }, gameId: p.gameId + 1,
    });
  };

  const newGameSetup = () => {
    killWorker();
    setPlay((p) => ({ ...initialPlay, botId: p.botId, color: p.color, tc: p.tc, increment: p.increment, gameId: p.gameId + 1 }));
  };

  const onPlayMove = (from, to, promo) => {
    const moveAt = performance.now();
    setPlay((p) => {
      if (!p.active || p.over || buildGame(undefined, p.moves).turn() !== p.human) return p;
      const r = tryMove(undefined, p.moves, from, to, promo);
      if (!r) return p;
      const moves = [...p.moves, { ...r.move, timeSpentMs: elapsedMoveTime(p.turnStartedAt, moveAt) }];
      const over = r.game.isGameOver();
      return {
        ...p, moves, turnStartedAt: moveAt, view: moves.length, over, active: !over, thinking: false,
        clocks: clockAfterMove(p, p.human),
        result: over ? gameResult(r.game, p.human, botById(p.botId).name) : null,
      };
    });
  };

  const resign = () => setPlay((p) => {
    if (!p.active || p.over) return p;
    return { ...p, over: true, active: false, thinking: false, result: { title: `${botById(p.botId).name} wins`, detail: "You resigned." } };
  });

  useEffect(() => {
    if (!premove || premove.gameId !== play.gameId || !play.active || play.over || play.thinking || mode !== "play") return;
    const position = buildGame(undefined, play.moves);
    if (position.turn() !== play.human) return;
    setPremove(null);
    if (tryMove(undefined, play.moves, premove.from, premove.to, premove.promotion)) onPlayMove(premove.from, premove.to, premove.promotion);
  }, [premove, play.gameId, play.moves.length, play.active, play.over, play.thinking, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const undo = () => { const moveAt = performance.now(); setPlay((p) => {
    if (!p.active || p.over || p.thinking) return p;
    const turn = p.moves.length % 2 === 0 ? "w" : "b";
    const n = turn === p.human ? 2 : 1;
    if (p.moves.length < n) return p;
    const moves = p.moves.slice(0, -n);
    return { ...p, moves, view: moves.length, turnStartedAt: moveAt };
  }); };

  const flip = () => setPlay((p) => ({ ...p, orient: p.orient === "w" ? "b" : "w" }));

  /* ---------- puzzle actions ---------- */
  const loadPuzzle = (i) => setPuzzle(freshPuzzle((i + PUZZLES.length) % PUZZLES.length));

  const onPuzzleMove = (from, to, promo) => {
    const pz = puzzle;
    const r = tryMove(PUZZLES[pz.idx].fen, pz.moves, from, to, promo);
    if (!r) return;
    const moves = [...pz.moves, r.move];
    const idx = pz.idx;
    if (r.game.isCheckmate()) {
      setPuzzle((p) => ({ ...p, moves, view: moves.length, solved: true, busy: false, hint: null, msg: "Checkmate. Well found.", msgKind: "good" }));
      setSolved((s) => (s.includes(idx) ? s : [...s, idx]));
    } else {
      setPuzzle((p) => ({
        ...p, moves, view: moves.length, busy: true, hint: null, msgKind: "bad",
        msg: r.game.isCheck() ? "That's check, but the king can escape. Try again." : "That's legal, but it isn't checkmate. Try again.",
      }));
      setTimeout(() => {
        setPuzzle((p) => (p.idx === idx && !p.solved ? { ...p, moves: [], view: 0, busy: false } : p));
      }, 1100);
    }
  };

  const hint = () => {
    const mm = matingMoves(PUZZLES[puzzle.idx].fen);
    if (!mm.length) return;
    setPuzzle((p) => ({ ...p, hint: mm[0].from, msg: "Look at the highlighted piece.", msgKind: "" }));
  };

  /* ---------- navigation ---------- */
  const goto = (ply) => {
    const clamp = (p) => ({ ...p, view: Math.max(0, Math.min(p.moves.length, ply)) });
    if (mode === "play") setPlay(clamp); else setPuzzle(clamp);
  };
  useEffect(() => {
    const onKey = (e) => {
      if (mode === "friends" || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === "ArrowLeft") { goto(t.view - 1); e.preventDefault(); }
      else if (e.key === "ArrowRight") { goto(t.view + 1); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toggleTheme = () => {
    const root = document.documentElement;
    const cur = root.dataset.theme;
    const dark = cur ? cur === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("gambit:theme", root.dataset.theme); } catch { /* storage unavailable */ }
  };

  /* ---------- view props ---------- */
  const atLatest = t.view === t.moves.length;
  const canMove = atLatest && (mode === "play"
    ? play.stage === "game" && play.active && !play.over && !play.thinking && full.turn() === play.human
    : !puzzle.solved && !puzzle.busy);
  const myColor = mode === "play" ? play.human : puzzleSide;
  const lastMove = t.view > 0 ? t.moves[t.view - 1] : null;

  const info = capturedInfo(shown);
  const bottom = t.orient;
  const top = bottom === "w" ? "b" : "w";

  const barProps = (color) => {
    let name;
    let avatar;
    if (mode === "play") {
      if (play.stage === "game") {
        if (color === play.human) { name = account?.user?.name || "You"; avatar = name[0]; }
        else { name = botById(play.botId).name; avatar = name[0]; }
      } else { name = colorName(color); avatar = color.toUpperCase(); }
    } else {
      name = colorName(color) + (color === puzzleSide ? " (you)" : "");
      avatar = color.toUpperCase();
    }
    const opp = color === "w" ? "b" : "w";
    const showClock = mode === "play" && play.stage === "game" && play.tc > 0;
    return {
      name, avatar,
      captured: info.lostBy[opp],
      diff: color === "w" ? info.diff : -info.diff,
      showClock,
      clock: play.clocks[color],
      running: showClock && play.active && !play.over && full.turn() === color && play.moves.length >= 2,
      low: play.clocks[color] < 20000,
    };
  };

  return (
    <>
      <header className="top game-nav">
        <div className="brand">
          <span className="mark" aria-hidden="true"><ColorIcon name="knight" size={36} /></span>
          ChessNexa
        </div>
        <nav className="tabs" role="tablist" aria-label="Modes">
          <button role="tab" aria-selected={mode === "play"} onClick={() => setMode("play")}><span className="nav-icon"><ColorIcon name="play" size={29} /></span>Play<span className="nav-detail">Challenge a computer</span></button>
          <button role="tab" aria-selected={mode === "friends"} onClick={() => setMode("friends")}><span className="nav-icon"><ColorIcon name="friends" size={29} /></span>Friends<span className="nav-detail">Invite & play online</span></button>
          <button role="tab" aria-selected={mode === "puzzle"} onClick={() => setMode("puzzle")}><span className="nav-icon"><ColorIcon name="puzzle" size={29} /></span>Puzzles<span className="nav-detail">Train your tactics</span></button>
        </nav>
        <div className="sidebar-extra">
        <Link href={account?.user ? "/account" : "/login"} className="sidebar-history"><span className="nav-icon"><ColorIcon name="history" size={29} /></span>Game history<span className="nav-detail">Review your past games</span></Link>
        <Link href="/hub" className="sidebar-history"><span className="nav-icon"><ColorIcon name="friends" size={29} /></span>Player hub<span className="nav-detail">Clubs, events and daily chess</span></Link>
        <Link href="/improve" className="sidebar-history"><span className="nav-icon"><ColorIcon name="puzzle" size={29} /></span>Training<span className="nav-detail">Puzzles and learning progress</span></Link>
        <Link href="/analysis" className="sidebar-history"><span className="nav-icon"><ColorIcon name="learn" size={29} /></span>Analysis studio<span className="nav-detail">Import PGN or FEN</span></Link>
        </div>
        <Link href="/learn" className="sidebar-learn"><ColorIcon name="learn" />Learn chess <span aria-hidden="true">→</span></Link>
        <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle light and dark theme" title="Toggle theme">&#9680;</button>
      </header>

      <div className="sidebar-footer"><span className="sidebar-knight" aria-hidden="true">♞</span><strong>Your next great move.</strong><span>A little chess, every day.</span></div>
      <section className="intro">
        <div><span className="eyebrow">CHESSNEXA</span><h1>{mode === "play" ? "Play Computer" : mode === "friends" ? "Play with Friends" : "Chess Puzzles"}</h1></div>
        <AccountMenu />
      </section>
      <div hidden={mode !== "friends"}><Friends visible={mode === "friends"} /></div>
      <main className="layout match-layout" hidden={mode === "friends"}>
        <section className="stage" aria-label="Chess board">
          <PlayerBar {...barProps(top)} />
          <Board
            key={mode}
            game={shown}
            winner={mode === "play" && play.over && atLatest && play.result.title !== "Draw" ? play.result.title === "You win" ? play.human : play.human === "w" ? "b" : "w" : null}
            orient={t.orient}
            lastMove={lastMove}
            hint={mode === "puzzle" ? puzzle.hint : null}
            arrows={mode === "play" && play.over && reviewSelection?.gameId === play.gameId && play.view === reviewSelection.entry.ply - 1 ? reviewArrows(reviewSelection.entry, shown.fen()) : []}
            canMove={canMove}
            canPremove={mode === "play" && play.stage === "game" && play.active && !play.over && atLatest && full.turn() !== play.human}
            onPremove={(from, to, promotion) => setPremove({ from, to, promotion, gameId: play.gameId })}
            premove={mode === "play" && play.active && premove?.gameId === play.gameId ? premove : null}
            myColor={myColor}
            onMove={mode === "play" ? onPlayMove : onPuzzleMove}
          />
          <PlayerBar {...barProps(bottom)} />
          {mode === "play" && play.active && premove?.gameId === play.gameId && <button className="btn" onClick={() => setPremove(null)}>Cancel premove · {premove.from}–{premove.to}</button>}
        </section>

        <MatchPanel>
          {mode === "play" && play.over && <SaveBotGame key={play.historyId} play={play} userId={account?.user?.id} />}
          {mode === "play" ? (
            <PlayPanel
              play={play}
              turn={full.turn()}
              inCheck={full.isCheck()}
              onPrefs={patchPrefs}
              onStart={() => startGame(false)}
              onRematch={() => startGame(play.color !== "r")}
              onNewGame={newGameSetup}
              onFlip={flip}
              onUndo={undo}
              onResign={resign}
              onGoto={goto}
            />
          ) : (
            <PuzzlePanel
              puzzle={puzzle}
              side={puzzleSide}
              solved={solved}
              onHint={hint}
              onReset={() => loadPuzzle(puzzle.idx)}
              onNext={() => loadPuzzle(puzzle.idx + 1)}
              onPrev={() => loadPuzzle(puzzle.idx - 1)}
              onPick={loadPuzzle}
              onProgress={(saved) => setSolved((current) => [...new Set([...current, ...saved])])}
            />
          )}
          {mode === "play" && play.over && <GameExport game={{ moves: play.moves, names: { [play.human]: account?.user?.name || "You", [play.human === "w" ? "b" : "w"]: botById(play.botId).name }, color: play.human, outcome: play.result.title === "Draw" ? "draw" : play.result.title === "You win" ? "win" : "loss", tc: play.tc, increment: play.increment, result: play.result }} fen={shown.fen()} />}
          {mode === "play" && play.over && <GameReview key={play.gameId} result={play.result} moves={play.moves} color={play.human} onGoto={goto}
            outcome={play.result.title === "Draw" ? "draw" : play.result.title === "You win" ? "win" : "loss"}
            onNewGame={newGameSetup} onRematch={() => startGame(play.color !== "r")} clockLabel={play.tc ? `${play.tc / 60} + ${play.increment || 0}` : "game"}
            selectedPly={reviewSelection?.gameId === play.gameId && play.view === reviewSelection.entry.ply - 1 ? reviewSelection.entry.ply : null}
            onSelect={(entry) => setReviewSelection(entry ? { gameId: play.gameId, entry } : null)} />}
        </MatchPanel>
        <MatchPromotion />
      </main>
      <section className="home-learning"><span className="eyebrow">PLAY WITH A PLAN</span><h2>Learn something you can use in your next game.</h2><p>Practice opening plans, recognize tactical threats, and understand why a position is checkmate. Read a guide, try its board exercise, then test the idea in a game.</p><div className="lesson-grid">{LESSONS.map((lesson) => <Link key={lesson.slug} className="lesson-card" href={`/learn/${lesson.slug}`}><span className="eyebrow">{lesson.category}</span><h3>{lesson.title}</h3><p>{lesson.description}</p><span className="lesson-link">Read & practice →</span></Link>)}</div></section>
      <SiteFooter />
    </>
  );
}
