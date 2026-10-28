export const LESSON_EXAMPLES = {
  "first-chess-game": [{
    id: "develop-before-castling", title: "An opening move should do useful work",
    introduction: "Follow this short Italian Game example. Both sides develop normally; it is a demonstration of development and king safety, not a forced opening repertoire. Before each move, name the piece being improved and the square or pawn it influences.",
    steps: [
      { san: "e4", note: "The pawn takes central space, controls d5 and f5, and opens the f1 bishop's diagonal. White still needs to develop pieces; a central pawn alone does not complete the opening." },
      { san: "e5", note: "Black contests the centre and opens a bishop's diagonal. Neither side has won a pawn or created a forced attack." },
      { san: "Nf3", note: "The knight develops with an attack on e5. This gives Black a concrete problem to address while White brings a piece closer to the centre." },
      { san: "Nc6", note: "Black develops a knight and defends e5. Ask what the opponent's move protects before assuming your attack wins material." },
      { san: "Bc4", note: "The bishop leaves f1, making room for kingside castling. It also looks toward f7, but that diagonal is not a license to sacrifice without calculating." },
      { san: "Bc5", note: "Black develops a bishop in turn. White can now consider castling because f1 and g1 are clear and the king's route is not attacked in this position." },
      { san: "O-O", note: "White moves the king from e1 to g1 and the rook from h1 to f1 in one move. The next job is to develop the remaining pieces, not to move the king-side pieces repeatedly without a reason." },
    ],
    takeaway: "Reset the line and explain Nf3 and Nc6 without using the word 'normal'. A useful explanation names the attack on e5 and its defence. In your next practice game, look for a developing move that also meets an immediate threat.",
  }],
  "spot-a-knight-fork": [{
    id: "fork-and-follow-through", title: "A fork needs a follow-up",
    fen: "8/8/3q1k2/8/8/2N5/8/4K3 w - - 0 1", result: "insufficient-material",
    introduction: "White's knight on c3 can reach e4, which attacks both f6 and d6. Work through one legal Black reply and the capture that follows. The king can choose other legal escapes; Ke7 is an illustrative response, not the only legal move.",
    steps: [
      { san: "Ne4+", note: "The knight checks the king on f6 and attacks the queen on d6. Because Black is in check, a quiet queen move that leaves the king attacked is not legal." },
      { san: "Ke7", note: "Black moves out of check. Notice that the queen is still on d6: escaping a check does not automatically save the second target of a fork." },
      { san: "Nxd6", note: "White follows through and captures the queen. This wins material, but in this deliberately minimal example it leaves king and knight against king, which is a draw by insufficient material. The exercise illustrates a double attack, not a forced game win. In a full game, the remaining pieces and pawns determine whether winning the queen leads to a winning position." },
    ],
    takeaway: "The pattern has three parts: reach the fork square, force a response to the check, then capture the other target. Before trusting a similar fork in a full game, look for a piece that can capture the knight as its answer to the check.",
  }],
  "checkmate-or-stalemate": [{
    id: "protected-queen-mate", title: "The queen needs the king's protection",
    fen: "7k/5Q2/6K1/8/8/8/8/8 w - - 0 1", result: "checkmate",
    introduction: "Black has only a king on h8. White has a king on g6 and a queen on f7. Before advancing the example, find the square that lets the queen give check while remaining protected.",
    steps: [{ san: "Qg7#", note: "The queen gives check along the g7-h8 diagonal and controls the seventh rank. Black cannot capture her because White's king on g6 protects g7. The queen covers g8 and h7, so no king escape remains. With no other Black piece available to capture or block, this is checkmate." }],
    takeaway: "Do not stop at 'the queen is beside the king'. Name the checking line, explain why the queen cannot be captured, and check every adjacent escape square.",
  }, {
    id: "quiet-move-stalemate", title: "One quiet move changes a win into a draw",
    fen: "7k/5Q2/6K1/8/8/8/8/8 w - - 0 1", result: "stalemate",
    introduction: "Compare a different legal queen move from the same position. White has the same large material advantage, but the result depends on whether Black's king is actually in check.",
    steps: [{ san: "Qe6", note: "The queen on e6 attacks g8 diagonally. White's king covers g7 and h7. Black has no legal move, but the king on h8 is not attacked: the queen is not on its rank, file or diagonal. This is stalemate, and the game is drawn immediately." }],
    takeaway: "Reset both examples and compare Qg7 with Qe6. The decisive difference is check, not the number of pieces or how few squares the defender has.",
  }],
};
