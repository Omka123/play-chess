import Link from "next/link";
import ContentShell from "@/components/ContentShell";
export const metadata = { title: "Site Terms | ChessNexa", description: "The scope and limits of ChessNexa's practice games, learning material, and private invitations." };
export default function Terms() {
  return <ContentShell><h1>Using ChessNexa</h1><p>ChessNexa provides casual chess games, puzzles, and educational guides. These terms describe the current service, which has no paid subscriptions or cash-prize games.</p>
    <h2>Play respectfully</h2><p>Use appropriate display names. Do not attempt to take another player's private session, guess room credentials, overload the service, or interfere with someone else's game. Share invitations only with people you intend to play.</p>
    <h2>Games and availability</h2><p>Friend-game rooms expire after 24 hours. Connectivity problems and service interruptions can affect play; ChessNexa cannot promise uninterrupted games or preserved game history. Clocks are controlled by the server, and a disconnected player may run out of time.</p>
    <h2>Learning material</h2><p>The guides and bots are practice tools. Bot difficulty is relative and is not a verified rating. The content does not promise a particular playing strength or a tournament result. You are welcome to report unclear explanations or incorrect positions through <Link href="/contact">Contact</Link>.</p>
    <h2>Privacy and changes</h2><p>See <Link href="/privacy">Privacy</Link> for the current storage behavior. New features may require updated notices. External services linked from this site have their own terms and privacy policies.</p>
  </ContentShell>;
}
