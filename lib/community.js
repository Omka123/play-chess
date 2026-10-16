import { randomBytes } from "node:crypto";
import { communityTransaction } from "./communityStore.js";
import { insertRoom } from "./roomStore.js";
import { checkActive, isModerator } from "./moderation.js";
import { INITIAL_RATING, eloChange } from "./ratings.js";
import { notify, blocked } from "./notifications.js";

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const token = () => randomBytes(24).toString("hex");
export const ratingCategory = (seconds, increment = 0) => seconds + 40 * increment < 180 ? "bullet" : seconds + 40 * increment < 600 ? "blitz" : "rapid";
export const dayKey = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
const yesterday = () => dayKey(Date.now() - 86400000);

export function ensurePlayer(state, user, { allowSuspended = false } = {}) {
  if (!user?.id) fail("Sign in to continue.", 401);
  if (state.players[user.id]?.deleted) fail("This account was deleted. Contact the operator if you need assistance.", 403);
  if (!state.players[user.id]) state.players[user.id] = {
    id: user.id, username: `player_${user.id.slice(0, 10)}`, name: (user.name || "Chess player").slice(0, 30), avatar: "knight",
    ratings: { bullet: INITIAL_RATING, blitz: INITIAL_RATING, rapid: INITIAL_RATING }, initialRating: INITIAL_RATING, ratingHistory: [], ratedCount: 0,
    friends: [], requests: [], puzzles: {}, streak: 0, lastPuzzleDay: null, lastSeen: 0,
  };
  const player = state.players[user.id];
  // Upgrade untouched accounts from the previous default without resetting
  // anyone's earned ratings or historical results.
  if (player.initialRating === undefined && player.ratedCount === 0 && !player.ratingHistory.length && Object.values(player.ratings).every((rating) => rating === 1200)) {
    player.ratings = { bullet: INITIAL_RATING, blitz: INITIAL_RATING, rapid: INITIAL_RATING };
    player.initialRating = INITIAL_RATING;
  }
  if (typeof user.email === "string") player.staff = isModerator(user);
  if (!allowSuspended) checkActive(player);
  return player;
}
const publicPlayer = (player) => ({ id: player.id, username: player.username, name: player.name, avatar: player.avatar,
  ratings: player.ratings, ratedCount: player.ratedCount, online: !player.suspended && Date.now() - player.lastSeen < 45000 });

export async function registerPlayer(user) {
  return communityTransaction((state) => structuredClone(ensurePlayer(state, user, { allowSuspended: true })));
}

export function createMatch(state, white, black, tc, increment, rated, options = {}) {
  const id = randomBytes(12).toString("hex");
  const room = { id, invite: token(), tokens: { w: token(), b: token() },
    names: { w: state.players[white].name, b: state.players[black].name }, users: { w: white, b: black }, host: "w",
    tc, increment, rated, clocks: { w: tc * 1000, b: tc * 1000 }, moves: [], joined: true, result: null,
    playerRatings: { w: state.players[white].ratings[ratingCategory(tc, increment)], b: state.players[black].ratings[ratingCategory(tc, increment)] },
    updated: Date.now(), expires: Date.now() + 86400000, ...options };
  state.rooms[id] = room;
  state.matches[white] = { id, token: room.tokens.w };
  state.matches[black] = { id, token: room.tokens.b };
  for (const [side, userId] of [["w", white], ["b", black]]) {
    state.players[userId].activeGames ||= {};
    state.players[userId].activeGames[id] = { id, token: room.tokens[side], expires: room.expires, opponent: room.names[side === "w" ? "b" : "w"], daily: Boolean(room.dailyDays) };
    notify(state, userId, `Your game against ${room.names[side === "w" ? "b" : "w"]} is ready.`);
  }
  delete state.queue[white]; delete state.queue[black];
  return room;
}

function clean(state) {
  const now = Date.now();
  for (const [id, ticket] of Object.entries(state.queue)) if (now - ticket.at > 30000) delete state.queue[id];
  for (const [id, room] of Object.entries(state.rooms)) if (room.expires < now) {
    for (const userId of Object.values(room.users)) if (state.matches[userId]?.id === id) delete state.matches[userId];
    delete state.rooms[id];
  }
  for (const [id, challenge] of Object.entries(state.challenges)) if (challenge.expires < now) delete state.challenges[id];
}

export async function socialAction(user, action = { type: "status" }) {
  const data = await communityTransaction((state) => {
    clean(state);
    const me = ensurePlayer(state, user, { allowSuspended: action.type === "status" });
    me.lastSeen = Date.now();
    if (action.type === "profile") {
      const username = String(action.username || "").trim().toLowerCase();
      if (!/^[a-z][a-z0-9_]{2,19}$/.test(username)) fail("Username must be 3–20 letters, numbers or underscores, starting with a letter.");
      if (Object.values(state.players).some((player) => player.id !== me.id && player.username === username)) fail("This username is taken.", 409);
      const name = String(action.name || "").trim();
      if (!name || name.length > 30) fail("Enter a display name of 1–30 characters.");
      if (!["knight", "king", "queen", "rook", "bishop", "pawn"].includes(action.avatar)) fail("Choose an avatar.");
      me.username = username; me.name = name; me.avatar = action.avatar;
    } else if (action.type === "request") {
      const target = Object.values(state.players).find((player) => player.username === String(action.username || "").trim().toLowerCase());
      if (!target || target.deleted || target.suspended || target.id === me.id || blocked(state, me.id, target.id)) fail("Player not found or unavailable. Ask your friend for their username.", 404);
      if (me.friends.includes(target.id)) fail("You are already friends.");
      if (target.requests.length >= 100) fail("That player has too many pending requests.");
      if (!target.requests.includes(me.id)) { target.requests.push(me.id); notify(state, target.id, `${me.name} sent you a friend request.`, "/account"); }
    } else if (action.type === "accept" || action.type === "decline") {
      if (!me.requests.includes(action.userId)) fail("Friend request not found.", 404);
      me.requests = me.requests.filter((id) => id !== action.userId);
      if (action.type === "accept") {
        if (blocked(state, me.id, action.userId)) fail("Player unavailable.", 403);
        checkActive(state.players[action.userId]);
        if (!me.friends.includes(action.userId)) me.friends.push(action.userId);
        const other = state.players[action.userId];
        if (!other.friends.includes(me.id)) other.friends.push(me.id);
      }
    } else if (action.type === "remove") {
      me.friends = me.friends.filter((id) => id !== action.userId);
      const other = state.players[action.userId];
      if (other) other.friends = other.friends.filter((id) => id !== me.id);
    } else if (action.type === "challenge") {
      if (blocked(state, me.id, action.userId)) fail("This player is unavailable.", 403);
      checkActive(state.players[action.userId]);
      if (!me.friends.includes(action.userId)) fail("Add this player as a friend first.", 403);
      if (state.matches[me.id] || state.matches[action.userId]) fail("A player already has an active game.", 409);
      if (Object.values(state.challenges).some((entry) => entry.from === me.id && entry.to === action.userId)) fail("A challenge is already waiting.");
      if (Object.values(state.challenges).filter((entry) => entry.from === me.id).length >= 10) fail("Wait for your pending challenges to finish.");
      const id = randomBytes(12).toString("hex");
      state.challenges[id] = { id, from: me.id, to: action.userId, expires: Date.now() + 120000 };
      notify(state, action.userId, `${me.name} challenged you to a game.`, "/account");
    } else if (action.type === "acceptChallenge" || action.type === "declineChallenge") {
      const challenge = state.challenges[action.id];
      if (!challenge || challenge.to !== me.id) fail("Challenge not found or expired.", 404);
      if (action.type === "acceptChallenge") {
        if (blocked(state, me.id, challenge.from)) fail("Player unavailable.", 403);
        checkActive(state.players[challenge.from]);
        if (state.matches[me.id] || state.matches[challenge.from]) fail("A player already has an active game.", 409);
        createMatch(state, challenge.from, me.id, 300, 0, false);
      }
      delete state.challenges[action.id];
    } else if (action.type !== "status") fail("Unknown action.");
    const active = state.matches[me.id];
    return { profile: structuredClone(me), friends: me.friends.map((id) => publicPlayer(state.players[id])),
      requests: me.requests.map((id) => publicPlayer(state.players[id])),
      challenges: Object.values(state.challenges).filter((entry) => entry.to === me.id).map((entry) => ({ ...entry, player: publicPlayer(state.players[entry.from]) })),
      active: active || null, room: active ? state.rooms[active.id] : null };
  });
  if (data.room) await insertRoom(data.room, { ifNotExists: true });
  delete data.room;
  return data;
}

export async function matchmaking(user, { type = "join", tc = 300, increment = 0 } = {}) {
  if (![60, 180, 300, 600].includes(tc) || ![0, 2, 5].includes(increment)) fail("Choose a supported clock.");
  const result = await communityTransaction((state) => {
    clean(state);
    const me = ensurePlayer(state, user);
    me.lastSeen = Date.now();
    const active = state.matches[me.id];
    if (active) return { session: active, room: state.rooms[active.id] };
    if (type === "cancel") { delete state.queue[me.id]; return { waiting: false }; }
    if (type !== "join") fail("Unknown matchmaking action.");
    const category = ratingCategory(tc, increment);
    const startedAt = state.queue[me.id]?.tc === tc && state.queue[me.id]?.increment === increment ? state.queue[me.id].startedAt || Date.now() : Date.now();
    const range = Math.min(1000, 100 + Math.floor((Date.now() - startedAt) / 15000) * 50);
    const opponent = Object.entries(state.queue).filter(([id, ticket]) => id !== me.id && !state.players[id]?.suspended && !state.players[id]?.deleted && !blocked(state, me.id, id) && ticket.tc === tc && ticket.increment === increment && !state.matches[id]
      && Math.abs(state.players[id].ratings[category] - me.ratings[category]) <= Math.min(range, Math.min(1000, 100 + Math.floor((Date.now() - (ticket.startedAt || ticket.at)) / 15000) * 50)))
      .sort(([a], [b]) => Math.abs(state.players[a].ratings[category] - me.ratings[category]) - Math.abs(state.players[b].ratings[category] - me.ratings[category]))[0];
    if (opponent) {
      const white = Math.random() < .5 ? me.id : opponent[0];
      const black = white === me.id ? opponent[0] : me.id;
      const room = createMatch(state, white, black, tc, increment, true);
      return { session: state.matches[me.id], room };
    }
    state.queue[me.id] = { tc, increment, at: Date.now(), startedAt };
    return { waiting: true, ratingRange: range, waitedSeconds: Math.floor((Date.now() - startedAt) / 1000), queuedPlayers: Object.values(state.queue).filter((ticket) => ticket.tc === tc && ticket.increment === increment).length };
  });
  if (result.room) await insertRoom(result.room, { ifNotExists: true });
  delete result.room;
  return result;
}

export async function settleRatedGame(room) {
  // Only server-created matchmaking rooms can be rated.
  if (!room.result || !Object.keys(room.users || {}).length) return;
  return communityTransaction((state) => {
    for (const id of Object.values(room.users || {})) if (state.players[id]?.activeGames) delete state.players[id].activeGames[room.id];
    for (const id of Object.values(room.users || {})) if (state.matches[id]?.id === room.id) delete state.matches[id];
    const original = state.rooms[room.id];
    if (state.ratedGames[room.id]) return state.ratedGames[room.id];
    if (!room.rated || !original?.rated) return;
    if (original.users.w !== room.users.w || original.users.b !== room.users.b || room.users.w === room.users.b) fail("Invalid rated participants.");
    const white = state.players[room.users.w], black = state.players[room.users.b];
    const category = ratingCategory(room.tc, room.increment);
    const before = { w: white.ratings[category], b: black.ratings[category] };
    const score = room.winner === "w" ? 1 : room.winner === "b" ? 0 : .5;
    const delta = eloChange(before.w, before.b, score);
    white.ratings[category] += delta; black.ratings[category] -= delta;
    for (const [color, player] of [["w", white], ["b", black]]) {
      player.ratedCount++;
      player.ratingHistory.push({ gameId: room.id, category, rating: player.ratings[category], change: color === "w" ? delta : -delta, at: room.finishedAt });
      player.ratingHistory = player.ratingHistory.slice(-100);
    }
    state.ratedGames[room.id] = { category, before, after: { w: white.ratings[category], b: black.ratings[category] } };
    for (const [side, player] of [["w", white], ["b", black]]) notify(state, player.id, `${room.winner ? room.winner === side ? "You won" : "You lost" : "Draw"}: ${category} rating ${player.ratings[category]} (${side === "w" ? delta >= 0 ? "+" : "" : -delta >= 0 ? "+" : ""}${side === "w" ? delta : -delta}).`, "/account");
    return state.ratedGames[room.id];
  });
}

export async function savePuzzle(user, puzzleId, move, day) {
  const { PUZZLES } = await import("./puzzles.js");
  const { Chess } = await import("chess.js");
  const puzzle = PUZZLES[puzzleId];
  if (!Number.isInteger(puzzleId) || !puzzle) fail("Puzzle not found.", 404);
  const game = new Chess(puzzle.fen);
  try { game.move(move); } catch { fail("Invalid puzzle move."); }
  if (!game.isCheckmate()) fail("Solve the puzzle before saving it.");
  return communityTransaction((state) => {
    const me = ensurePlayer(state, user);
    me.puzzles[puzzleId] = true;
    if (day === dayKey() && puzzleId === Math.floor(Date.now() / 86400000) % PUZZLES.length && me.lastPuzzleDay !== day) {
      me.streak = me.lastPuzzleDay === yesterday() ? me.streak + 1 : 1;
      me.lastPuzzleDay = day;
    }
    return { solved: Object.keys(me.puzzles).map(Number), streak: me.lastPuzzleDay === dayKey() || me.lastPuzzleDay === yesterday() ? me.streak : 0 };
  });
}
