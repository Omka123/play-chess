import { Chess } from "chess.js";
import { roomPage, updateRoom } from "./roomStore.js";
import { archiveRoom } from "./gameHistory.js";
import { recordEventResult } from "./platform.js";
import { advanceEvents } from "./events.js";

export function settleExpiredClock(room, now = Date.now()) {
  if (!room.joined || room.result) return false;
  const game = new Chess();
  for (const move of room.moves) game.move(move);
  const turn = game.turn();
  const daily = Boolean(room.dailyDays && Number.isFinite(room.moveDeadline) && now >= room.moveDeadline);
  const remaining = room.tc ? Math.max(0, room.clocks[turn] - Math.max(0, now - room.updated)) : null;
  if (!daily && remaining !== 0) return false;
  if (room.tc) room.clocks[turn] = remaining;
  room.winner = turn === "w" ? "b" : "w";
  room.result = { title: `${room.names[room.winner]} wins`, detail: daily ? "Daily move deadline passed." : "Time ran out." };
  room.finishedAt ||= now;
  room.updated = now;
  return true;
}

export async function runMaintenance({ cursor = "0", limit = 100 } = {}) {
  const page = await roomPage(cursor, limit);
  let settled = 0, archived = 0, failed = 0;
  for (const id of page.ids) {
    try {
      // Side effects happen after CAS; duplicate scans safely retry idempotent archiving.
      const room = await updateRoom(id, (current) => {
        const changed = settleExpiredClock(current);
        return { changed, completed: current.result && !current.maintenanceArchived ? structuredClone(current) : null };
      }, { readOnly: true, persistResult: true });
      if (room.changed) settled++;
      if (room.completed) {
        await archiveRoom(room.completed);
        await recordEventResult(room.completed);
        await updateRoom(id, (current) => { if (current.result) current.maintenanceArchived = true; });
        archived++;
      }
    } catch (error) { if (error.status !== 404) failed++; }
  }
  await advanceEvents();
  return { cursor: page.cursor, scanned: page.ids.length, settled, archived, failed };
}
