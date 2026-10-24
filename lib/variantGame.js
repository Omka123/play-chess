import { Chess as RulesChess, KingOfTheHill, ThreeCheck } from "chessops/variant";
import { parseFen, makeFen } from "chessops/fen";
import { parseSquare, makeSquare, roleToChar, charToRole } from "chessops/util";
import { makeSan, parseSan } from "chessops/san";
const colors = { white: "w", black: "b" };
export const VARIANTS = { chess960: "Chess960", kingofthehill: "King of the Hill", threecheck: "Three-check" };
export function chess960Fen(index = 0) {
  if (!Number.isInteger(index) || index < 0 || index > 959) throw new Error("Choose a position from 0 to 959.");
  let count = 0;
  for (const bishopA of [0, 2, 4, 6]) for (const bishopB of [1, 3, 5, 7]) {
    const empty = Array.from({ length: 8 }, (_, i) => i).filter((i) => i !== bishopA && i !== bishopB);
    for (const queen of empty) { const five = empty.filter((i) => i !== queen);
      for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) {
        if (count++ !== index) continue;
        const rank = Array(8); rank[bishopA] = rank[bishopB] = "b"; rank[queen] = "q"; rank[five[a]] = rank[five[b]] = "n";
        const [left, king, right] = five.filter((_, i) => i !== a && i !== b); rank[left] = rank[right] = "r"; rank[king] = "k";
        const back = rank.join(""); const rights = "ABCDEFGH"[right] + "ABCDEFGH"[left];
        return `${back}/pppppppp/8/8/8/8/PPPPPPPP/${back.toUpperCase()} w ${rights}${rights.toLowerCase()} - 0 1`;
      }
    }
  }
}
export class VariantGame {
  constructor(variant = "chess960", index = 0, position, history = [], seen = []) {
    if (!VARIANTS[variant]) throw new Error("Unsupported variant."); this.variant = variant; this.index = index;
    this.position = position || (variant === "chess960" ? RulesChess.fromSetup(parseFen(chess960Fen(index)).unwrap()).unwrap() : variant === "kingofthehill" ? KingOfTheHill.default() : ThreeCheck.default());
    this.played = history; this.seen = seen.length ? seen : [this.key()];
  }
  clone() { return new VariantGame(this.variant, this.index, this.position.clone(), [...this.played], [...this.seen]); }
  key() { return this.fen().split(" ").slice(0, 4).join(" ") + JSON.stringify(this.position.remainingChecks); }
  fen() { return makeFen(this.position.toSetup()); }
  turn() { return colors[this.position.turn]; }
  board() { return Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => this.get("abcdefgh"[col] + (8 - row)))); }
  get(square) { const piece = this.position.board.get(parseSquare(square)); return piece ? { type: roleToChar(piece.role), color: colors[piece.color], square } : null; }
  history({ verbose = false } = {}) { return verbose ? this.played : this.played.map((move) => move.san); }
  isCheck() { return this.position.isCheck(); }
  isCheckmate() { return this.position.isCheckmate(); }
  isGameOver() { return this.position.isEnd() || this.position.halfmoves >= 100 || this.seen.filter((key) => key === this.key()).length >= 3; }
  outcome() { return this.position.outcome() || (this.isGameOver() ? {} : undefined); }
  moves({ square, verbose = false } = {}) {
    if (this.isGameOver()) return [];
    const list = [];
    for (const [from, destinations] of this.position.allDests()) {
      if (square && makeSquare(from) !== square) continue;
      for (const to of destinations) {
        const pawn = this.position.board.get(from)?.role === "pawn";
        const promotions = pawn && (to < 8 || to >= 56) ? ["q", "r", "b", "n"] : [undefined];
        for (const promotion of promotions) {
          const move = { from, to, ...(promotion ? { promotion: charToRole(promotion) } : {}) };
          if (!this.position.isLegal(move)) continue;
          list.push({ from: makeSquare(from), to: makeSquare(to), promotion, color: this.turn(), san: makeSan(this.position, move) });
        }
      }
    }
    return verbose ? list : list.map((move) => move.san);
  }
  move(input) {
    if (this.isGameOver()) throw new Error("Game over.");
    const move = typeof input === "string" ? parseSan(this.position, input) : { from: parseSquare(input.from), to: parseSquare(input.to), ...(input.promotion ? { promotion: charToRole(input.promotion) } : {}) };
    if (!move || !this.position.isLegal(move)) throw new Error("Illegal move.");
    const played = { from: makeSquare(move.from), to: makeSquare(move.to), san: makeSan(this.position, move), color: this.turn(), ...(move.promotion ? { promotion: roleToChar(move.promotion) } : {}) };
    this.position.play(move); this.played.push(played); this.seen.push(this.key()); return played;
  }
}
