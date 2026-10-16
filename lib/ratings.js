export const INITIAL_RATING = 200;
export function eloChange(white, black, score) {
  const expected = 1 / (1 + 10 ** ((black - white) / 400));
  // Keep ratings nonnegative while preserving equal and opposite changes.
  return Math.max(-white, Math.min(black, Math.round(32 * (score - expected)))) || 0;
}
