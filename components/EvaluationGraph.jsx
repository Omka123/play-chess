export default function EvaluationGraph({ evaluations, onGoto }) {
  if (!evaluations?.length) return null;
  const points = evaluations.map((entry, i) => `${10 + i * 580 / Math.max(1, evaluations.length - 1)},${80 - Math.tanh(entry.score / 500) * 65}`).join(" ");
  return <section className="evaluation-graph"><h3>Game evaluation</h3><svg viewBox="0 0 600 160" role="img" aria-label="Evaluation for White over the game"><line x1="10" y1="80" x2="590" y2="80" stroke="currentColor" opacity=".25" /><polyline fill="none" stroke="var(--accent)" strokeWidth="3" points={points} /></svg><p className="sub">Above the middle favours White. Mate scores reach the graph edge. Engine estimates at the review depth.</p><label>Go to evaluated move<select defaultValue="" onChange={(event) => onGoto(Number(event.target.value))}><option value="" disabled>Select a move</option>{evaluations.map((entry) => <option key={entry.ply} value={entry.ply}>Ply {entry.ply}</option>)}</select></label></section>;
}
