import Link from "next/link";
import ContentShell from "@/components/ContentShell";
import { supportEmail } from "@/lib/site";
export const metadata = { title: "Sponsor ChessNexa | ChessNexa", description: "Reach chess learners with clearly labelled sponsorships on ChessNexa's educational pages." };
export default function Advertise() {
  return <ContentShell><span className="eyebrow">WORK WITH CHESSNEXA</span><h1>Support a better chess-learning session.</h1><p className="content-lead">ChessNexa combines playable chess, game review, and practical learning guides. We welcome relevant sponsorship enquiries from chess educators, clubs, publishers, and equipment brands.</p>
    <h2>Where sponsorships appear</h2><p>A clearly labelled sponsor card can appear after a learning guide or below the learning hub. Readers can finish the lesson before choosing whether to visit a sponsor. Sponsor links are separate from game controls and exercise buttons.</p>
    <h2>What to include in an enquiry</h2><p>Send your business name, website, the product or service you want to promote, proposed dates, and the audience you hope to reach. We can discuss placement, creative copy, duration, and commercial terms directly. We do not publish invented audience figures or promise clicks or sales.</p>
    <h2>Editorial independence</h2><p>Payment does not change a game's result, a player rating, an engine recommendation, or the teaching in our guides. Sponsored links are labelled and use sponsored link attributes. We review proposed destinations and copy before enabling a placement.</p>
    <h2>Get in touch</h2>{supportEmail ? <p>Email <a href={`mailto:${supportEmail}?subject=ChessNexa%20sponsorship`}>{supportEmail}</a> with your proposal.</p> : <p>Sponsorship enquiries will open when the operator publishes a contact address. See <Link href="/contact">Contact</Link> for current details.</p>}
  </ContentShell>;
}
