import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { LESSONS } from "../lib/lessons.js";
import { LESSON_EXAMPLES } from "../lib/lessonExamples.js";

assert.equal(new Set(LESSONS.map((lesson) => lesson.slug)).size, LESSONS.length);
const exampleIds = new Set();
for (const [slug, examples] of Object.entries(LESSON_EXAMPLES)) {
  assert.ok(LESSONS.some((lesson) => lesson.slug === slug));
  for (const example of examples) {
    assert.ok(!exampleIds.has(example.id)); exampleIds.add(example.id);
    const game = new Chess(example.fen);
    for (const step of example.steps) { assert.ok(step.note.length > 50); assert.ok(game.move(step.san)); }
    if (example.result === "checkmate") assert.ok(game.isCheckmate(), example.id);
    if (example.result === "stalemate") { assert.ok(game.isStalemate(), example.id); assert.equal(game.isCheck(), false); }
    if (example.result === "insufficient-material") assert.ok(game.isInsufficientMaterial(), example.id);
    if (example.pgn) { const imported = new Chess(); imported.loadPgn(example.pgn); assert.equal(imported.fen(), game.fen()); }
    if (example.id === "king-cannot-recapture") assert.throws(() => game.move("Kxe7"));
    if (example.id === "en-passant-timing") { assert.equal(game.get("d5"), undefined); assert.equal(game.get("d6").type, "p"); assert.ok(game.moves({ verbose: true }).some((move) => move.from === "e7" && move.to === "d6")); }
    if (example.id === "three-moves-to-promotion") { assert.equal(game.get("a8").type, "q"); assert.equal(game.isGameOver(), false); }
    if (example.id === "fork-and-follow-through") assert.equal(game.get("d6").type, "n");
    if (example.id === "develop-before-castling") { assert.equal(game.get("g1").type, "k"); assert.equal(game.get("f1").type, "r"); }
    const start = new Chess(example.fen);
    if (example.id === "castling-past-an-attack") { assert.ok(!start.moves().includes("O-O")); assert.ok(start.moves().includes("O-O-O")); assert.equal(game.get("c1").type, "k"); assert.equal(game.get("g8").type, "k"); }
    if (example.id === "active-move-drops-defender") { assert.equal(game.get("d4").type, "b"); assert.ok(!game.moves({ verbose: true }).some((move) => move.to === "d4")); assert.ok(start.isAttacked("d4", "b")); assert.ok(start.isAttacked("d4", "w")); }
    if (example.id === "rook-cuts-off-king") { const wall = new Chess(example.fen); wall.move("a5"); assert.ok(!wall.moves({ verbose: true }).some((move) => move.to[0] === "d")); assert.equal(game.get("a8").type, "q"); }
    if (example.id === "queen-promotion-stalemate") assert.equal(game.get("c8").type, "q");
    if (example.id === "rook-promotion-keeps-win") { const rook = new Chess(example.fen); rook.move("c8=R"); assert.equal(rook.isStalemate(), false); assert.equal(game.get("h8").type, "r"); assert.equal(game.isGameOver(), false); }
    if (example.id === "escape-square-saves-king") { const check = new Chess(example.fen); check.move("Ra8+"); assert.equal(check.isCheckmate(), false); assert.deepEqual(check.moves(), ["Kh7"]); }
    if (example.id === "block-only-delays-mate") { const check = new Chess(example.fen); check.move("Ra8+"); assert.deepEqual(check.moves(), ["Rd8"]); }
    if (example.id === "review-a-short-loss") assert.ok(game.isCheckmate());
  }
}
for (const lesson of LESSONS) {
  if (!lesson.challenge) continue;
  const challenge = lesson.challenge;
  const position = new Chess(challenge.fen);
  assert.equal(position.turn(), "w");
  assert.equal(position.isGameOver(), false);
  if (challenge.mate) {
    const mates = position.moves({ verbose: true }).filter((move) => {
      const next = new Chess(challenge.fen);
      next.move(move);
      return next.isCheckmate();
    });
    assert.ok(mates.some((move) => move.from === "f7" && move.to === "g7"));
  } else {
    for (const move of challenge.moves) {
      const next = new Chess(challenge.fen);
      next.move({ from: move.slice(0, 2), to: move.slice(2, 4), ...(move[4] ? { promotion: move[4] } : {}) });
      if (lesson.slug === "spot-a-knight-fork") {
        assert.equal(next.isCheck(), true);
        assert.equal(next.isAttacked("d6", "w"), true);
        assert.equal(next.isAttacked("e4", "b"), false);
      }
      if (lesson.slug === "back-rank-checkmate") assert.ok(next.isCheckmate());
      if (lesson.slug === "en-passant-explained") { assert.equal(next.get("d5"), undefined); assert.equal(next.get("d6").color, "w"); }
      if (lesson.slug === "understand-pins") assert.throws(() => next.move("Kxe7"));
    }
  }
}
console.log("Passed: lesson URLs, legal exercise positions, opening moves, knight-fork targets, and queen checkmate.");
