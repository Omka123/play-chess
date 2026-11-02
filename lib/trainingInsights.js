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
    history: practiceHistory(profile, now),
    themes: Object.values(themes).map((row) => ({ ...row, accuracy: Math.round(row.correct / row.attempts * 100), averageMs: row.timed ? Math.round(row.durationMs / row.timed) : null })).sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts),
    due: mistakes.filter((entry) => !entry.dueAt || entry.dueAt <= now).length,
    scheduled: mistakes.length,
    retained: mistakes.filter((entry) => entry.stage >= 2).length,
    days: Object.entries(profile.dailyTraining || {}).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, entry]) => ({ date, solved: entry.puzzles?.length || 0 })),
  };
}
export function practiceHistory(profile = {}, now = Date.now()) {
  const day = 86400000, start = Math.floor(now / day) * day;
  const rows = Array.from({ length: 28 }, (_, index) => ({ date: new Date(start - (27 - index) * day).toISOString().slice(0, 10), attempts: 0, correct: 0, first: 0, hinted: 0, revisions: 0 }));
  const byDate = Object.fromEntries(rows.map((row) => [row.date, row]));
  for (const attempt of profile.academyHistory || []) {
    if (!Number.isFinite(attempt.at) || attempt.at > now) continue;
    const row = byDate[new Date(attempt.at).toISOString().slice(0, 10)]; if (!row) continue;
    row.attempts++; row.correct += Boolean(attempt.correct); row.first += Boolean(attempt.first); row.hinted += Boolean(attempt.hinted);
  }
  for (const revision of profile.revisionHistory || []) { if (!Number.isFinite(revision.at) || revision.at > now) continue; const row = byDate[new Date(revision.at).toISOString().slice(0, 10)]; if (row) row.revisions++; }
  const summarize = (entries) => { const attempts = entries.reduce((n, row) => n + row.attempts, 0), correct = entries.reduce((n, row) => n + row.correct, 0); return { attempts, correct, success: attempts ? Math.round(correct / attempts * 100) : null }; };
  return { days: rows.slice(-14), previous: summarize(rows.slice(0, 14)), recent: summarize(rows.slice(14)) };
}
