const OPENINGS = [
  ["Sicilian Defence", ["e4", "c5"]], ["French Defence", ["e4", "e6"]], ["Caro-Kann Defence", ["e4", "c6"]],
  ["Ruy Lopez", ["e4", "e5", "Nf3", "Nc6", "Bb5"]], ["Italian Game", ["e4", "e5", "Nf3", "Nc6", "Bc4"]],
  ["Queen's Gambit", ["d4", "d5", "c4"]], ["London System", ["d4", "d5", "Bf4"]], ["English Opening", ["c4"]], ["Reti Opening", ["Nf3"]],
  ["King's Pawn", ["e4"]], ["Queen's Pawn", ["d4"]],
];
export function openingName(moves) {
  return [...OPENINGS].sort((a, b) => b[1].length - a[1].length).find(([, line]) => line.every((san, index) => moves[index]?.san === san))?.[0] || "Other opening";
}
export function filterGames(games, { mode = "all", outcome = "all", color = "all", query = "", after = "", before = "" } = {}) {
  return games.filter((game) => (mode === "all" || game.mode === mode) && (outcome === "all" || game.outcome === outcome) && (color === "all" || game.color === color)
    && (!query || `${game.names[game.color === "w" ? "b" : "w"]} ${openingName(game.moves)}`.toLowerCase().includes(query.trim().toLowerCase()))
    && (!after || game.finishedAt >= Date.parse(`${after}T00:00:00Z`)) && (!before || game.finishedAt < Date.parse(`${before}T00:00:00Z`) + 86400000));
}
export function colorStats(games, color) {
  const entries = games.filter((game) => game.color === color), wins = entries.filter((game) => game.outcome === "win").length;
  return { total: entries.length, wins, winRate: entries.length ? Math.round(100 * wins / entries.length) : 0 };
}
