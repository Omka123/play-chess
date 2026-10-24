import { communityTransaction } from "./communityStore.js";
import { createMatch, ensurePlayer } from "./community.js";
import { insertRoom } from "./roomStore.js";
import { blocked, notify } from "./notifications.js";
import { randomBytes } from "node:crypto";
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
export function standings(event) {
  return event.members.map((id) => ({ id, score: event.scores[id] || 0, buchholz: event.rounds.flat().filter((pair) => pair.black && [pair.white, pair.black].includes(id)).reduce((sum, pair) => sum + (event.scores[pair.white === id ? pair.black : pair.white] || 0), 0) })).sort((a, b) => b.score - a.score || b.buchholz - a.buchholz || a.id.localeCompare(b.id));
}
export function swissPairings(event, prohibited = () => false) {
  const ordered = standings(event).map((entry) => entry.id), played = new Set(event.rounds.flat().filter((pair) => pair.black).map((pair) => [pair.white, pair.black].sort().join(":")));
  let bye = null; if (ordered.length % 2) { const previous = new Set(event.rounds.flat().filter((pair) => pair.bye).map((pair) => pair.white)); bye = [...ordered].reverse().find((id) => !previous.has(id)) || ordered.at(-1); ordered.splice(ordered.indexOf(bye), 1); }
  let attempts = 0;
  function pair(ids) { if (!ids.length) return []; if (++attempts > 20000) return null; const first = ids[0]; for (let index = 1; index < ids.length; index++) { const other = ids[index]; if (played.has([first, other].sort().join(":")) || prohibited(first, other)) continue; const rest = pair(ids.filter((_, i) => i !== 0 && i !== index)); if (rest) return [[first, other], ...rest]; } return null; }
  const pairs = pair(ordered); return pairs ? { pairs, bye } : null;
}
export async function createAutomaticEvent(user, input) {
  return communityTransaction((state) => {
    const me = ensurePlayer(state, user); const title = typeof input.title === "string" ? input.title.trim().slice(0, 80) : ""; const startsAt = Number(input.startsAt);
    if (title.length < 3 || !Number.isFinite(startsAt) || startsAt < Date.now() - 60000 || startsAt > Date.now() + 30 * 86400000 || !["swiss", "arena"].includes(input.format)) fail("Choose a title, format and start time within thirty days.");
    state.tournaments ||= {}; if (Object.values(state.tournaments).filter((event) => event.ownerId === me.id && event.status !== "finished").length >= 5) fail("Finish an existing event before creating another.");
    const event = { id: randomBytes(12).toString("hex"), title, ownerId: me.id, public: true, clubId: null, startsAt, status: "scheduled", members: [me.id], scores: {}, rounds: [], tc: 300, increment: 2, format: input.format, automatic: true, totalRounds: [3, 5, 7].includes(Number(input.rounds)) ? Number(input.rounds) : 3, endsAt: startsAt + 3600000, ready: { [me.id]: true } };
    state.tournaments[event.id] = event; return { id: event.id };
  });
}
export async function eventReady(user, eventId, ready) {
  return communityTransaction((state) => { const me = ensurePlayer(state, user); const event = /^[a-f0-9]{24}$/.test(eventId || "") && state.tournaments?.[eventId]; if (!event || !event.members.includes(me.id)) fail("Join this event first."); event.ready ||= {}; event.ready[me.id] = Boolean(ready); return { saved: true }; });
}
export async function advanceEvents(now = Date.now()) {
  const rooms = await communityTransaction((state) => {
    const pendingRooms = [];
    for (const event of Object.values(state.tournaments || {})) {
      if (!event.automatic || event.status === "finished" || now < event.startsAt || event.members.length < 2) continue;
      const unfinished = event.rounds.flat().filter((pair) => !pair.done && pair.roomId);
      for (const pair of unfinished) if (state.rooms[pair.roomId]) pendingRooms.push(state.rooms[pair.roomId]);
      const finish = (reason) => { event.status = "finished"; event.finishedReason = reason; for (const id of event.members) notify(state, id, `${event.title} finished. View the final standings.`, "/hub"); };
      if (event.format === "arena") {
        if (now >= event.endsAt) { if (!unfinished.length) finish("Arena time limit reached."); continue; }
        const available = standings(event).map((row) => row.id).filter((id) => event.ready?.[id] && !state.matches[id] && !state.players[id]?.suspended && !state.players[id]?.deleted);
        const batch = [];
        while (available.length > 1) { const white = available.shift(); const index = available.findIndex((black) => !blocked(state, white, black)); if (index < 0) continue; const black = available.splice(index, 1)[0]; const room = createMatch(state, white, black, 300, 2, false, { tournamentId: event.id }); batch.push({ white, black, roomId: room.id, done: false }); pendingRooms.push(room); }
        if (batch.length) { event.rounds.push(batch); event.status = "running"; }
      } else {
        if (unfinished.length) continue;
        if (event.rounds.length >= event.totalRounds) { finish("All scheduled rounds completed."); continue; }
        if (event.members.some((id) => state.matches[id] || state.players[id]?.suspended || state.players[id]?.deleted)) continue;
        const result = swissPairings(event, (a, b) => blocked(state, a, b));
        if (!result) { finish("No further non-repeating pairings available."); continue; }
        const pairs = [];
        for (let [white, black] of result.pairs) { if (event.rounds.length % 2) [white, black] = [black, white]; const room = createMatch(state, white, black, 300, 2, false, { tournamentId: event.id }); pairs.push({ white, black, roomId: room.id, done: false }); pendingRooms.push(room); }
        if (result.bye) { event.scores[result.bye] = (event.scores[result.bye] || 0) + 1; pairs.push({ white: result.bye, black: null, bye: true, done: true }); }
        event.rounds.push(pairs); event.status = "running";
      }
    }
    return pendingRooms;
  });
  await Promise.all(rooms.map((room) => insertRoom(room, { ifNotExists: true }))); return { activeRooms: rooms.length };
}
