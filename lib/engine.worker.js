// Runs the bot search off the main thread so the UI never freezes.
import { chooseMove } from "./engine";

self.onmessage = (e) => {
  const { id, fen, bot } = e.data;
  const m = chooseMove(fen, bot);
  self.postMessage({ id, move: m ? { from: m.from, to: m.to, promotion: m.promotion } : null });
};
