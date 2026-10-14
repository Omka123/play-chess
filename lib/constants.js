export const FILES = "abcdefgh";
export const MATE = 100000;

export const GLYPH = {
  k: "\u265A\uFE0E", q: "\u265B\uFE0E", r: "\u265C\uFE0E",
  b: "\u265D\uFE0E", n: "\u265E\uFE0E", p: "\u265F\uFE0E",
};
export const PIECE_NAMES = { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };
export const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
export const START_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1 };

// Piece-square tables, written from White's point of view (row 0 = rank 8).
export const PST = {
  p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
};

export const BOTS = [
  { id: 1, name: "Pip",    blurb: "Plays fast and a little wild.",                           depth: 0,  time: 0,    noise: 0,  q: false },
  { id: 2, name: "Mabel",  blurb: "Looks one move ahead.",                                   depth: 1,  time: 400,  noise: 70, q: false },
  { id: 3, name: "Orla",   blurb: "Looks two moves ahead and rarely drops a piece.",         depth: 2,  time: 800,  noise: 25, q: false },
  { id: 4, name: "Dmitri", blurb: "Calculates four moves deep and punishes loose pieces.",   depth: 4,  time: 1800, noise: 0,  q: true },
  { id: 5, name: "Vesna",  blurb: "Searches as deep as time allows. Hard to beat.",          depth: 10, time: 3500, noise: 0,  q: true },
];

export const TIMES = [
  { s: 0, label: "Untimed" },
  { s: 180, label: "3 min" },
  { s: 300, label: "5 min" },
  { s: 600, label: "10 min" },
];
