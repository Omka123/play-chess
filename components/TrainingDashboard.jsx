"use client";
import { trainingInsights } from "@/lib/trainingInsights";
export default function TrainingDashboard({ profile }) {
  const stats = trainingInsights(profile);
  return <section><h2>Your training insights</h2><p>Latest saved attempt per puzzle, including retries. These are practice results, not a calibrated skill assessment.</p>
    <p>{stats.due} revisions due · {stats.scheduled} saved positions · {stats.retained} positions reached the 7-day or 30-day stage.</p>
    {!stats.themes.length ? <p>Solve tactics to see your theme breakdown.</p> : <div style={{ overflowX: "auto" }}><table><caption>Themes ordered by lowest success rate</caption><thead><tr><th>Theme</th><th>Solved / attempted</th><th>Success</th><th>Hints</th><th>Average time</th></tr></thead><tbody>{stats.themes.map((row) => <tr key={row.theme}><th scope="row">{row.theme}</th><td>{row.correct}/{row.attempts}</td><td>{row.accuracy}%</td><td>{row.hinted}</td><td>{row.averageMs === null ? "—" : `${Math.round(row.averageMs / 1000)}s`}</td></tr>)}</tbody></table></div>}
    <h3>Recent saved daily progress</h3><p>Different puzzles solved per UTC day. Days without saved activity are omitted.</p><ul>{stats.days.map((day) => <li key={day.date}>{day.date}: {day.solved} solved</li>)}</ul>
    <h3>Attempt history</h3><p>History is recorded from this update onward, up to 1,000 attempts and 500 revisions. Retries, hints and difficulty choices affect success rates; this is not a calibrated skill rating.</p><p>Last 14 days: {stats.history.recent.correct}/{stats.history.recent.attempts} correct ({stats.history.recent.success ?? '?'}%). Previous 14 days: {stats.history.previous.correct}/{stats.history.previous.attempts} ({stats.history.previous.success ?? '?'}%).</p><div style={{overflowX:'auto'}}><table><caption>Last fourteen UTC days</caption><thead><tr><th>Date</th><th>Attempts</th><th>Correct</th><th>First attempts</th><th>Hints</th><th>Revisions</th></tr></thead><tbody>{stats.history.days.map(row=><tr key={row.date}><th scope="row">{row.date}</th><td>{row.attempts}</td><td>{row.correct}</td><td>{row.first}</td><td>{row.hinted}</td><td>{row.revisions}</td></tr>)}</tbody></table></div>
  </section>;
}
