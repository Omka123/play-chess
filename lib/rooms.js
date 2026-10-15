import { insertRoom, updateRoom } from "./roomStore.js";
import { randomBytes } from "node:crypto";
import { Chess } from "chess.js";
import { archiveRoom } from "./gameHistory.js";

const key = () => randomBytes(24).toString("hex");
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const name = (value, fallback) => typeof value === "string" ? value.trim().slice(0, 30) || fallback : fallback;

export async function createRoom(input, user) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Invalid game settings.");
  const id = randomBytes(12).toString("hex");
  const host = input.color === "b" ? "b" : input.color === "r" ? (Math.random() < .5 ? "w" : "b") : "w";
  const tc = [0, 180, 300, 600].includes(input.tc) ? input.tc : 0;
  const room = { id, invite: key(), tokens: { [host]: key() }, names: { [host]: name(user?.id ? user.name : input.name, "Host") }, host,
    users: user?.id ? { [host]: user.id } : {},
    tc, clocks: { w: tc * 1000, b: tc * 1000 }, moves: [], joined: false, result: null,
    updated: Date.now(), expires: Date.now() + 24 * 60 * 60 * 1000 };
  await insertRoom(room);
  return { id, token: room.tokens[host], invite: room.invite, color: host,
    names: room.names, joined: false, moves: [], tc, clocks: room.clocks, result: null };
}

// Storage owns concurrency; game rules are shared by local and hosted games.
export async function accessRoom(id, token, action, user) {
  if (!/^[a-f0-9]{24}$/.test(id)) fail("Room not found.", 404);
  let completed;
  const response = await updateRoom(id, (room) => {
    if (room.expires < Date.now()) fail("This invite has expired. Create a new game.", 410);
    let color = Object.keys(room.tokens).find((c) => room.tokens[c] === token);
    if (action?.type === "join") {
      if (token !== room.invite) fail("Invalid invite.", 403);
      if (room.joined) fail("This game already has two players.", 409);
      if (user?.id && room.users?.[room.host] === user.id) fail("Use a different account for the second player.", 409);
      color = room.host === "w" ? "b" : "w";
      room.tokens[color] = key();
      room.names[color] = name(user?.id ? user.name : action.name, "Friend");
      if (user?.id) { room.users ||= {}; room.users[color] = user.id; }
      room.joined = true;
      room.updated = Date.now();
    } else if (!color) fail("Invalid player session.", 403);
    if (room.users?.[color] && room.users[color] !== user?.id) fail("Sign in with the account that joined this game.", 403);
    const game = new Chess();
    for (const move of room.moves) game.move(move);
    const now = Date.now();
    let timedOut = false;
    if (room.joined && !room.result && room.tc) {
      const turn = game.turn();
      room.clocks[turn] = Math.max(0, room.clocks[turn] - (now - room.updated));
      if (!room.clocks[turn]) { timedOut = true; room.winner = turn === "w" ? "b" : "w"; room.result = { title: `${room.names[room.winner]} wins`, detail: "Time ran out." }; }
    }
    room.updated = now;
    if (action && action.type !== "join") {
      if (!room.joined || room.result) {
        if (!timedOut) fail("This game is not active.", 409);
      } else {
      if (action.type === "move") {
        if (game.turn() !== color) fail("Wait for your turn.", 409);
        if (action.ply !== room.moves.length) fail("The position changed. Try again.", 409);
        let move;
        try { move = game.move({ from: action.from, to: action.to, promotion: action.promotion || "q" }); }
        catch { fail("That move is not legal."); }
        room.moves.push({ from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}), san: move.san });
        if (game.isGameOver()) room.result = game.isCheckmate()
          ? { title: `${room.names[color]} wins`, detail: "Checkmate." }
          : { title: "Draw", detail: game.isStalemate() ? "Stalemate." : game.isThreefoldRepetition() ? "Threefold repetition." : game.isInsufficientMaterial() ? "Insufficient material." : "Fifty-move rule." };
        if (game.isCheckmate()) room.winner = color;
      } else if (action.type === "resign") {
        room.result = { title: `${room.names[color === "w" ? "b" : "w"]} wins`, detail: `${room.names[color]} resigned.` };
        room.winner = color === "w" ? "b" : "w";
      } else fail("Unknown action.");
      }
    }
    if (room.result) { room.finishedAt ||= now; completed = structuredClone(room); }
    return { id: room.id, color, names: room.names, joined: room.joined, moves: room.moves,
      tc: room.tc, clocks: room.clocks, result: room.result,
      ...(action?.type === "join" ? { token: room.tokens[color] } : {}),
      ...(color === room.host ? { invite: room.invite } : {}) };
  }, { readOnly: !action });
  if (completed) {
    try { await archiveRoom(completed); response.historySaved = true; }
    catch { response.historySaved = false; console.error("Could not archive completed friend game"); }
  }
  return response;
}
