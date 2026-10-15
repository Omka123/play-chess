const validTime = (value) => [0, 60, 180, 300, 600].includes(value) ? value : 0;
export function clockAfterMove(play, color) {
  const tc = validTime(play.tc);
  if (!tc) return play.clocks;
  const remaining = Number.isFinite(play.clocks[color]) ? play.clocks[color] : tc * 1000;
  const increment = [0, 2, 5].includes(play.increment) ? play.increment : 0;
  return { ...play.clocks, [color]: remaining + increment * 1000 };
}
export function tickPlayClock(play, elapsed) {
  if (!validTime(play.tc) || !Number.isFinite(elapsed) || elapsed < 0) return null;
  const turn = play.moves.length % 2 === 0 ? "w" : "b";
  // Old development state or malformed saved preferences must not turn NaN
  // into a timeout: only a finite clock that reaches zero may end a game.
  const current = play.clocks[turn];
  if (!Number.isFinite(current)) return { clocks: { ...play.clocks, [turn]: play.tc * 1000 }, expired: false, turn };
  const remaining = Math.max(0, current - elapsed);
  return { clocks: { ...play.clocks, [turn]: remaining }, expired: remaining === 0, turn };
}
