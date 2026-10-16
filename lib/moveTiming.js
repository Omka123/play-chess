const MAX_TIME = 366 * 86400000;
export function validMoveTime(value) {
  return Number.isFinite(value) && value >= 0 && value <= MAX_TIME;
}
export function elapsedMoveTime(start, end) {
  const elapsed = end - start;
  return Number.isFinite(start) && Number.isFinite(end) && validMoveTime(elapsed) ? Math.round(elapsed) : null;
}
export function formatMoveTime(value) {
  if (!validMoveTime(value)) return "—";
  if (value < 60000) return `${(value / 1000).toFixed(value < 10000 ? 1 : 0)}s`;
  const seconds = Math.floor(value / 1000), minutes = Math.floor(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}` : `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
