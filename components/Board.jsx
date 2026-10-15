"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ChessPiece from "./ChessPiece";
import { FILES, PIECE_NAMES } from "@/lib/constants";
import { colorName, kingSquare } from "@/lib/chessUtil";
import { boardPoint, moveAnimations } from "@/lib/boardMotion";
import { arrowGeometry } from "@/lib/reviewArrows";

function SlidingPiece({ move, orient, onFinish }) {
  const ref = useRef(null);
  const start = boardPoint(move.from, orient);
  const end = boardPoint(move.to, orient);
  useLayoutEffect(() => {
    const animation = ref.current.animate([
      { transform: `translate(${(start.x - end.x) * 100}%, ${(start.y - end.y) * 100}%)` },
      { transform: "translate(0, 0)" },
    ], { duration: 180, easing: "cubic-bezier(.22,.61,.36,1)" });
    animation.onfinish = onFinish;
    return () => animation.cancel();
  }, [move, orient]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={ref} className="sliding-piece" style={{ left: `${end.x * 12.5}%`, top: `${end.y * 12.5}%` }} aria-hidden="true"><span className="piece"><ChessPiece type={move.type} color={move.color} /></span></div>;
}

/**
 * Presentational chess board. It owns only UI state (selection, drag, promotion picker).
 * The parent owns the game and is told about moves through `onMove(from, to, promotion)`.
 */
export default function Board({ game, orient, lastMove, hint, canMove, myColor, onMove, arrows = [] }) {
  const [selected, setSelected] = useState(null);
  const [promo, setPromo] = useState(null);
  const [ghost, setGhost] = useState(null);
  const dragRef = useRef(null);
  const boardRef = useRef(null);
  const previousPosition = useRef(null);
  const skipSlide = useRef(false);
  const [slides, setSlides] = useState([]);
  const fen = game.fen();

  useLayoutEffect(() => {
    const position = {};
    for (const row of game.board()) for (const piece of row) if (piece) position[piece.square] = piece;
    const previous = previousPosition.current;
    previousPosition.current = { position, orient, fen };
    if (previous?.fen === fen && previous.orient === orient) return;
    const animate = previous && previous.orient === orient && !skipSlide.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSlides(animate ? moveAnimations(previous.position, position, lastMove).map((move) => ({ ...move, fen })) : []);
    skipSlide.current = false;
  }, [fen, orient]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear UI state whenever the position changes.
  useEffect(() => {
    setSelected(null);
    setPromo(null);
  }, [fen]);

  const targets = useMemo(() => {
    const t = {};
    if (selected) game.moves({ square: selected, verbose: true }).forEach((m) => { t[m.to] = true; });
    return t;
  }, [selected, game]);

  const attempt = (from, to) => {
    if (!canMove || !targets[to]) { setSelected(null); return; }
    const p = game.get(from);
    if (p && p.type === "p" && ((p.color === "w" && to[1] === "8") || (p.color === "b" && to[1] === "1"))) {
      setPromo({ from, to, color: p.color });
      return;
    }
    setSelected(null);
    onMove(from, to);
  };

  // Window-level pointer handlers read the latest values through a ref.
  const latest = useRef({});
  latest.current = { attempt, targets };

  useEffect(() => {
    const move = (e) => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) d.moved = true;
      if (d.moved) setGhost({ x: e.clientX, y: e.clientY, type: d.piece.type, color: d.piece.color, size: d.size, from: d.from });
    };
    const up = (e) => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      setGhost(null);
      if (!d.moved) return; // plain click: keep the selection
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const sqEl = el && el.closest ? el.closest("[data-sq]") : null;
      const { attempt: go, targets: t } = latest.current;
      if (sqEl && boardRef.current?.contains(sqEl) && t[sqEl.dataset.sq]) { skipSlide.current = true; go(d.from, sqEl.dataset.sq); }
      else setSelected(null);
    };
    const cancel = () => { dragRef.current = null; setGhost(null); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, []);

  const onDown = (e, sq) => {
    if (!canMove || e.button > 0) return;
    if (selected && targets[sq]) { attempt(selected, sq); return; }
    const p = game.get(sq);
    if (p && p.color === myColor) {
      setSelected(sq);
      dragRef.current = { from: sq, x: e.clientX, y: e.clientY, moved: false, piece: p, size: e.currentTarget.getBoundingClientRect().width };
    } else if (selected) {
      setSelected(null);
    }
  };

  const board = game.board();
  const flip = orient === "b";
  const checkSq = game.isCheck() ? kingSquare(game, game.turn()) : null;
  const squares = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const r = flip ? 7 - i : i;
      const c = flip ? 7 - j : j;
      const sq = FILES[c] + (8 - r);
      const p = board[r][c];
      let cls = `sq ${(r + c) % 2 === 0 ? "l" : "d"}`;
      if (lastMove && (lastMove.from === sq || lastMove.to === sq)) cls += " last";
      if (selected === sq) cls += " sel";
      if (checkSq === sq) cls += " chk";
      if (hint === sq) cls += " hint";
      const label = `${p ? `${colorName(p.color)} ${PIECE_NAMES[p.type]} on ` : ""}${sq}`;
      squares.push(
        <div key={sq} className={cls} data-sq={sq} role="gridcell" aria-label={label} onPointerDown={(e) => onDown(e, sq)}>
          {targets[sq] && (p ? <span className="ring" /> : <span className="dot" />)}
          {p && (
            <span className={`piece ${p.color}${ghost && ghost.from === sq ? " dragging" : ""}${slides.some((move) => move.fen === fen && move.to === sq) ? " slide-hidden" : ""}`}><ChessPiece type={p.type} color={p.color} /></span>
          )}
        </div>
      );
    }
  }

  return (
    <div className="boardwrap">
      {["top", "bottom"].map((edge) => <div key={edge} className={`frame-coords ${edge}`} aria-hidden="true">
        {(flip ? [...FILES].reverse() : [...FILES]).map((file) => <span key={file}>{file}</span>)}
      </div>)}
      {["left", "right"].map((edge) => <div key={edge} className={`frame-coords ${edge}`} aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => <span key={i}>{flip ? i + 1 : 8 - i}</span>)}
      </div>)}
      <div className="board" ref={boardRef} role="grid" aria-label="Chess board">{squares}
        {slides.filter((move) => move.fen === fen).map((move) => <SlidingPiece key={`${move.fen}:${move.to}`} move={move} orient={orient} onFinish={() => setSlides((current) => current.filter((item) => item !== move))} />)}
        {arrows.length > 0 && <svg className="review-arrows" viewBox="0 0 800 800" role="img" aria-label={arrows.map((arrow) => arrow.label).join(". ")}>
          {arrows.map((arrow) => {
            const geometry = arrowGeometry(arrow, orient);
            return <g key={arrow.kind} className={`board-arrow ${arrow.kind}`}>
              <title>{arrow.label}</title>
              <path d={geometry.path} />
              <polygon points="0,0 -40,-26 -40,26" transform={`translate(${geometry.end.x} ${geometry.end.y}) rotate(${geometry.angle})`} />
            </g>;
          })}
        </svg>}
      </div>

      {promo && (
        <div className="promo" onClick={(e) => { if (e.target === e.currentTarget) { setPromo(null); setSelected(null); } }}>
          <div className="choices">
            {["q", "r", "b", "n"].map((k) => (
              <button
                key={k}
                className={promo.color}
                aria-label={`Promote to ${PIECE_NAMES[k]}`}
                onClick={() => { const pm = promo; setPromo(null); setSelected(null); onMove(pm.from, pm.to, k); }}
              >
                <ChessPiece type={k} color={promo.color} />
              </button>
            ))}
          </div>
        </div>
      )}

      {ghost && createPortal(
        <div className={`ghost ${ghost.color}`} style={{ left: ghost.x, top: ghost.y, width: ghost.size * 0.92, height: ghost.size * 0.92 }}>
          <ChessPiece type={ghost.type} color={ghost.color} />
        </div>, document.body
      )}
    </div>
  );
}
