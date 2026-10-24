export function trainingInsights(profile = {}, now = Date.now()) {
  const themes = {};
  for (const attempt of Object.values(profile.academyAttempts || {})) {
    const name = attempt.theme || "Other";
    const row = themes[name] ||= { theme: name, attempts: 0, correct: 0, hinted: 0, timed: 0, durationMs: 0 };
    row.attempts++; row.correct += attempt.correct ? 1 : 0; row.hinted += attempt.hinted ? 1 : 0;
    if (Number.isFinite(attempt.durationMs)) { row.timed++; row.durationMs += attempt.durationMs; }
  }
  const mistakes = profile.mistakes || [];
  return {
    themes: Object.values(themes).map((row) => ({ ...row, accuracy: Math.round(row.correct / row.attempts * 100), averageMs: row.timed ? Math.round(row.durationMs / row.timed) : null })).sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts),
    due: mistakes.filter((entry) => !entry.dueAt || entry.dueAt <= now).length,
    scheduled: mistakes.length,
    retained: mistakes.filter((entry) => entry.stage >= 2).length,
    days: Object.entries(profile.dailyTraining || {}).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, entry]) => ({ date, solved: entry.puzzles?.length || 0 })),
  };
}
