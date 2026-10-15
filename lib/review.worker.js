import { Chess } from "chess.js";
import { reviewPosition } from "./review.js";

self.onmessage = ({ data: { moves, color } }) => {
  try {
    const game = new Chess();
    const findings = [];
    for (let index = 0; index < moves.length; index++) {
      if (game.turn() === color) {
        const entry = reviewPosition(game.fen(), moves[index]);
        if (entry.label !== "Good") findings.push({ ...entry, ply: index + 1 });
      }
      game.move(moves[index]);
      self.postMessage({ progress: index + 1, total: moves.length });
    }
    self.postMessage({ findings, done: true });
  } catch { self.postMessage({ error: "This game could not be reviewed. Please try again." }); }
};
