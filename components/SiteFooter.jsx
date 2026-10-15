import Link from "next/link";
export default function SiteFooter() {
  return <footer className="site-footer"><span>ChessNexa · Play, practice, learn.</span><nav aria-label="Site information">
    <Link href="/learn">Learn chess</Link><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/advertise">Sponsorships</Link><Link href="/report">Report a problem</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link>
  </nav></footer>;
}
