export const PRACTICAL_EXAMPLES = {
  "understand-pins": [{
    id: "king-cannot-recapture", title: "A protected piece can still be won",
    fen: "4k3/4r3/8/8/1B6/8/8/4R1K1 w - - 0 1",
    introduction: "Trace the e-file before moving. Black's rook stands between White's rook on e1 and Black's king on e8. White's bishop attacks e7 along b4-c5-d6-e7. Test the capture and then the king's supposed recapture.",
    steps: [{ san: "Bxe7", note: "The bishop captures Black's rook, and White's rook now defends that bishop along the e-file. Kxe7 is illegal because the king would step into the rook's attack. The move wins a rook in this example; it does not give check, because White's own bishop still blocks the e-file." }],
    takeaway: "Look at the resulting board, not the original defender count. Also notice that a pin does not necessarily stop a rook from moving along the pinning file before the capture occurs.",
  }],
  "en-passant-explained": [{
    id: "en-passant-timing", title: "Watch the last move create the capture right",
    introduction: "This line constructs the exercise from the ordinary starting position. The early ...a6 is simply a legal waiting move for demonstration; this is not a recommended opening sequence.",
    steps: [
      { san: "e4", note: "White moves the e-pawn two squares from its starting square. No Black pawn is beside it on the fourth rank, so Black has no en-passant capture here." },
      { san: "a6", note: "Black makes a legal pawn move on the other side of the board. This gives White time to advance the e-pawn again; it is not a forced response to e4." },
      { san: "e5", note: "White's pawn reaches the fifth rank. It is now in the right rank to capture en passant if a neighbouring Black pawn immediately advances two squares beside it." },
      { san: "d5", note: "Black advances from d7 to d5 in one move. The pawn passes over d6, creating White's immediate option to capture onto d6. Choosing a different White move would let that opportunity expire." },
      { san: "exd6", note: "White lands on d6 and removes the pawn from d5. Compare those two squares carefully: the piece removed was not on the destination square. This demonstrates the rule, not a free pawn win: Black could next recapture on d6 with the e7-pawn. All normal king-safety requirements still apply." },
    ],
    takeaway: "Describe the capture using three squares: e5 is the starting square, d6 is the destination, and d5 is where the captured pawn is removed. Add the timing condition: d7-d5 must have been the immediately preceding move.",
  }],
  "passed-pawn-square-rule": [{
    id: "three-moves-to-promotion", title: "Count the defender's turns before promotion",
    fen: "4k3/8/8/P7/8/8/8/7K w - - 0 1",
    introduction: "White moves first. Black's king starts outside the pawn's square. This is one legal chase; the purpose is to count turns, not to claim that Black must choose exactly these king squares.",
    steps: [
      { san: "a6", note: "White advances immediately and now needs two more moves to promote. Black has only one reply before a7 and one reply before the final advance." },
      { san: "Kd7", note: "Black heads diagonally toward the pawn. The king is still too far from a7 and a8 to occupy either square on its next move." },
      { san: "a7", note: "White is one move from promotion. Calculate the defender's legal reach now instead of assuming that a pawn on the seventh rank is always safe." },
      { san: "Kc7", note: "Black moves closer, but the king on c7 does not attack a8. Other legal king routes also fail to stop this unopposed promotion with White moving first." },
      { san: "a8=Q", note: "The pawn promotes. The queen is not immediately capturable by the king on c7. This is not checkmate; White still needs to convert the queen advantage with care, including avoiding stalemate." },
    ],
    takeaway: "A promotion race ends when the new piece can survive, not merely when a pawn reaches the edge. Recalculate if the side to move changes, a check interrupts the race, or another piece blocks the pawn.",
  }],
  "read-chess-notation": [{
    id: "read-a-short-score", title: "Connect each notation entry to its board move",
    introduction: "Read this short opening score from left to right. There are six individual moves and three numbered full turns. No result is claimed: the game is still in progress after the last move.",
    pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 *",
    steps: [
      { san: "e4", note: "There is no piece letter because a pawn moves. The destination is e4; the starting position tells us which pawn can legally reach it." },
      { san: "e5", note: "Black's pawn reply completes move number one. In a normal full score, it appears after White's e4 without a second copy of the move number." },
      { san: "Nf3", note: "N means knight. White's king's knight moves to f3 and attacks the pawn on e5. The notation says neither that the pawn is captured nor that the king is checked." },
      { san: "Nc6", note: "Black's knight develops to c6. If displaying only this Black move, write 2...Nc6 to show its place in the score." },
      { san: "Bc4", note: "B means bishop. The diagonal from f1 to c4 is clear because the e-pawn moved earlier. The board history makes this move legal." },
      { san: "Nf6", note: "Black develops another knight to f6. The asterisk at the end of the sample PGN indicates an unfinished or unspecified result, rather than a win or draw." },
    ],
    takeaway: "Copy the sample PGN into the analysis page and compare its final board with this one. A saved game includes the sequence; a FEN exported at this point contains only the resulting position and its associated state fields.",
  }],
};
