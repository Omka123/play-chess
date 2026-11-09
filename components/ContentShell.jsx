import Link from "next/link";
import SiteFooter from "./SiteFooter";
import AccountNavLinks from "./AccountNavLinks";
export default function ContentShell({ children }) {
  return <><header className="top content-nav"><Link className="brand" href="/">♞ ChessNexa</Link><nav className="content-links" aria-label="Main navigation"><Link href="/">Play chess</Link><Link href="/improve">Improve</Link><Link href="/analysis">Analysis</Link><Link href="/variants">Variants</Link><AccountNavLinks /><Link href="/learn">Learn</Link></nav></header><main className="content-page">{children}</main><SiteFooter /></>;
}
