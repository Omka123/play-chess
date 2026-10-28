import Link from "next/link";
import ContentShell from "@/components/ContentShell";
import { LESSONS } from "@/lib/lessons";
import AdCard from "@/components/AdCard";
import { sponsorConfig } from "@/lib/sponsor";
import ResponsiveAd from "@/components/ResponsiveAd";
export const metadata = { title: "Learn Chess | ChessNexa", description: "Practical chess lessons with interactive exercises: opening plans, knight forks, checkmate, and reviewing your games." };
export default function Learn() {
  return <ContentShell><span className="eyebrow">LEARN & PRACTICE</span><h1>Understand the move before you make it.</h1><p className="content-lead">Work through a clear idea, try it on a board, and take it into your next game. These guides are written for players who want to understand why a move works.</p>
    <nav className="lesson-topics" aria-label="Learning topics"><a href="#all-guides">Browse all {LESSONS.length} guides</a><Link href="/learn/en-passant-explained">En passant</Link><Link href="/learn/understand-pins">Pins</Link><Link href="/learn/back-rank-checkmate">Back-rank mate</Link><Link href="/learn/passed-pawn-square-rule">Pawn races</Link><Link href="/learn/read-chess-notation">Chess notation</Link></nav>
    <div className="lesson-grid" id="all-guides">{LESSONS.map((lesson) => <Link className="lesson-card" key={lesson.slug} href={`/learn/${lesson.slug}`}><span className="eyebrow">{lesson.category}</span><h2>{lesson.title}</h2><p>{lesson.description}</p><span className="lesson-link">Read the guide →</span></Link>)}</div>
    <h2>A small practice routine</h2><p>Read one guide, finish its exercise if it has one, and play an untimed bot game. Look for a chance to use the idea. After the game, review one decision rather than trying to explain every move at once.</p>
    <h2>Choose your next topic</h2><p>Start with castling and piece safety if you are new to chess. Move on to knight forks and queen mates when you can spot checks confidently. The endgame guides cover rook activity, pawn promotion, and avoiding stalemate. Finish with a practice routine you can repeat.</p>
    <h2>Follow a worked position</h2><p>For a move-by-move example, start with <Link href="/learn/first-chess-game">opening development and castling</Link>, follow a <Link href="/learn/spot-a-knight-fork">knight fork through to its capture</Link>, or compare <Link href="/learn/checkmate-or-stalemate">checkmate and stalemate from the same position</Link>. Each example includes a board you can step through and a text explanation of the complete line.</p><p>Read our <Link href="/editorial">guide methodology</Link> for the difference between a legal example, a forced line and an engine recommendation.</p>
    <ResponsiveAd />
    <div className="article-sponsor"><AdCard format="banner" sponsor={sponsorConfig()} /></div>
  </ContentShell>;
}
