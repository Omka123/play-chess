import { formatReviewScore, reviewLine } from "@/lib/reviewFeedback";
import { explainMove } from "@/lib/moveExplanation";
import { uciMove } from "@/lib/stockfish";
export default function AnalysisCandidates({ fen, analysis, onMove }) {
  if (!analysis?.candidates?.length) return null;
  return <section className="card"><h2>Candidate moves</h2>{analysis.candidates.map((candidate, index) => <article key={candidate.pv[0]}><h3><button className="btn" onClick={() => { const move = uciMove(candidate.pv[0]); onMove(move.from, move.to, move.promotion); }}>{index + 1}. {reviewLine(fen, candidate.pv)[0]}</button> {formatReviewScore(candidate.score, fen.split(" ")[1])}</h3><p>{reviewLine(fen, candidate.pv).join(" ")}</p><p>{explainMove(fen, uciMove(candidate.pv[0]))}</p></article>)}</section>;
}
