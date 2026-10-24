import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { Chess } from "chess.js";
import { academyAction, academyStatus } from "../lib/academy.js";
import { registerPlayer, socialAction } from "../lib/community.js";
import { platformAction } from "../lib/platform.js";
import { TACTICS, adaptivePuzzle, validateTactic, revisionSchedule, tacticExplanation } from "../lib/academyData.js";
import { communityTransaction } from "../lib/communityStore.js";
import { createAutomaticEvent, advanceEvents, swissPairings, eventReady } from "../lib/events.js";
import { accessRoom } from "../lib/rooms.js";
import { VariantGame, chess960Fen } from "../lib/variantGame.js";
import { personalExplorer } from "../lib/personalExplorer.js";
import { performanceInsights } from "../lib/performanceInsights.js";
import { positionData } from "../lib/positionData.js";
import { explainMove } from "../lib/moveExplanation.js";

const suffix = randomBytes(4).toString("hex"), users = ["A", "B", "C", "D"].map((name) => ({ id: `academy-${suffix}-${name}`, name: `Academy ${name}` }));
for (const [i, user] of users.entries()) { await registerPlayer(user); await socialAction(user, { type: "profile", username: `academy_${suffix}${i}`, name: user.name, avatar: "knight" }); }
const [a, b, c] = users;
for (const puzzle of TACTICS) { const game = new Chess(puzzle.fen); for (const move of puzzle.line) game.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] }); assert.ok(validateTactic(puzzle, puzzle.line.filter((_, i) => i % 2 === 0)), puzzle.id); }
assert.equal(adaptivePuzzle(700, "Fork").id, "fork-queen"); assert.ok(tacticExplanation(TACTICS[0], "hi").includes("राजा"));
assert.equal(revisionSchedule(1, true, 0).dueAt, 7 * 86400000); assert.equal(revisionSchedule(2, false, 0).stage, 0);
const fork = TACTICS.find((p) => p.id === "fork-queen"), solution = fork.line.filter((_, i) => i % 2 === 0);
const attempt = await academyAction(a, { type: "attempt", puzzleId: fork.id, moves: solution }); assert.ok(attempt.correct && attempt.rating > 200);
assert.equal((await academyAction(a, { type: "attempt", puzzleId: fork.id, moves: solution })).rating, attempt.rating);
const run = (await academyAction(a, { type: "runStart", mode: "survival" })).run;
await assert.rejects(academyAction(a, { type: "attempt", puzzleId: fork.id, moves: solution, runId: run.id }), /not eligible/);
const assigned = TACTICS.find((p) => p.id === run.next);
const scored = await academyAction(a, { type: "attempt", puzzleId: assigned.id, moves: assigned.line.filter((_, i) => i % 2 === 0), runId: run.id }); assert.equal(scored.run.score, 1);
await assert.rejects(academyAction(a, { type: "attempt", puzzleId: assigned.id, moves: assigned.line.filter((_, i) => i % 2 === 0), runId: run.id }), /not eligible/);
await academyAction(a, { type: "runFinish" }); assert.equal((await academyStatus(a)).profile.trainingBest.survival, 1);
await platformAction(a, { type: "saveMistake", fen: fork.fen, bestMove: { from: "c3", to: "e4" } });
const mistake = (await academyStatus(a)).profile.mistakes[0];
const revised = await academyAction(a, { type: "revise", id: mistake.id, move: { from: "c3", to: "e4" }, plan: "Check the king and attack the queen." }); assert.ok(revised.correct); assert.equal(revised.stage, 1);
assert.equal((await academyAction(a, { type: "revise", id: mistake.id, move: { from: "c3", to: "e4" } })).stage, 1);
await academyAction(a, { type: "preferences", boardTheme: "blue", pieceStyle: "symbols", coordinates: false, notifications: false, language: "mr" });
assert.equal((await academyStatus(a)).profile.settings.language, "mr");
const study = await academyAction(a, { type: "studyCreate", title: "Branching study" });
assert.equal((await academyStatus(b)).studies.length, 0);
await assert.rejects(academyAction(b, { type: "studyJoin", id: study.id, code: "wrong" }), /invalid/);
const invite = (await academyStatus(a)).studies[0].invite; await academyAction(b, { type: "studyJoin", id: study.id, code: invite });
const shared = (await academyStatus(a)).studies[0];
const concurrent = await Promise.allSettled([a, b].map((user) => academyAction(user, { type: "studyComment", id: study.id, nodeId: shared.nodes[0].id, version: shared.version, comment: "My comment" })));
assert.equal(concurrent.filter((r) => r.status === "fulfilled").length, 1);
await assert.rejects(academyAction(c, { type: "studyMove", id: study.id, nodeId: shared.nodes[0].id, version: 1, move: { from: "e2", to: "e4" } }), /not found/);
const current = (await academyStatus(a)).studies[0]; await academyAction(a, { type: "studyMove", id: study.id, nodeId: current.nodes[0].id, version: current.version, move: { from: "e2", to: "e4" } });
assert.equal((await academyStatus(b)).studies[0].nodes.length, 2);
await academyAction(a, { type: "studyRemoveMember", id: study.id, version: current.version + 1, userId: b.id });
assert.equal((await academyStatus(b)).studies.length, 0); await assert.rejects(academyAction(b, { type: "studyJoin", id: study.id, code: invite }), /invalid/);
await academyAction(b, { type: "partnerProfile", goal: "Rook endgames" }); await academyAction(a, { type: "partnerInvite", userId: b.id }); assert.equal((await academyStatus(b)).invitations[0].goal, "Rook endgames");
await academyAction(b, { type: "partnerDecline", id: (await academyStatus(b)).invitations[0].id });
const event = await createAutomaticEvent(a, { title: "Automatic test", startsAt: Date.now() - 1000, format: "swiss", rounds: 3 });
for (const user of users.slice(1)) await platformAction(user, { type: "tournamentJoin", id: event.id });
await advanceEvents();
for (let round = 0; round < 3; round++) {
  const snapshot = await communityTransaction((state) => ({ event: structuredClone(state.tournaments[event.id]), rooms: structuredClone(state.rooms) }), { readOnly: true });
  assert.equal(snapshot.event.rounds.length, round + 1);
  for (const pair of snapshot.event.rounds[round]) if (pair.black) { const room = snapshot.rooms[pair.roomId]; const user = users.find((user) => user.id === pair.black); await accessRoom(room.id, room.tokens.b, { type: "resign" }, user); }
}
const completed = await communityTransaction((state) => structuredClone(state.tournaments[event.id]), { readOnly: true }); assert.equal(completed.status, "finished");
const pairs = completed.rounds.flat().map((pair) => [pair.white, pair.black].sort().join(":")); assert.equal(new Set(pairs).size, 6);
const arena = await createAutomaticEvent(a, { title: "Arena test", startsAt: Date.now() - 1000, format: "arena" }); await platformAction(b, { type: "tournamentJoin", id: arena.id }); await advanceEvents();
await eventReady(b, arena.id, false);
const arenaRoom = await communityTransaction((state) => state.rooms[state.matches[a.id].id], { readOnly: true }); await accessRoom(arenaRoom.id, arenaRoom.tokens.b, { type: "resign" }, b);
await advanceEvents(Date.now() + 3700000); assert.equal((await communityTransaction((state) => state.tournaments[arena.id], { readOnly: true })).status, "finished");
for (let index = 0; index < 960; index++) { const back = chess960Fen(index).split("/")[7].split(" ")[0]; assert.equal(back.length, 8); const bishops = [...back].map((p, i) => p === "B" ? i : -1).filter((i) => i >= 0); assert.notEqual(bishops[0] % 2, bishops[1] % 2); const rooks = [...back].map((p, i) => p === "R" ? i : -1).filter((i) => i >= 0); assert.ok(rooks[0] < back.indexOf("K") && back.indexOf("K") < rooks[1]); }
for (const variant of ["chess960", "kingofthehill", "threecheck"]) { const game = new VariantGame(variant); const before = game.fen(); const next = game.clone(); next.move(next.moves({ verbose: true })[0]); assert.notEqual(next.fen(), before); assert.equal(game.fen(), before); }
const sample = [{ id: "sample", color: "w", outcome: "win", names: { w: "A", b: "B" }, finishedAt: Date.now(), moves: [{ from: "e2", to: "e4", san: "e4", timeSpentMs: 800 }, { from: "e7", to: "e5", san: "e5", timeSpentMs: 2000 }] }];
assert.equal(personalExplorer(sample, new Chess().fen()).moves[0].white, 1); assert.equal(performanceInsights(sample).timing.underSecond, 1); assert.match(explainMove(new Chess().fen(), { from: "e2", to: "e4" }), /central/);
await assert.rejects(positionData("tablebase", new Chess().fen()), /seven/);
const base = await positionData("tablebase", "7k/5K2/8/8/8/8/8/6Q1 w - - 0 1", async () => ({ ok: true, json: async () => ({ category: "win", moves: [{ uci: "g1g7", san: "Qg7#", category: "loss", dtz: -1 }] }) })); assert.equal(base.moves[0].category, "loss");
console.log("Passed: multi-move studies, adaptive themes, rated attempts, run anti-duplication, spaced revision, collaboration consent/versioning, partner invitations, automatic Swiss/arena, 960 layouts, variant moves, personal opening/time insights and tablebase validation.");
