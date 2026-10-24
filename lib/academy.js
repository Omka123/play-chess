import { randomBytes } from "node:crypto";
import { Chess } from "chess.js";
import { communityTransaction } from "./communityStore.js";
import { ensurePlayer, createMatch } from "./community.js";
import { rateLimit } from "./platform.js";
import { TACTICS, validateTactic, revisionSchedule, adaptivePuzzle } from "./academyData.js";
import { eloChange } from "./ratings.js";
import { blocked, notify } from "./notifications.js";
import { insertRoom } from "./roomStore.js";
import { GOALS } from "./practiceGoals.js";
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const id = () => randomBytes(12).toString("hex");
const text = (value, max = 300) => typeof value === "string" ? value.trim().slice(0, max) : "";
const member = (study, me) => study && study.members.includes(me.id);
export async function academyStatus(user) {
  return communityTransaction((state) => {
    const me = ensurePlayer(state, user, { allowSuspended: true });
    return { profile: structuredClone(me), studies: Object.values(state.sharedStudies || {}).filter((study) => member(study, me)),
      partners: Object.values(state.players).filter((player) => player.partnerGoal && !player.deleted && !player.suspended && player.id !== me.id && !blocked(state, me.id, player.id)).map((player) => ({ id: player.id, name: player.name, username: player.username, goal: player.partnerGoal, ratings: player.ratings })),
      invitations: Object.values(state.practiceInvites || {}).filter((invite) => invite.to === me.id && invite.expires > Date.now()).map((invite) => ({ ...invite, name: state.players[invite.from]?.name || "Player" })) };
  });
}
export async function academyAction(user, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Invalid action.");
  const result = await communityTransaction((state) => {
    const me = ensurePlayer(state, user); rateLimit(state, `academy:${me.id}`, 90);
    state.sharedStudies ||= {}; state.practiceInvites ||= {};
    if (input.id && !/^[a-f0-9]{24}$/.test(input.id)) fail("Invalid identifier.");
    switch (input.type) {
      case "repertoireCreate": {
        me.repertoires ||= [];
        if (me.repertoires.length >= 10) fail("You can save ten repertoire folders.");
        let fen; try { fen = new Chess(input.fen || undefined).fen(); } catch { fail("Invalid starting position."); }
        const entry = { id: id(), title: text(input.title, 80) || "My repertoire", color: input.color === "b" ? "b" : "w", version: 1, nodes: [{ id: id(), parent: null, fen, san: "", comment: "" }] };
        me.repertoires.push(entry); return { id: entry.id };
      }
      case "repertoireMove": case "repertoireComment": case "repertoireRecall": case "repertoireDelete": {
        const folder = me.repertoires?.find((entry) => entry.id === input.id);
        if (!folder) fail("Repertoire not found.", 404);
        if (input.version !== folder.version) fail("Repertoire changed. Reload before saving.", 409);
        if (input.type === "repertoireDelete") { me.repertoires = me.repertoires.filter((entry) => entry.id !== input.id); return { saved: true }; }
        const node = folder.nodes.find((entry) => entry.id === input.nodeId); if (!node) fail("Position not found.", 404);
        if (input.type === "repertoireMove") {
          if (folder.nodes.length >= 500) fail("A repertoire can contain 500 positions.");
          let game, move; try { game = new Chess(node.fen); move = game.move(input.move); } catch { fail("Invalid repertoire move."); }
          const uci = move.from + move.to + (move.promotion || "");
          if (folder.nodes.some((entry) => entry.parent === node.id && entry.uci === uci)) fail("That branch is already saved.");
          folder.nodes.push({ id: id(), parent: node.id, fen: game.fen(), san: move.san, uci, comment: "" });
        } else if (input.type === "repertoireComment") node.comment = text(input.comment, 1500);
        else {
          const children = folder.nodes.filter((entry) => entry.parent === node.id);
          if (new Chess(node.fen).turn() !== folder.color || !children.length) fail("Choose one of your prepared positions to recall.");
          if (node.dueAt && node.dueAt > Date.now()) fail("This position is not due yet.");
          const correct = children.some((entry) => entry.uci === input.move);
          Object.assign(node, revisionSchedule(node.stage || 0, correct));
          folder.version++; return { correct };
        }
        folder.version++; return { saved: true };
      }
      case "preferences": {
        const previous = me.settings || {};
        me.settings = { ...previous, boardTheme: ["green", "wood", "blue", "purple"].includes(input.boardTheme) ? input.boardTheme : previous.boardTheme || "green", pieceStyle: ["classic", "symbols"].includes(input.pieceStyle) ? input.pieceStyle : previous.pieceStyle || "classic", coordinates: input.coordinates !== undefined ? Boolean(input.coordinates) : previous.coordinates !== false, language: ["en", "hi", "mr"].includes(input.language) ? input.language : previous.language || "en", notifications: input.notifications !== undefined ? Boolean(input.notifications) : previous.notifications !== false };
        return { settings: me.settings };
      }
      case "attempt": {
        const puzzle = TACTICS.find((entry) => entry.id === input.puzzleId); if (!puzzle) fail("Puzzle unavailable.");
        const correct = validateTactic(puzzle, input.moves); me.academyAttempts ||= {}; me.puzzleRating ??= 200;
        const first = !me.academyAttempts[puzzle.id];
        if (first && !input.hinted) me.puzzleRating = Math.max(0, me.puzzleRating + eloChange(me.puzzleRating, puzzle.rating, correct ? 1 : 0));
        me.academyAttempts[puzzle.id] = { correct, at: Date.now(), theme: puzzle.theme, hinted: Boolean(input.hinted), durationMs: Number.isFinite(input.durationMs) ? Math.max(0, Math.min(3600000, input.durationMs)) : null };
        const today = new Date().toISOString().slice(0, 10); me.dailyTraining ||= {}; const daily = me.dailyTraining[today] ||= { puzzles: [] };
        if (correct && !daily.puzzles.includes(puzzle.id)) daily.puzzles.push(puzzle.id);
        me.dailyTraining = Object.fromEntries(Object.entries(me.dailyTraining).slice(-35));
        if (input.runId) {
          const run = me.trainingRun; if (!run || run.id !== input.runId || run.finished || (run.endsAt && Date.now() >= run.endsAt)) fail("The training run has ended.");
          if (run.next !== puzzle.id || input.hinted) fail("This puzzle is not eligible for the run.");
          if (correct) run.score++; else run.lives--;
          run.seen.push(puzzle.id); run.finished = run.lives <= 0 || run.seen.length >= TACTICS.length;
          run.next = adaptivePuzzle(400 + run.score * 50, "All", run.seen)?.id;
          if (run.finished) me.trainingBest = { ...me.trainingBest, [run.mode]: Math.max(me.trainingBest?.[run.mode] || 0, run.score) };
        }
        return { correct, rating: me.puzzleRating, run: me.trainingRun || null };
      }
      case "runStart": {
        if (!["3min", "5min", "survival"].includes(input.mode)) fail("Choose a training mode.");
        me.trainingRun = { id: id(), mode: input.mode, startedAt: Date.now(), endsAt: input.mode === "survival" ? null : Date.now() + (input.mode === "3min" ? 180000 : 300000), score: 0, lives: 3, seen: [], next: adaptivePuzzle(400).id, finished: false }; return { run: me.trainingRun };
      }
      case "runFinish": {
        const run = me.trainingRun; if (!run) fail("No active training run."); run.finished = true; me.trainingBest = { ...me.trainingBest, [run.mode]: Math.max(me.trainingBest?.[run.mode] || 0, run.score) }; return { run };
      }
      case "revise": {
        const entry = me.mistakes?.find((mistake) => mistake.id === input.id); if (!entry) fail("Practice position not found.", 404);
        let move; try { move = new Chess(entry.fen).move(input.move); } catch { fail("Choose a legal move."); }
        const correct = move.from === entry.bestMove.from && move.to === entry.bestMove.to && (move.promotion || "") === (entry.bestMove.promotion || "");
        const already = entry.lastReviewed && entry.dueAt > Date.now(); if (!already || !correct) Object.assign(entry, revisionSchedule(entry.stage || 0, correct));
        entry.plan = text(input.plan, 500); entry.lastCorrect = correct; return { correct, dueAt: entry.dueAt, stage: entry.stage };
      }
      case "partnerProfile": me.partnerGoal = GOALS.includes(input.goal) ? input.goal : null; return { saved: true };
      case "partnerInvite": {
        const target = state.players[input.userId]; if (!target?.partnerGoal || target.id === me.id || target.suspended || target.deleted || blocked(state, me.id, target.id)) fail("Practice partner unavailable.");
        if (Object.values(state.practiceInvites).filter((invite) => invite.from === me.id && invite.expires > Date.now()).length >= 5) fail("Wait for your current invitations.");
        const invite = { id: id(), from: me.id, to: target.id, goal: target.partnerGoal, expires: Date.now() + 300000 }; state.practiceInvites[invite.id] = invite; notify(state, target.id, `${me.name} wants to practise ${target.partnerGoal.toLowerCase()} with you.`, "/improve"); return { saved: true };
      }
      case "partnerAccept": case "partnerDecline": {
        const invite = state.practiceInvites[input.id]; if (!invite || invite.to !== me.id || invite.expires < Date.now()) fail("Invitation expired.");
        if (input.type === "partnerDecline") { delete state.practiceInvites[input.id]; return { saved: true }; }
        const other = state.players[invite.from]; if (!other || other.deleted || other.suspended || blocked(state, me.id, other.id)) fail("Player unavailable.");
        if (state.matches[me.id] || state.matches[other.id]) fail("Finish your current live game first.");
        const room = createMatch(state, other.id, me.id, 600, 5, false, { practiceGoal: invite.goal }); delete state.practiceInvites[input.id]; return { room, saved: true };
      }
      case "studyCreate": {
        if (Object.values(state.sharedStudies).filter((study) => study.ownerId === me.id).length >= 10) fail("You can own ten collaborative studies.");
        let fen; try { fen = new Chess(input.fen || undefined).fen(); } catch { fail("Invalid FEN."); }
        const study = { id: id(), title: text(input.title, 80) || "Shared study", ownerId: me.id, members: [me.id], invite: randomBytes(16).toString("hex"), version: 1, nodes: [{ id: id(), parent: null, title: "Chapter 1", fen, comment: "", author: me.id }], updatedAt: Date.now() }; state.sharedStudies[study.id] = study; return { id: study.id };
      }
      case "studyJoin": {
        const study = state.sharedStudies[input.id]; if (!study || study.invite !== input.code || blocked(state, me.id, study.ownerId) || state.players[study.ownerId]?.suspended) fail("Study invitation invalid.");
        if (study.members.length >= 20) fail("Study is full."); if (!study.members.includes(me.id)) { study.members.push(me.id); study.version++; } return { saved: true };
      }
      case "studyMove": case "studyComment": case "studyChapter": case "studyRemoveMember": {
        const study = state.sharedStudies[input.id]; if (!member(study, me)) fail("Study not found.", 404);
        if (input.version !== study.version) fail("Someone updated this study. Refresh and try again.", 409);
        if (input.type === "studyRemoveMember") { if (study.ownerId !== me.id || input.userId === me.id) fail("Only the owner can remove another member."); study.members = study.members.filter((id) => id !== input.userId); study.invite = randomBytes(16).toString("hex"); }
        else if (input.type === "studyComment") { const node = study.nodes.find((node) => node.id === input.nodeId); if (!node) fail("Position not found."); node.comment = text(input.comment, 1500); }
        else {
          if (study.nodes.length >= 500) fail("This study has reached 500 positions.");
          const parent = input.type === "studyMove" ? study.nodes.find((node) => node.id === input.nodeId) : null; if (input.type === "studyMove" && !parent) fail("Position not found.");
          let game, move; try { game = new Chess(parent?.fen || input.fen || undefined); if (parent) move = game.move(input.move); } catch { fail("Invalid position or move."); }
          study.nodes.push({ id: id(), parent: parent?.id || null, fen: game.fen(), san: move?.san || "", title: parent ? "" : text(input.title, 80) || "New chapter", comment: "", author: me.id });
        }
        study.version++; study.updatedAt = Date.now(); return { saved: true };
      }
      case "studyDelete": { const study = state.sharedStudies[input.id]; if (study?.ownerId !== me.id) fail("Only the owner can delete this study."); delete state.sharedStudies[input.id]; return { saved: true }; }
      default: fail("Unknown training action.");
    }
  });
  if (result.room) { await insertRoom(result.room, { ifNotExists: true }); delete result.room; }
  return result;
}
