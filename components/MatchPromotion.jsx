import Link from "next/link";
import ColorIcon from "./ColorIcon";
export default function MatchPromotion() {
  return <aside className="match-promotion" aria-label="Free chess training"><span className="match-promo-eyebrow">CHESSNEXA TRAINING</span><h2>YOUR NEXT<br />GREAT MOVE<br />STARTS HERE.</h2><div className="match-promo-art" aria-hidden="true"><ColorIcon name="knight" size={150} /><span>♟ ♞ ♜</span></div><p>Build your skills with puzzles, lessons and game review.</p><Link className="btn" href="/training">Train for free →</Link><small>Free for every player</small></aside>;
}
