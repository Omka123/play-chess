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
import { LESSONS } from "./lessons.js";
import { COURSES } from "./academyData.js";
import { LESSON_CHECKPOINTS } from "./lessonCheckpoints.js";
import { canEditStudy, studyForMember } from "./studyAccess.js";
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const id = () => randomBytes(12).toString("hex");
const text = (value, max = 300) => typeof value === "string" ? value.trim().slice(0, max) : "";
const member = (study, me) => study && study.members.includes(me.id);
export async function academyStatus(user) {
  return communityTransaction((state) => {
    const me = ensurePlayer(state, user, { allowSuspended: true });
    return { profile: structuredClone(me), studies: Object.values(state.sharedStudies || {}).filter((study) => member(study, me)).map((study) => studyForMember(study, me.id)),
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
      case "lessonCheckpoint": {
        const checkpoint = typeof input.slug === "string" && Object.hasOwn(LESSON_CHECKPOINTS, input.slug) ? LESSON_CHECKPOINTS[input.slug] : null;
        if (!checkpoint || !Number.isInteger(input.answer) || input.answer < 0 || input.answer >= checkpoint.choices.length) fail("Choose an answer to a valid lesson checkpoint.");
        const correct = input.answer === checkpoint.correct; me.lessonCheckpoints ||= {};
        const previous = me.lessonCheckpoints[input.slug] || {};
        me.lessonCheckpoints[input.slug] = { attempts: (previous.attempts || 0) + 1, passed: Boolean(previous.passed || correct), at: Date.now() };
        return { correct, explanation: checkpoint.explanation };
      }
      case "courseStep": {
        const course = COURSES.find((entry) => entry.id === input.courseId); if (!course) fail("Course not found.", 404);
        const lessons = LESSONS.filter((lesson) => course.categories.some((category) => lesson.category.toLowerCase().includes(category.toLowerCase())));
        const index = lessons.findIndex((lesson) => lesson.slug === input.slug); if (index < 0) fail("Lesson is not in this course.");
        me.courseProgress ||= {}; const progress = me.courseProgress[course.id] ||= {};
        if (index > 0 && !progress[lessons[index - 1].slug]) fail("Complete the previous assessed course step first.");
        if (!me.lessonCheckpoints?.[input.slug]?.passed) fail("Pass the checkpoint in this guide first.");
        progress[input.slug] ||= Date.now(); me.lessons ||= {}; me.lessons[input.slug] ||= Date.now(); return { saved: true };
      }
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
        const assignedRun = input.runId ? me.trainingRun : null;
        if (input.runId && (!assignedRun || assignedRun.id !== input.runId || assignedRun.finished || assignedRun.endsAt && Date.now() >= assignedRun.endsAt)) fail("The training run has ended.");
        const correct = validateTactic(puzzle, input.moves, input.variation ?? 0) && !(assignedRun?.puzzleDeadline && Date.now() > assignedRun.puzzleDeadline); me.academyAttempts ||= {}; me.puzzleRating ??= 200;
        const first = !me.academyAttempts[puzzle.id];
        if (first && !input.hinted) me.puzzleRating = Math.max(0, me.puzzleRating + eloChange(me.puzzleRating, puzzle.rating, correct ? 1 : 0));
        me.academyAttempts[puzzle.id] = { correct, at: Date.now(), theme: puzzle.theme, hinted: Boolean(input.hinted), durationMs: Number.isFinite(input.durationMs) ? Math.max(0, Math.min(3600000, input.durationMs)) : null };
        me.academyHistory ||= [];
        me.academyHistory.push({ ...me.academyAttempts[puzzle.id], puzzleId: puzzle.id, first, rating: me.puzzleRating });
        me.academyHistory = me.academyHistory.slice(-1000);
        const today = new Date().toISOString().slice(0, 10); me.dailyTraining ||= {}; const daily = me.dailyTraining[today] ||= { puzzles: [] };
        if (correct && !daily.puzzles.includes(puzzle.id)) daily.puzzles.push(puzzle.id);
        me.dailyTraining = Object.fromEntries(Object.entries(me.dailyTraining).slice(-35));
        if (input.runId) {
          const run = me.trainingRun; if (!run || run.id !== input.runId || run.finished || (run.endsAt && Date.now() >= run.endsAt)) fail("The training run has ended.");
          if (run.next !== puzzle.id || input.hinted) fail("This puzzle is not eligible for the run.");
          if (correct) run.score++; else run.lives--;
          run.seen.push(puzzle.id); run.finished = run.lives <= 0 || run.seen.length >= TACTICS.filter((entry) => !run.theme || entry.theme === run.theme).length;
          run.next = adaptivePuzzle(400 + run.score * 50, run.theme || "All", run.seen)?.id;
          if (run.mode === "time-drill") run.puzzleDeadline = Date.now() + 15000;
          if (run.finished) me.trainingBest = { ...me.trainingBest, [run.mode]: Math.max(me.trainingBest?.[run.mode] || 0, run.score) };
        }
        return { correct, rating: me.puzzleRating, run: me.trainingRun || null };
      }
      case "runStart": {
        if (!["3min", "5min", "survival", "time-drill", "endgame"].includes(input.mode)) fail("Choose a training mode.");
        const theme = input.mode === "endgame" ? "Endgame" : null;
        me.trainingRun = { id: id(), mode: input.mode, theme, startedAt: Date.now(), endsAt: input.mode === "survival" || input.mode === "endgame" ? null : Date.now() + (input.mode === "5min" ? 300000 : 180000), puzzleDeadline: input.mode === "time-drill" ? Date.now() + 15000 : null, score: 0, lives: 3, seen: [], next: adaptivePuzzle(400, theme || "All").id, finished: false }; return { run: me.trainingRun };
      }
      case "runFinish": {
        const run = me.trainingRun; if (!run) fail("No active training run."); run.finished = true; me.trainingBest = { ...me.trainingBest, [run.mode]: Math.max(me.trainingBest?.[run.mode] || 0, run.score) }; return { run };
      }
      case "revise": {
        const entry = me.mistakes?.find((mistake) => mistake.id === input.id); if (!entry) fail("Practice position not found.", 404);
        let move; try { move = new Chess(entry.fen).move(input.move); } catch { fail("Choose a legal move."); }
        const correct = move.from === entry.bestMove.from && move.to === entry.bestMove.to && (move.promotion || "") === (entry.bestMove.promotion || "");
        const already = entry.lastReviewed && entry.dueAt > Date.now(); if (!already || !correct) Object.assign(entry, revisionSchedule(entry.stage || 0, correct));
        entry.plan = text(input.plan, 500); entry.lastCorrect = correct;
        me.revisionHistory = [...(me.revisionHistory || []), { at: Date.now(), correct, stage: entry.stage, mistakeId: entry.id }].slice(-500);
        return { correct, dueAt: entry.dueAt, stage: entry.stage };
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
        const study = { id: id(), title: text(input.title, 80) || "Shared study", ownerId: me.id, members: [me.id], roles: {}, invite: randomBytes(16).toString("hex"), viewInvite: randomBytes(16).toString("hex"), history: [], version: 1, nodes: [{ id: id(), parent: null, title: "Chapter 1", fen, comment: "", author: me.id }], updatedAt: Date.now() }; state.sharedStudies[study.id] = study; return { id: study.id };
      }
      case "studyJoin": {
        const study = state.sharedStudies[input.id]; if (!study || typeof input.code !== "string" || ![study.invite, study.viewInvite].filter(Boolean).includes(input.code) || blocked(state, me.id, study.ownerId) || state.players[study.ownerId]?.suspended) fail("Study invitation invalid.");
        study.roles ||= {};
        if (!study.members.includes(me.id)) { if (study.members.length >= 20) fail("Study is full."); study.members.push(me.id); study.roles[me.id] = input.code === study.invite ? "editor" : "viewer"; study.version++; }
        return { saved: true };
      }
      case "studyMove": case "studyComment": case "studyChapter": case "studyRemoveMember": case "studySetRole": case "studyRotateInvites": case "studyRestoreComment": {
        const study = state.sharedStudies[input.id]; if (!member(study, me)) fail("Study not found.", 404);
        if (!canEditStudy(study, me.id)) fail("This study is read-only for your account.", 403);
        if (input.version !== study.version) fail("Someone updated this study. Refresh and try again.", 409);
        const revision = { version: study.version, actor: me.id, at: Date.now(), action: input.type, nodeId: input.nodeId || null };
        if (["studyRemoveMember", "studySetRole", "studyRotateInvites"].includes(input.type)) {
          if (study.ownerId !== me.id) fail("Only the owner can manage study access.", 403);
          study.roles ||= {};
          if (input.type !== "studyRotateInvites" && (input.userId === me.id || !study.members.includes(input.userId))) fail("Choose another study member.");
          if (input.type === "studyRemoveMember") { study.members = study.members.filter((id) => id !== input.userId); delete study.roles[input.userId]; }
          if (input.type === "studySetRole") { if (!["editor", "viewer"].includes(input.role)) fail("Choose editor or viewer."); study.roles[input.userId] = input.role; }
          study.invite = randomBytes(16).toString("hex"); study.viewInvite = randomBytes(16).toString("hex");
        }
        else if (input.type === "studyComment" || input.type === "studyRestoreComment") {
          const node = study.nodes.find((node) => node.id === input.nodeId); if (!node) fail("Position not found.");
          revision.beforeComment = node.comment; revision.beforeAuthor = node.commentAuthor || node.author;
          if (input.type === "studyRestoreComment") { const old = study.history?.find((entry) => entry.version === input.revision && entry.nodeId === node.id && typeof entry.beforeComment === "string"); if (!old) fail("Comment revision not found."); node.comment = old.beforeComment; }
          else node.comment = text(input.comment, 1500);
          node.commentAuthor = me.id;
        }
        else {
          if (study.nodes.length >= 500) fail("This study has reached 500 positions.");
          const parent = input.type === "studyMove" ? study.nodes.find((node) => node.id === input.nodeId) : null; if (input.type === "studyMove" && !parent) fail("Position not found.");
          let game, move; try { game = new Chess(parent?.fen || input.fen || undefined); if (parent) move = game.move(input.move); } catch { fail("Invalid position or move."); }
          study.nodes.push({ id: id(), parent: parent?.id || null, fen: game.fen(), san: move?.san || "", title: parent ? "" : text(input.title, 80) || "New chapter", comment: "", author: me.id });
        }
        study.history = [...(study.history || []), revision].slice(-100);
        study.version++; study.updatedAt = Date.now(); return { saved: true };
      }
      case "studyDelete": { const study = state.sharedStudies[input.id]; if (study?.ownerId !== me.id) fail("Only the owner can delete this study."); delete state.sharedStudies[input.id]; return { saved: true }; }
      default: fail("Unknown training action.");
    }
  });
  if (result.room) { await insertRoom(result.room, { ifNotExists: true }); delete result.room; }
  return result;
}
