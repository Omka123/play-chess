import Link from "next/link";
import ContentShell from "@/components/ContentShell";
import { operator } from "@/lib/site";
export const metadata = { title: "About ChessNexa", description: "What ChessNexa offers, how its practice games work, and the limits of its chess tools." };
export default function About() {
  return <ContentShell><span className="eyebrow">ABOUT CHESSNEXA</span><h1>A place to play a little chess and learn from it.</h1>
    <p>ChessNexa is an independent chess practice website. It brings computer opponents, private friend games, mate-in-one puzzles, and practical lessons together in one place. You can start playing without creating an account.</p>
    {operator && <p>ChessNexa is operated by {operator}.</p>}
    <h2>What you can do here</h2><p>Choose one of five computer opponents and play with or without a clock. Invite a friend using a private game link. Practice identifying checkmate in the puzzle collection, or work through a guide and its interactive board exercise.</p>
    <h2>How we approach learning</h2><p>Our guides focus on decisions you can explain: what a move attacks, what it defends, and how the opponent might reply. We recommend untimed practice and reviewing one turning point after a game. Winning is satisfying, but understanding a missed threat is useful even when you lose.</p>
    <h2>What the tools can and cannot tell you</h2><p>Legal moves are checked with chess.js. The computer opponents use a small custom search engine; they are not Stockfish and their strength labels are relative difficulty levels, not verified Elo ratings. ChessNexa does not currently provide rated matchmaking or professional game analysis.</p>
    <h2>Content and corrections</h2><p>The learning pages are written for this site's practice experience, and their exercise positions are checked against the same move rules used by the game. If you notice an unclear explanation or a problem with a position, see our <Link href="/contact">contact and bug-reporting page</Link>.</p>
    <p>Start with <Link href="/learn">Learn chess</Link> or <Link href="/">play a practice game</Link>.</p>
  </ContentShell>;
}
