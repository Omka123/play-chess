import { communityTransaction } from "./communityStore.js";
import { createMatch, ensurePlayer, ratingCategory } from "./community.js";
import { insertRoom, updateRoom } from "./roomStore.js";
import { blocked, notify } from "./notifications.js";
import { randomBytes } from "node:crypto";
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
export function standings(event) {
  return event.members.map((id) => ({ id, score: event.scores[id] || 0, withdrawn: Boolean(event.withdrawn?.includes(id)), wins: event.rounds.flat().filter((pair) => pair.done && pair.black && (pair.result === "w" && pair.white === id || pair.result === "b" && pair.black === id)).length, buchholz: event.rounds.flat().filter((pair) => pair.black && pair.result !== "void" && [pair.white, pair.black].includes(id)).reduce((sum, pair) => sum + (event.scores[pair.white === id ? pair.black : pair.white] || 0), 0) })).sort((a, b) => b.score - a.score || (event.tieBreak === "wins" ? b.wins - a.wins : event.tieBreak === "none" ? 0 : b.buchholz - a.buchholz) || a.id.localeCompare(b.id));
}
export function swissPairings(event, prohibited = () => false) {
  const ordered = standings(event).filter((entry) => !entry.withdrawn).map((entry) => entry.id), played = new Set(event.rounds.flat().filter((pair) => pair.black).map((pair) => [pair.white, pair.black].sort().join(":")));
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
    const tc = input.tc === undefined ? 300 : Number(input.tc), increment = input.increment === undefined ? 2 : Number(input.increment), duration = input.duration === undefined ? 60 : Number(input.duration);
    if (![60, 180, 300, 600, 900, 1800].includes(tc) || ![0, 1, 2, 3, 5, 10].includes(increment) || ![15, 30, 60, 90, 120].includes(duration)) fail("Choose a supported clock, increment and duration.");
    const minRating = input.minRating === undefined ? 0 : Number(input.minRating), maxRating = input.maxRating === undefined ? 4000 : Number(input.maxRating);
    if (![minRating, maxRating].every((value) => Number.isInteger(value) && value >= 0 && value <= 4000) || minRating > maxRating) fail("Choose a rating range from 0 to 4000.");
    const category = ratingCategory(tc, increment); if (me.ratings[category] < minRating || me.ratings[category] > maxRating) fail("The organiser must meet the event rating range.");
    const event = { id: randomBytes(12).toString("hex"), title, ownerId: me.id, public: true, clubId: null, startsAt, status: "scheduled", members: [me.id], scores: {}, rounds: [], tc, increment, minRating, maxRating, category, withdrawn: [], tieBreak: ["buchholz", "wins", "none"].includes(input.tieBreak) ? input.tieBreak : "buchholz", format: input.format, automatic: true, totalRounds: [3, 5, 7].includes(Number(input.rounds)) ? Number(input.rounds) : 3, endsAt: startsAt + duration * 60000, ready: { [me.id]: true } };
    notify(state, me.id, `Created ${event.title}. Registration is open.`, "/improve#events");
    state.tournaments[event.id] = event; return { id: event.id };
  });
}
export async function eventReady(user, eventId, ready) {
  return communityTransaction((state) => { const me = ensurePlayer(state, user); const event = /^[a-f0-9]{24}$/.test(eventId || "") && state.tournaments?.[eventId]; if (!event || !event.members.includes(me.id) || event.withdrawn?.includes(me.id) || event.status === "finished") fail("Join an active event first."); event.ready ||= {}; event.ready[me.id] = Boolean(ready); return { saved: true }; });
}
export async function manageEvent(user, input) {
  if (input.type === "recover") {
    const candidates = await communityTransaction((state) => {
      const me = ensurePlayer(state, user), event = /^[a-f0-9]{24}$/.test(input.id || "") && state.tournaments?.[input.id];
      if (!event?.automatic || event.status === "finished" || event.ownerId !== me.id) fail("Only the organiser can recover an active automatic event.", 403);
      return event.rounds.flat().filter((pair) => !pair.done && pair.roomId && (pair.provisioned !== false || (state.rooms[pair.roomId]?.expires || 0) <= Date.now())).map((pair) => pair.roomId);
    });
    const missing = [];
    for (const id of candidates) { try { await updateRoom(id, () => true, { readOnly: true }); } catch (error) { if (error.status === 404) missing.push(id); else throw error; } }
    return communityTransaction((state) => {
      const me = ensurePlayer(state, user), event = state.tournaments[input.id]; if (event?.ownerId !== me.id || event.status === "finished") fail("Event changed. Refresh and try again.");
      let recovered = 0;
      for (const pair of event.rounds.flat()) if (!pair.done && missing.includes(pair.roomId)) {
        pair.done = true; pair.result = "void"; recovered++;
        for (const id of [pair.white, pair.black].filter(Boolean)) {
          if (state.matches[id]?.id === pair.roomId) delete state.matches[id];
          if (state.players[id]?.activeGames) delete state.players[id].activeGames[pair.roomId];
          notify(state, id, `A game in ${event.title} was voided because its stored room is unavailable. No points were awarded.`, "/improve#events");
        }
      }
      return { saved: true, recovered };
    });
  }
  return communityTransaction((state) => {
    const me = ensurePlayer(state, user), event = /^[a-f0-9]{24}$/.test(input.id || "") && state.tournaments?.[input.id];
    if (!event?.automatic || event.status === "finished") fail("Active automatic event not found.", 404);
    if (input.type === "withdraw") {
      if (!event.members.includes(me.id)) fail("Join this event first.");
      if (event.rounds.flat().some((pair) => !pair.done && [pair.white, pair.black].includes(me.id))) fail("Finish or resign your event game before withdrawing.");
      event.withdrawn ||= []; if (!event.withdrawn.includes(me.id)) event.withdrawn.push(me.id); event.ready ||= {}; event.ready[me.id] = false;
      notify(state, me.id, `You withdrew from ${event.title}. Past scores remain in the standings.`, "/improve#events");
    } else {
      if (event.ownerId !== me.id) fail("Only the organiser can manage this event.", 403);
      if (input.type === "cancel") { if (event.rounds.flat().some((pair) => !pair.done)) fail("Finish all event games before ending the event."); event.status = "finished"; event.finishedReason = "Ended by the organiser."; for (const id of event.members) notify(state, id, `${event.title} was ended by the organiser.`, "/improve#events"); }
      else if (input.type !== "recover") fail("Unknown event action.");
    }
    return { saved: true };
  });
}
export async function advanceEvents(now = Date.now()) {
  const rooms = await communityTransaction((state) => {
    const pendingRooms = [];
    for (const event of Object.values(state.tournaments || {})) {
      if (!event.automatic || event.status === "finished" || now < event.startsAt) continue;
      const unfinished = event.rounds.flat().filter((pair) => !pair.done && pair.roomId);
      for (const pair of unfinished) if (pair.provisioned === false && state.rooms[pair.roomId]?.expires > now) pendingRooms.push(state.rooms[pair.roomId]);
      const finish = (reason) => { event.status = "finished"; event.finishedReason = reason; for (const id of event.members) notify(state, id, `${event.title} finished. View the final standings.`, "/hub"); };
      const eligible = event.members.filter((id) => !event.withdrawn?.includes(id) && state.players[id] && !state.players[id].suspended && !state.players[id].deleted);
      if (eligible.length < 2 && !unfinished.length) { if (event.status === "running") finish("Fewer than two active participants remain."); continue; }
      if (event.format === "arena") {
        if (now >= event.endsAt) { if (!unfinished.length) finish("Arena time limit reached."); continue; }
        const available = standings(event).map((row) => row.id).filter((id) => eligible.includes(id) && event.ready?.[id] && !state.matches[id]);
        const batch = [];
        while (available.length > 1) { const white = available.shift(); const index = available.findIndex((black) => !blocked(state, white, black)); if (index < 0) continue; const black = available.splice(index, 1)[0]; const room = createMatch(state, white, black, event.tc, event.increment, false, { tournamentId: event.id }); batch.push({ white, black, roomId: room.id, done: false, provisioned: false }); pendingRooms.push(room); }
        if (batch.length) { if (event.status === "scheduled") for (const id of event.members) notify(state, id, `${event.title} has started. Ready players will be paired.`, "/improve#events"); event.rounds.push(batch); event.status = "running"; }
      } else {
        if (unfinished.length) continue;
        if (event.rounds.length >= event.totalRounds) { finish("All scheduled rounds completed."); continue; }
        if (eligible.some((id) => state.matches[id])) continue;
        const result = swissPairings({ ...event, members: eligible }, (a, b) => blocked(state, a, b));
        if (!result) { finish("No further non-repeating pairings available."); continue; }
        const pairs = [];
        for (let [white, black] of result.pairs) { if (event.rounds.length % 2) [white, black] = [black, white]; const room = createMatch(state, white, black, event.tc, event.increment, false, { tournamentId: event.id }); pairs.push({ white, black, roomId: room.id, done: false, provisioned: false }); pendingRooms.push(room); }
        if (result.bye) { event.scores[result.bye] = (event.scores[result.bye] || 0) + 1; pairs.push({ white: result.bye, black: null, bye: true, done: true }); notify(state, result.bye, `${event.title}: you receive a one-point bye this round.`, "/improve#events"); }
        event.rounds.push(pairs); event.status = "running";
        for (const id of eligible) notify(state, id, `${event.title}: round ${event.rounds.length} is ready.`, "/improve#events");
      }
    }
    return pendingRooms;
  });
  await Promise.all(rooms.map((room) => insertRoom(room, { ifNotExists: true })));
  if (rooms.length) await communityTransaction((state) => { const ids = new Set(rooms.map((room) => room.id)); for (const event of Object.values(state.tournaments || {})) for (const pair of event.rounds.flat()) if (ids.has(pair.roomId)) pair.provisioned = true; });
  return { activeRooms: rooms.length };
}
