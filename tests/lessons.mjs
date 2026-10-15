import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { LESSONS } from "../lib/lessons.js";

assert.equal(new Set(LESSONS.map((lesson) => lesson.slug)).size, LESSONS.length);
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
    }
  }
}
console.log("Passed: lesson URLs, legal exercise positions, opening moves, knight-fork targets, and queen checkmate.");
