import { randomBytes } from "node:crypto";
import { Chess } from "chess.js";
import { communityTransaction } from "./communityStore.js";
import { ensurePlayer, createMatch } from "./community.js";
import { insertRoom } from "./roomStore.js";
import { notify, blocked } from "./notifications.js";
import { LESSONS } from "./lessons.js";
import { PUZZLES, matingMoves } from "./puzzles.js";
import { eloChange } from "./ratings.js";

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const id = () => randomBytes(12).toString("hex");
const text = (value, max = 100) => typeof value === "string" ? value.trim().slice(0, max) : "";
const publicPlayer = (player) => ({ id: player.id, name: player.name, username: player.username, avatar: player.avatar, ratings: player.ratings });
export function rateLimit(state, key, maximum = 30, window = 60000) {
  state.limits ||= {};
  const now = Date.now();
  const bucket = state.limits[key];
  if (!bucket || bucket.until < now) state.limits[key] = { count: 1, until: now + window };
  else if (++bucket.count > maximum) fail("Too many requests. Please wait and try again.", 429);
  for (const [key, entry] of Object.entries(state.limits)) if (entry.until < now) delete state.limits[key];
}

export async function rememberRoom(room) {
  if (!Object.keys(room.users || {}).length) return;
  await communityTransaction((state) => {
    for (const [side, userId] of Object.entries(room.users)) {
      const player = state.players[userId]; if (!player || player.deleted) continue;
      player.activeGames ||= {};
      if (!room.result) player.activeGames[room.id] = { id: room.id, token: room.tokens[side], expires: room.expires, opponent: room.names[side === "w" ? "b" : "w"] || "Waiting", daily: Boolean(room.dailyDays) };
      else delete player.activeGames[room.id];
    }
  });
}

export async function platformStatus(user) {
  return communityTransaction((state) => {
    const me = ensurePlayer(state, user, { allowSuspended: true });
    const now = Date.now();
    return { profile: structuredClone(me),
      activeGames: Object.values(me.activeGames || {}).filter((game) => game.expires > now),
      clubs: Object.values(state.clubs || {}).filter((club) => club.members.includes(me.id)).map((club) => ({ ...club, memberCount: club.members.length })),
      publicClubs: Object.values(state.clubs || {}).filter((club) => club.public && !state.players[club.ownerId]?.suspended && !state.players[club.ownerId]?.deleted).map(({ id, name, description, members }) => ({ id, name, description, memberCount: members.length })),
      tournaments: Object.values(state.tournaments || {}).filter((event) => event.public || event.members.includes(me.id) || event.ownerId === me.id).map((event) => ({ ...event, standings: event.members.map((userId) => ({ ...publicPlayer(state.players[userId]), score: event.scores[userId] || 0 })).sort((a, b) => b.score - a.score) })),
      coaches: Object.values(state.players).filter((player) => player.coach?.enabled && !player.deleted && !player.suspended && !blocked(state, me.id, player.id)).map((player) => ({ ...publicPlayer(player), coach: player.coach })),
      bookings: Object.values(state.bookings || {}).filter((booking) => booking.studentId === me.id || booking.coachId === me.id).map((booking) => ({ ...booking, studentName: state.players[booking.studentId]?.name || "Deleted player", coachName: state.players[booking.coachId]?.name || "Deleted player" })),
      puzzleBattles: Object.values(state.puzzleBattles || {}).filter((battle) => battle.players.includes(me.id)).map((battle) => ({ ...battle, names: Object.fromEntries(battle.players.map((id) => [id, state.players[id]?.name || "Player"])) })),
      dailyInvites: Object.values(state.dailyInvites || {}).filter((invite) => invite.to === me.id && invite.expires > now).map((invite) => ({ ...invite, name: state.players[invite.from]?.name || "Player" })),
    };
  });
}

export async function platformAction(user, input) {
  if (!input || typeof input !== "object") fail("Invalid action.");
  const result = await communityTransaction((state) => {
    const me = ensurePlayer(state, user, { allowSuspended: ["notificationsRead", "settings"].includes(input.type) });
    rateLimit(state, `platform:${me.id}`, 90);
    state.clubs ||= {}; state.tournaments ||= {}; state.bookings ||= {}; state.puzzleBattles ||= {};
    state.dailyInvites ||= {};
    if (input.id && !/^[a-f0-9]{24}$/.test(input.id)) fail("Invalid identifier.");
    if (input.battleId && !/^[a-f0-9]{24}$/.test(input.battleId)) fail("Invalid challenge.");
    switch (input.type) {
      case "settings": {
        const settings = { ...me.settings, publicProfile: Boolean(input.publicProfile), membership: "free" };
        me.settings = settings; return { settings };
      }
      case "notificationsRead": me.notifications = (me.notifications || []).map((entry) => ({ ...entry, read: true })); return { saved: true };
      case "saveStudy": {
        if (!Array.isArray(input.fens) || input.fens.length < 1 || input.fens.length > 500) fail("Save between 1 and 500 positions.");
        const fens = input.fens.map((fen) => { if (typeof fen !== "string" || fen.length > 120) fail("Invalid position."); try { return new Chess(fen).fen(); } catch { fail("Invalid position."); } });
        me.studies ||= []; if (me.studies.length >= 20) fail("You can save 20 studies. Remove an old study first.");
        me.studies.unshift({ id: id(), title: text(input.title, 80) || "Untitled study", fens, at: Date.now() }); return { saved: true };
      }
      case "deleteStudy": me.studies = (me.studies || []).filter((study) => study.id !== input.id); return { saved: true };
      case "saveMistake": {
        let game, best; try { game = new Chess(input.fen); best = game.move(input.bestMove); } catch { fail("Invalid practice position or move."); }
        const fen = new Chess(input.fen).fen();
        me.mistakes ||= [];
        if (!me.mistakes.some((entry) => entry.fen === fen && entry.best === best.san)) me.mistakes.unshift({ id: id(), fen, color: best.color, best: best.san, bestMove: { from: best.from, to: best.to, ...(best.promotion ? { promotion: best.promotion } : {}) }, at: Date.now() });
        me.mistakes = me.mistakes.slice(0, 50); return { saved: true };
      }
      case "removeMistake": me.mistakes = (me.mistakes || []).filter((entry) => entry.id !== input.id); return { saved: true };
      case "block": case "unblock": {
        const target = Object.values(state.players).find((player) => player.username === text(input.username).replace(/^@/, "").toLowerCase());
        if (!target || target.id === me.id) fail("Player not found.", 404);
        me.blocked ||= [];
        if (input.type === "block") {
          if (!me.blocked.includes(target.id)) me.blocked.push(target.id);
          me.friends = me.friends.filter((id) => id !== target.id); target.friends = target.friends.filter((id) => id !== me.id);
          me.requests = me.requests.filter((id) => id !== target.id); target.requests = target.requests.filter((id) => id !== me.id);
          for (const [id, entry] of Object.entries(state.challenges)) if ([me.id, target.id].includes(entry.from) && [me.id, target.id].includes(entry.to)) delete state.challenges[id];
        } else me.blocked = me.blocked.filter((id) => id !== target.id);
        return { saved: true };
      }
      case "lessonComplete": {
        if (!LESSONS.some((lesson) => lesson.slug === input.slug)) fail("Lesson not found.", 404);
        me.lessons ||= {}; me.lessons[input.slug] = Date.now(); return { saved: true };
      }
      case "clubCreate": {
        const name = text(input.name, 60), description = text(input.description, 500);
        if (name.length < 3) fail("Use at least three characters for the club name.");
        if (Object.values(state.clubs).filter((club) => club.ownerId === me.id).length >= 5) fail("You can own up to five clubs.");
        const club = { id: id(), name, description, public: Boolean(input.public), ownerId: me.id, members: [me.id], invite: randomBytes(16).toString("hex"), announcements: [], createdAt: Date.now() };
        state.clubs[club.id] = club; return { id: club.id };
      }
      case "clubJoin": {
        const club = state.clubs[input.id];
        if (!club || (!club.public && club.invite !== input.invite)) fail("Club not found or invite invalid.", 404);
        if (blocked(state, me.id, club.ownerId)) fail("This club is unavailable.", 403);
        if (!club.members.includes(me.id)) club.members.push(me.id);
        notify(state, club.ownerId, `${me.name} joined ${club.name}.`); return { joined: true };
      }
      case "clubLeave": {
        const club = state.clubs[input.id]; if (!club?.members.includes(me.id)) fail("Club not found.", 404);
        if (club.ownerId === me.id) fail("The owner must keep the club until an operator transfers or removes it.");
        club.members = club.members.filter((id) => id !== me.id); return { left: true };
      }
      case "clubAnnounce": {
        const club = state.clubs[input.id]; if (club?.ownerId !== me.id) fail("Only the club owner can announce.", 403);
        const message = text(input.message, 1000); if (message.length < 3) fail("Enter an announcement.");
        club.announcements.unshift({ id: id(), message, at: Date.now() }); club.announcements = club.announcements.slice(0, 30);
        for (const member of club.members) notify(state, member, `${club.name}: ${message.slice(0, 80)}`); return { saved: true };
      }
      case "tournamentCreate": {
        const title = text(input.title, 80), startsAt = Number(input.startsAt);
        if (title.length < 3 || !Number.isFinite(startsAt) || startsAt < Date.now() - 60000 || startsAt > Date.now() + 90 * 86400000) fail("Choose a title and a start time within 90 days.");
        const club = input.clubId ? state.clubs[input.clubId] : null;
        if (input.clubId && club?.ownerId !== me.id) fail("Only the club owner can host a club event.", 403);
        const event = { id: id(), title, ownerId: me.id, public: !club, clubId: club?.id || null, startsAt, status: "scheduled", members: [me.id], scores: {}, rounds: [], tc: 300, increment: 2 };
        state.tournaments[event.id] = event; return { id: event.id };
      }
      case "tournamentJoin": {
        const event = state.tournaments[input.id]; if (!event || event.status !== "scheduled") fail("Registration is closed.");
        if (!event.public && !state.clubs[event.clubId]?.members.includes(me.id)) fail("Join the club first.", 403);
        if (blocked(state, me.id, event.ownerId)) fail("Event unavailable.", 403);
        if (event.members.length >= 32) fail("This event is full.");
        if (!event.members.includes(me.id)) event.members.push(me.id); return { joined: true };
      }
      case "tournamentRound": {
        const event = state.tournaments[input.id]; if (event?.ownerId !== me.id) fail("Only the organiser can start rounds.", 403);
        if (event.status === "finished" || Date.now() < event.startsAt) fail("This event is not ready to start.");
        if (event.members.some((id) => !state.players[id] || state.players[id].suspended || state.players[id].deleted)) fail("A registered player is unavailable. Contact the operator before starting another round.");
        if (event.members.length < 2) fail("At least two players are needed.");
        if (event.rounds.at(-1)?.some((pair) => !pair.done)) fail("Finish the current round first.");
        const played = new Set(event.rounds.flat().filter((pair) => pair.black).map((pair) => [pair.white, pair.black].sort().join(":")));
        const remaining = [...event.members].sort((a, b) => (event.scores[b] || 0) - (event.scores[a] || 0));
        const pairs = [];
        while (remaining.length) {
          const white = remaining.shift();
          const index = remaining.findIndex((black) => !played.has([white, black].sort().join(":")) && !blocked(state, white, black));
          if (index < 0) { if (remaining.length) fail("No new pairing is available. Finish the event or adjust the roster with the operator."); event.scores[white] = (event.scores[white] || 0) + 1; pairs.push({ white, black: null, done: true, bye: true }); continue; }
          const black = remaining.splice(index, 1)[0];
          if (state.matches[white] || state.matches[black]) fail("A participant already has an active game.", 409);
          const room = createMatch(state, white, black, 300, 2, false, { tournamentId: event.id });
          pairs.push({ white, black, roomId: room.id, done: false });
        }
        event.rounds.push(pairs); event.status = "running";
        return { started: true, rooms: pairs.filter((pair) => pair.roomId).map((pair) => state.rooms[pair.roomId]) };
      }
      case "tournamentFinish": {
        const event = state.tournaments[input.id]; if (event?.ownerId !== me.id) fail("Only the organiser can finish the event.", 403);
        if (event.rounds.at(-1)?.some((pair) => !pair.done)) fail("Complete the current round first.");
        event.status = "finished"; for (const member of event.members) notify(state, member, `${event.title} has finished. View the standings.`); return { saved: true };
      }
      case "coachProfile": {
        const bio = text(input.bio, 1000), availability = text(input.availability, 300);
        if (input.enabled && (bio.length < 30 || availability.length < 5)) fail("Add a coaching bio and availability.");
        me.coach = { enabled: Boolean(input.enabled), bio, availability, price: "Free", verified: false }; return { saved: true };
      }
      case "dailyChallenge": {
        const target = Object.values(state.players).find((player) => player.username === text(input.username).replace(/^@/, "").toLowerCase());
        if (!target || target.deleted || target.suspended || target.id === me.id || blocked(state, me.id, target.id)) fail("Player unavailable.");
        const days = Number(input.days); if (![1, 3, 7].includes(days)) fail("Choose 1, 3 or 7 days per move.");
        if (Object.values(state.dailyInvites).filter((entry) => entry.from === me.id && entry.expires > Date.now()).length >= 10) fail("Wait for your pending invitations.");
        const invite = { id: id(), from: me.id, to: target.id, days, expires: Date.now() + 86400000 }; state.dailyInvites[invite.id] = invite;
        notify(state, target.id, `${me.name} invited you to a daily game.`); return { saved: true };
      }
      case "dailyAccept": case "dailyDecline": {
        const invite = state.dailyInvites[input.id];
        if (!invite || invite.to !== me.id || invite.expires < Date.now()) fail("Invitation expired.");
        const other = state.players[invite.from];
        if (input.type === "dailyDecline") { delete state.dailyInvites[input.id]; return { saved: true }; }
        if (!other || other.deleted || other.suspended || blocked(state, me.id, other.id)) fail("Player unavailable.");
        if (state.matches[me.id] || state.matches[other.id]) fail("Finish your live game before accepting.");
        const room = createMatch(state, other.id, me.id, 0, 0, false, { dailyDays: invite.days, moveDeadline: Date.now() + invite.days * 86400000, expires: Date.now() + 365 * 86400000 });
        delete state.matches[me.id]; delete state.matches[other.id]; delete state.dailyInvites[input.id];
        return { rooms: [room] };
      }
      case "booking": {
        const coach = state.players[input.coachId]; const when = Number(input.when);
        if (!coach?.coach?.enabled || coach.suspended || coach.id === me.id || blocked(state, me.id, coach.id)) fail("Coach unavailable.");
        if (!Number.isFinite(when) || when <= Date.now() || when > Date.now() + 90 * 86400000) fail("Choose a future date within 90 days.");
        const booking = { id: id(), coachId: coach.id, studentId: me.id, when, topic: text(input.topic, 300), status: "requested" };
        state.bookings[booking.id] = booking; notify(state, coach.id, `${me.name} requested a free coaching session.`); return { id: booking.id };
      }
      case "bookingRespond": {
        const booking = state.bookings[input.id]; if (!booking || ![booking.coachId, booking.studentId].includes(me.id)) fail("Booking not found.", 404);
        if (!["accepted", "declined", "cancelled"].includes(input.status) || (input.status !== "cancelled" && booking.coachId !== me.id)) fail("Invalid booking response.", 403);
        if (!["requested", "accepted"].includes(booking.status)) fail("This request is already closed.");
        if (input.status === "accepted" && (booking.status !== "requested" || booking.when <= Date.now())) fail("This request is no longer available.");
        if (input.status === "accepted" && Object.values(state.bookings).some((other) => other.id !== booking.id && other.status === "accepted" && [other.coachId, other.studentId].some((id) => [booking.coachId, booking.studentId].includes(id)) && Math.abs(other.when - booking.when) < 3600000)) fail("A participant already has a session within one hour of this time.");
        booking.status = input.status; notify(state, booking.coachId === me.id ? booking.studentId : booking.coachId, `Coaching request ${input.status}.`); return { saved: true };
      }
      case "puzzleAnswer": {
        const puzzle = PUZZLES[input.index]; if (!Number.isInteger(input.index) || !puzzle) fail("Puzzle not found.");
        const game = new Chess(puzzle.fen); let move;
        try { move = game.move(input.move); } catch { fail("That move is not legal."); }
        const correct = game.isCheckmate();
        me.puzzleRating ??= 200; me.puzzleResults ||= {};
        const first = !me.puzzleResults[input.index];
        if (first && !input.hinted) me.puzzleRating = Math.max(0, me.puzzleRating + eloChange(me.puzzleRating, puzzle.rating || 600, correct ? 1 : 0));
        me.puzzleResults[input.index] = { correct, at: Date.now() };
        if (correct) { me.puzzles[input.index] = true; }
        const battle = state.puzzleBattles[input.battleId];
        if (battle?.players.includes(me.id) && battle.startedAt && Date.now() < battle.endsAt) {
          battle.answers ||= {}; battle.answers[me.id] ||= {};
          if (!battle.answers[me.id][input.index] && correct && !input.hinted) battle.scores[me.id] = (battle.scores[me.id] || 0) + 1;
          battle.answers[me.id][input.index] = true;
        }
        return { correct, rating: me.puzzleRating, best: matingMoves(puzzle.fen)[0], san: move.san };
      }
      case "puzzleBattle": {
        const target = Object.values(state.players).find((player) => player.username === text(input.username).replace(/^@/, "").toLowerCase());
        if (!target || target.deleted || target.id === me.id || target.suspended || blocked(state, me.id, target.id)) fail("Player unavailable.");
        if (Object.values(state.puzzleBattles).filter((entry) => entry.players[0] === me.id && !entry.startedAt && entry.expires > Date.now()).length >= 10) fail("Wait for your pending challenges.");
        const battle = { id: id(), players: [me.id, target.id], scores: {}, startedAt: null, endsAt: null, expires: Date.now() + 86400000 };
        state.puzzleBattles[battle.id] = battle; notify(state, target.id, `${me.name} invited you to a puzzle challenge.`); return { id: battle.id };
      }
      case "puzzleBattleAccept": {
        const battle = state.puzzleBattles[input.id]; if (!battle || battle.players[1] !== me.id || battle.startedAt || battle.expires < Date.now() || blocked(state, me.id, battle.players[0]) || state.players[battle.players[0]]?.suspended) fail("Challenge not available.");
        battle.startedAt = Date.now(); battle.endsAt = Date.now() + 180000; return { saved: true };
      }
      default: fail("Unknown action.");
    }
  });
  if (result.rooms) { await Promise.all(result.rooms.map((room) => insertRoom(room, { ifNotExists: true }))); delete result.rooms; }
  return result;
}

export async function recordEventResult(room) {
  if (!room.tournamentId || !room.result) return;
  await communityTransaction((state) => {
    const event = state.tournaments?.[room.tournamentId]; if (!event) return;
    const pairing = event.rounds.flat().find((pair) => pair.roomId === room.id); if (!pairing || pairing.done) return;
    pairing.done = true; pairing.result = room.winner || "draw";
    event.scores[pairing.white] = (event.scores[pairing.white] || 0) + (room.winner === "w" ? 1 : room.winner ? 0 : .5);
    event.scores[pairing.black] = (event.scores[pairing.black] || 0) + (room.winner === "b" ? 1 : room.winner ? 0 : .5);
  });
}

export async function publicProfile(username) {
  if (!/^[a-z][a-z0-9_]{2,19}$/.test(username)) return null;
  return communityTransaction((state) => {
    const player = Object.values(state.players).find((entry) => entry.username === username && entry.settings?.publicProfile && !entry.deleted && !entry.suspended);
    return player ? { ...publicPlayer(player), ratedCount: player.ratedCount, puzzleRating: player.puzzleRating ?? 200, lessonsCompleted: Object.keys(player.lessons || {}).length } : null;
  }, { readOnly: true });
}
