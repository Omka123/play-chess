export const GUIDE_EXAMPLES = {
  "castle-with-confidence": [{
    id: "castling-past-an-attack", title: "One attacked square can close one side only",
    fen: "r3k2r/8/8/8/2b5/8/8/R3K2R w KQkq - 0 1",
    introduction: "This sparse position tests the rules rather than an opening plan. Black's bishop on c4 looks along d3 and e2 to f1, and each rook is attacked by the enemy rook on its file. Before stepping forward, decide which way White may castle.",
    steps: [
      { san: "O-O-O", note: "Kingside castling is illegal because the king would cross f1, which the bishop attacks. Queenside castling is legal: the king crosses d1 and lands on c1, and the bishop attacks neither. The attack on White's a1-rook does not matter, because only the king's path is tested." },
      { san: "O-O", note: "Black may castle kingside even though White's rook on h1 was attacking the rook on h8. The king is not in check and crosses f8 to reach g8, and neither square is attacked. Castling also moves that rook out of the attack." },
    ],
    takeaway: "Before castling, name the squares your king stands on, crosses and lands on. Test those three and ignore attacks on the rook. If one side is closed, check the other side instead of assuming that castling is impossible.",
  }],
  "stop-hanging-pieces": [{
    id: "active-move-drops-defender", title: "A good-looking rook move removes the only defender",
    fen: "6k1/5pp1/1b5p/8/3N4/8/5PPP/3R2K1 w - - 0 1",
    introduction: "White has a rook and knight against a lone bishop. Black's bishop on b6 attacks the knight on d4, but the rook on d1 defends it, so ...Bxd4 Rxd4 would simply lose Black's bishop. Follow what happens when White plays an active move without asking what the rook was doing on d1.",
    steps: [
      { san: "Re1", note: "The rook takes the open e-file and prepares Re8+. It looks active, but it has stopped defending d4. Because Black has an escape square on h7, Re8+ would not be checkmate, so the plan creates no threat strong enough to justify this." },
      { san: "Bxd4", note: "Black wins the knight for free, because no White piece can recapture. The material is now rook against bishop, so most of White's advantage has gone. Moving the knight to safety, for example with Nf5, or keeping the rook on the d-file would have avoided the loss." },
    ],
    takeaway: "Before moving a piece, mentally lift it off its square and ask what it was defending. In your next game, apply that test to any rook or queen move that feels active, as those pieces are often the quiet defenders.",
  }],
  "rook-endgame-activity": [{
    id: "rook-cuts-off-king", title: "A rook can stop a king without moving",
    fen: "8/8/4k3/8/P7/8/1K6/3R4 w - - 0 1",
    introduction: "White's rook on d1 stands on the file between Black's king and the a-pawn. Black has no rook here, which keeps the idea easy to see. A real rook ending is harder, because the enemy rook can give checks or attack the pawn.",
    steps: [
      { san: "a5", note: "White pushes at once. The rook needs no further move: it controls the whole d-file, so the Black king cannot step onto d5, d6 or d7 to approach the pawn." },
      { san: "Ke5", note: "Black's king can walk along the e-file but cannot cross. Compare this with the same position with White's rook on a1 behind the pawn, where the king could walk straight towards the a-file." },
      { san: "a6", note: "The pawn keeps moving because nothing can reach it. The rook's job is the barrier, and the pawn's job is to use the time that the barrier provides." },
      { san: "Ke4", note: "Black tries going down the board instead, but d4 and d3 are controlled in the same way. Trying a different rank does not solve the problem while the rook holds the file." },
      { san: "a7", note: "White is one move from promotion. The king is still on the far side of the d-file, four files from the pawn, and it cannot reach a8 in time." },
      { san: "Ke3", note: "Black now approaches the rook itself. That is the right idea in general, since attacking a rook can force it off its file, but here it comes a move too late." },
      { san: "a8=Q", note: "The pawn promotes. White has a queen and rook against a lone king, and the win now only requires avoiding stalemate. In an ending with Black's rook still on the board, you would need to check its checks at every step." },
    ],
    takeaway: "In your next rook ending, ask which file separates the enemy king from your passed pawn, and whether your rook can take it. Then check what the enemy rook can do about it before you start pushing.",
  }],
  "pawn-promotion-basics": [{
    id: "queen-promotion-stalemate", title: "The strongest piece throws away the win",
    fen: "8/k1P5/8/2K5/8/8/8/8 w - - 0 1", result: "stalemate",
    introduction: "White's pawn on c7 is about to promote and Black has only a king on a7. Try to spot the problem with the natural move before stepping forward.",
    steps: [{ san: "c8=Q", note: "The queen covers a8 and b8 along the rank and a6 and b7 along the diagonal, while White's king covers b6. The Black king on a7 is not attacked, because the queen is not on its rank, file or diagonal. Black has no legal move, so this is stalemate and the game is drawn." }],
    takeaway: "On the move before promotion, list the enemy king's squares and test the queen on them. If she takes every square without giving check, compare the other promotion choices.",
  }, {
    id: "rook-promotion-keeps-win", title: "The same pawn, promoted to a rook",
    fen: "8/k1P5/8/2K5/8/8/8/8 w - - 0 1",
    introduction: "Now promote from the same position to a rook. It has no diagonals, so it leaves b7 and a6 available, and Black must keep making moves.",
    steps: [
      { san: "c8=R", note: "The rook controls the eighth rank and the c-file, but not b7 or a6. Black is not stalemated and has to move the king, which is exactly what White needs." },
      { san: "Kb7", note: "The king attacks the new rook on c8. This is one legal reply, not the only one. White's king on c5 is too far away to protect c8, so the rook has to act." },
      { san: "Rh8", note: "The rook moves to safety along the rank. White now has king and rook against king, a win with correct technique, where the same position with a queen promotion was only a draw." },
    ],
    takeaway: "Underpromotion is not a trick to memorise. It answers a concrete question: does the stronger piece leave the opponent a legal move? If not, choose the piece that does and still wins.",
  }],
  "back-rank-checkmate": [{
    id: "escape-square-saves-king", title: "One pawn move changes mate into a harmless check",
    fen: "6k1/5pp1/7p/8/8/8/5PPP/R5K1 w - - 0 1",
    introduction: "This is the exercise position with one difference: Black's pawn stands on h6 rather than h7. Compare the same rook move and count the king's exits.",
    steps: [
      { san: "Ra8+", note: "The rook gives the same check along the eighth rank, but now h7 is empty and the rook does not cover it. The check is real, but it is no longer checkmate." },
      { san: "Kh7", note: "The king steps out. White's rook is active but has won nothing. A check that can be answered this easily is not a threat by itself, so do not spend a move on it without a follow-up." },
    ],
    takeaway: "When you need a safe moment, a pawn move such as ...h6 can remove a back-rank threat for the rest of the game. Before you play for this mate, count the king's exits rather than assuming they are closed.",
  }, {
    id: "block-only-delays-mate", title: "A block can delay mate by a single move",
    fen: "6k1/3r1ppp/8/8/8/8/5PPP/R5K1 w - - 0 1", result: "checkmate",
    introduction: "Black now has a rook on d7, which looks like enough to defend the back rank. Check whether the block is a real defence by playing it out.",
    steps: [
      { san: "Ra8+", note: "The king has no exit, because Black's own pawns stand on f7, g7 and h7 and the rook covers f8 and h8. The only legal reply is to block on d8." },
      { san: "Rd8", note: "Black blocks the check. The rook on d8 has no other piece defending it: the king is too far away and nothing else can recapture." },
      { san: "Rxd8#", note: "White captures the blocker and it is check again. With no second defender on the rank and no escape square, this time it is checkmate. Had Black's rook started on the back rank at c8, it could have captured on a8 instead." },
    ],
    takeaway: "Count defenders of the back rank, not just pieces nearby. One block with no recapture only delays mate. In your own games, keep a rook on the back rank or make an escape square before your pieces leave.",
  }],
  "review-your-chess-games": [{
    id: "review-a-short-loss", title: "Review a short loss by finding the real cause",
    introduction: "This is a short constructed game for practising the review method, not a record of a real player's game. Black loses in four moves. Follow it through, then look for the point where the review should really begin, which is not the final move.",
    steps: [
      { san: "e4", note: "A normal first move, with nothing to review yet. Do not spend time here: the aim is to find the first important change, and nothing has changed." },
      { san: "e5", note: "Black replies in the centre. This is also fine. It opens lines for Black's bishop and queen and does not leave anything undefended." },
      { san: "Bc4", note: "The bishop looks along the diagonal towards f7. At this moment f7 is defended by Black's king, so nothing is threatened yet, but this is worth noticing." },
      { san: "Nc6", note: "A sensible developing move that also defends e5. Black still has not done anything wrong, and a good review says so rather than criticising every move." },
      { san: "Qh5", note: "This is the first important change. The queen now attacks f7 a second time, alongside the bishop. Asking what this move threatens would have stopped the game from ending as it does." },
      { san: "Nf6", note: "The cause of the loss. The knight attacks the queen, which feels active, but it does not address f7. The realistic alternatives are ...g6, which blocks the queen and attacks her, and ...Qe7, which defends f7." },
      { san: "Qxf7#", note: "This is the result, not the cause, which is why a review should not stop here. The queen gives check, and the king cannot take her because the bishop on c4 defends f7. It has no safe square, so this is checkmate." },
    ],
    takeaway: "Write the cause in one sentence: 'I attacked the queen without asking what her last move threatened.' Then set one habit for your next game: after each opponent move, name what that move now attacks before choosing your own.",
  }],
};
