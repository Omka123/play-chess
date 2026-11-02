export const BOT_SPEEDS = { fast: "Quick", normal: "Natural", relaxed: "Relaxed" };
export const BOT_STYLES = { balanced: "Balanced", aggressive: "Attacking", solid: "Development first" };
export function thinkingDelay(speed = "normal", random = Math.random()) {
  const [base, variation] = speed === "fast" ? [350, 200] : speed === "relaxed" ? [2600, 600] : [1400, 600];
  return base + Math.max(0, Math.min(1, random)) * variation;
}
export function styleBonus(move, style) {
  if (style === "aggressive") return (move.captured ? 6 : 0) + (move.san?.includes("+") ? 6 : 0);
  if (style === "solid") return move.flags?.match(/[kq]/) ? 8 : move.piece === "k" ? -6 : ["n", "b"].includes(move.piece) && !move.captured ? 4 : 0;
  return 0;
}
