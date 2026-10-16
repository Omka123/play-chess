import { formatMoveTime, validMoveTime } from "@/lib/moveTiming";
export default function MoveNotation({ move }) {
  return <span className="move-notation"><span>{move.san}</span><small className="move-time" title={validMoveTime(move.timeSpentMs) ? `Time spent: ${formatMoveTime(move.timeSpentMs)}` : "Time was not recorded for this move"} aria-label={validMoveTime(move.timeSpentMs) ? `Time spent ${formatMoveTime(move.timeSpentMs)}` : "Time not recorded"}>{formatMoveTime(move.timeSpentMs)}</small></span>;
}
