export const reconnectDelay = (failures) => Math.min(10000, 1000 * 2 ** Math.max(0, Math.min(4, failures - 1)));
export function displayedRoomClock(room, side, now) {
  const stored = Number(room?.clocks?.[side]);
  if (!Number.isFinite(stored)) return 0;
  const turn = room.serverTurn || (room.moves.length % 2 ? "b" : "w");
  const ticking = room.joined && !room.result && room.tc && !room.dailyDays && turn === side && Number.isFinite(room.receivedAt);
  return Math.max(0, stored - (ticking ? Math.max(0, now - room.receivedAt) : 0));
}
