import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { Chess } from "chess.js";

const directory = path.join(process.cwd(), ".gambit-rooms");
const queues = new Map();
const key = () => randomBytes(24).toString("hex");
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const name = (value, fallback) => typeof value === "string" ? value.trim().slice(0, 30) || fallback : fallback;

export async function createRoom(input) {
  const id = randomBytes(12).toString("hex");
  const host = input.color === "b" ? "b" : input.color === "r" ? (Math.random() < .5 ? "w" : "b") : "w";
  const tc = [0, 180, 300, 600].includes(input.tc) ? input.tc : 0;
  const room = { id, invite: key(), tokens: { [host]: key() }, names: { [host]: name(input.name, "Host") }, host,
    tc, clocks: { w: tc * 1000, b: tc * 1000 }, moves: [], joined: false, result: null,
    updated: Date.now(), expires: Date.now() + 24 * 60 * 60 * 1000 };
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, `${id}.json`), JSON.stringify(room), { flag: "wx" });
  return { id, token: room.tokens[host], invite: room.invite };
}

// Serialize reads and moves so polling cannot overwrite a submitted move.
export async function accessRoom(id, token, action) {
  if (!/^[a-f0-9]{24}$/.test(id)) fail("Room not found.", 404);
  const previous = queues.get(id) || Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    const file = path.join(directory, `${id}.json`);
    let room;
    try { room = JSON.parse(await fs.readFile(file, "utf8")); }
    catch (error) { if (error.code === "ENOENT") fail("Room not found.", 404); throw error; }
    if (room.expires < Date.now()) fail("This invite has expired. Create a new game.", 410);
    let color = Object.keys(room.tokens).find((c) => room.tokens[c] === token);
    if (action?.type === "join") {
      if (token !== room.invite) fail("Invalid invite.", 403);
      if (room.joined) fail("This game already has two players.", 409);
      color = room.host === "w" ? "b" : "w";
      room.tokens[color] = key();
      room.names[color] = name(action.name, "Friend");
      room.joined = true;
      room.updated = Date.now();
    } else if (!color) fail("Invalid player session.", 403);
    const game = new Chess();
    for (const move of room.moves) game.move(move);
    const now = Date.now();
    if (room.joined && !room.result && room.tc) {
      const turn = game.turn();
      room.clocks[turn] = Math.max(0, room.clocks[turn] - (now - room.updated));
      if (!room.clocks[turn]) room.result = { title: `${room.names[turn === "w" ? "b" : "w"]} wins`, detail: "Time ran out." };
    }
    room.updated = now;
    if (action && action.type !== "join") {
      if (!room.joined || room.result) fail("This game is not active.", 409);
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
      } else if (action.type === "resign") {
        room.result = { title: `${room.names[color === "w" ? "b" : "w"]} wins`, detail: `${room.names[color]} resigned.` };
      } else fail("Unknown action.");
    }
    await fs.writeFile(file, JSON.stringify(room));
    return { id: room.id, color, names: room.names, joined: room.joined, moves: room.moves,
      tc: room.tc, clocks: room.clocks, result: room.result,
      ...(action?.type === "join" ? { token: room.tokens[color] } : {}),
      ...(color === room.host ? { invite: room.invite } : {}) };
  });
  queues.set(id, task);
  try { return await task; } finally { if (queues.get(id) === task) queues.delete(id); }
}
