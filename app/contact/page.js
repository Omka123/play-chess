import ContentShell from "@/components/ContentShell";
import { supportEmail, operator } from "@/lib/site";
import Link from "next/link";
export const metadata = { title: "Contact & Report a Problem | ChessNexa", description: "Report a game problem, suggest a correction to a chess guide, or contact the ChessNexa site operator." };
export default function Contact() {
  return <ContentShell><span className="eyebrow">HELP & FEEDBACK</span><h1>Help us improve ChessNexa.</h1>
    {operator && <p>Site operator: {operator}.</p>}
    {supportEmail ? <p>Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a> for game problems, guide corrections, privacy questions, or general feedback.</p> : <p>A public support email address has not yet been published. This page will show it when the site operator makes it available.</p>}
    <h2>Reporting a game problem</h2><p>Include the page, your browser, the game mode, and what you expected to happen. If a move fails, tell us the starting square, destination square, and whose turn it was. A screenshot of the board and status panel helps distinguish a move problem from viewing an earlier position.</p>
    <p>For player behaviour, suspected unfair play or an inappropriate shared replay, use the private <Link href="/report">report form</Link>. For a suspension appeal, contact the operator with your username and a clear explanation.</p>
    <h2>Correcting a guide or exercise</h2><p>Include the guide title, the sentence or position you are asking about, and your suggested correction. If the concern involves a tactic, describe the opponent's legal reply that you think was missed.</p>
    <h2>Protect your private information</h2><p>Do not include database credentials, passwords, player-session tokens, or a live private invitation in a report. You can describe a room problem without sharing the invite link publicly.</p>
  </ContentShell>;
}
