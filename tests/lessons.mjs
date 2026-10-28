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
