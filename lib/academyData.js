import { Chess } from "chess.js";
import { PUZZLES, matingMoves } from "./puzzles.js";
const line = (id, title, theme, rating, fen, san, explanation) => {
  const game = new Chess(fen); return { id, title, theme, rating, fen: game.fen(), line: san.map((move) => { const m = game.move(move); return m.from + m.to + (m.promotion || ""); }), explanation };
};
export const TACTICS = [
  ...PUZZLES.map((puzzle, i) => { const move = matingMoves(puzzle.fen)[0]; return { id: `mate-${i}`, title: puzzle.title, theme: i >= 6 ? "Endgame" : "Checkmate", rating: puzzle.rating || (i === 3 ? 1000 : 400), fen: puzzle.fen, line: [move.from + move.to + (move.promotion || "")], explanation: "The king is attacked and has no legal escape, block or capture." }; }),
  line("fork-queen", "Win the queen with a fork", "Fork", 700, "8/8/3q1k2/8/8/2N5/8/4K3 w - - 0 1", ["Ne4+", "Ke7", "Nxd6"], "Ne4 checks the king while attacking the queen on d6. After the king moves, capture the queen."),
  line("legal-trap", "Légal's attacking combination", "Sacrifice", 1100, "rn1qkbnr/ppp2p1p/3p2p1/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5", ["Nxe5", "Bxd1", "Bxf7+", "Ke7", "Nd5#"], "This study follows Black accepting the queen. The bishop check drives the king to e7, where Nd5 is mate. Black has alternatives to accepting the sacrifice."),
  line("back-rank-defence", "Create an escape square", "Defence", 600, "6k1/5ppp/8/8/8/8/5PPP/R5K1 b - - 0 1", ["h6", "Ra8+", "Kh7"], "Move the h-pawn to give your king an escape square. After the rook check, the king escapes to h7."),
  line("promote-with-check", "Promote and finish", "Promotion", 800, "7k/5KP1/8/8/8/8/8/8 w - - 0 1", ["g8=Q#"], "Promotion to a queen delivers checkmate because the white king protects the escape squares."),
];
export const COURSES = [
  { id: "foundations", title: "Build your foundations", categories: ["Getting started", "Rules", "Fundamentals"], description: "Start with legal moves, development and king safety." },
  { id: "tactics", title: "Recognise tactical patterns", categories: ["Tactics"], description: "Spot forks, loose pieces and forcing moves." },
  { id: "endgames", title: "Finish your games", categories: ["Endgames"], description: "Practise king activity and basic mating techniques." },
  { id: "habits", title: "Build lasting practice habits", categories: ["Practice"], description: "Choose useful time controls and learn from completed games." },
];
export const TRAINING_COPY = {
  en: { choose: "Choose a puzzle", hint: "Hint", next: "Next puzzle", correct: "Solved!", wrong: "That is legal, but it is not the study move. Try again.", goal: "Find the best continuation. The opponent replies automatically.", intention: "What is your plan?", review: "Practise your mistakes" },
  hi: { choose: "पहेली चुनें", hint: "संकेत", next: "अगली पहेली", correct: "सही समाधान!", wrong: "यह चाल वैध है, लेकिन अध्ययन की सही चाल नहीं है। फिर प्रयास करें।", goal: "सही क्रम खोजें। प्रतिद्वंद्वी की चाल अपने आप चलेगी।", intention: "आपकी योजना क्या है?", review: "अपनी गलतियों का अभ्यास करें" },
  mr: { choose: "कोडे निवडा", hint: "संकेत", next: "पुढील कोडे", correct: "योग्य उत्तर!", wrong: "ही चाल वैध आहे, पण अभ्यासातील योग्य चाल नाही. पुन्हा प्रयत्न करा.", goal: "योग्य चालींचा क्रम शोधा. प्रतिस्पर्ध्याची चाल आपोआप खेळली जाईल.", intention: "तुमची योजना काय आहे?", review: "आपल्या चुकांचा सराव करा" },
};
const EXPLANATIONS = {
  hi: { Fork: "घोड़े की चाल से राजा को शह और वज़ीर पर हमला एक साथ होता है। राजा के हटने के बाद वज़ीर लें।", Sacrifice: "इस अध्ययन में काला वज़ीर का बलिदान स्वीकार करता है। फिर ऊँट की शह और घोड़े की अगली चाल से मात होती है। काला बलिदान अस्वीकार भी कर सकता है।", Defence: "किनारे का प्यादा चलाकर राजा के लिए बचने का खाना बनाइए। अगली शह पर राजा उस खाने में जा सकता है।", Promotion: "प्यादे को वज़ीर बनाकर मात दें। पहले राजा के सभी बचाव जाँचें।", Endgame: "राजा और भारी मोहरे को मिलाकर विरोधी राजा के भागने के खाने बंद करें। शह के बाद कोई वैध बचाव नहीं बचना चाहिए।", Checkmate: "राजा को शह है और कोई वैध बचाव नहीं है: राजा भाग नहीं सकता, शह रोक नहीं सकता और हमलावर मोहरे को ले नहीं सकता।" },
  mr: { Fork: "घोड्याच्या चालीने राजाला शह आणि वजिरावर हल्ला एकाच वेळी होतो. राजा हलल्यावर वजीर घ्या.", Sacrifice: "या अभ्यासात काळा वजिराचे बलिदान स्वीकारतो. त्यानंतर उंटाचा शह आणि घोड्याची पुढील चाल मात करतात. काळा बलिदान नाकारूही शकतो.", Defence: "कडचा प्यादा हलवून राजासाठी सुटकेचा चौकोन तयार करा. पुढील शहाला राजा त्या चौकोनात जाऊ शकतो.", Promotion: "प्याद्याचे वजिरात रूपांतर करून मात द्या. आधी राजाचे सर्व बचाव तपासा.", Endgame: "राजा आणि जड मोहऱ्याच्या मदतीने विरोधी राजाचे सुटकेचे चौकोन बंद करा. शहानंतर कोणताही वैध बचाव उरता कामा नये.", Checkmate: "राजाला शह आहे आणि कोणताही वैध बचाव नाही: राजा पळू शकत नाही, शह अडवू शकत नाही किंवा हल्लेखोर मोहरा घेऊ शकत नाही." },
};
export function tacticExplanation(puzzle, language = "en") { return EXPLANATIONS[language]?.[puzzle.theme] || puzzle.explanation; }
export function adaptivePuzzle(rating, theme = "All", recent = []) {
  const pool = TACTICS.filter((p) => theme === "All" || p.theme === theme); const unseen = pool.filter((p) => !recent.includes(p.id));
  return [...(unseen.length ? unseen : pool)].sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating))[0];
}
export function validateTactic(puzzle, submitted) {
  if (!Array.isArray(submitted) || submitted.length > 10) return false;
  if (puzzle.line.length === 1 && submitted.length === 1 && typeof submitted[0] === "string" && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(submitted[0])) {
    try { const game = new Chess(puzzle.fen); game.move({ from: submitted[0].slice(0, 2), to: submitted[0].slice(2, 4), promotion: submitted[0][4] }); if (game.isCheckmate()) return true; } catch { return false; }
  }
  const expected = puzzle.line.filter((_, i) => i % 2 === 0);
  return submitted.length === expected.length && submitted.every((move, i) => move === expected[i]);
}
export function revisionSchedule(stage = 0, correct = true, now = Date.now()) {
  const next = correct ? Math.min(3, stage + 1) : 0;
  return { stage: next, dueAt: now + [1, 1, 7, 30][next] * 86400000, lastReviewed: now };
}
