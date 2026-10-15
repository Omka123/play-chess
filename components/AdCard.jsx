"use client";

import Link from "next/link";
import { LEARNING_PROMOS } from "@/lib/promotions";
import ColorIcon from "./ColorIcon";

export default function AdCard({ creative = "academy", format = "card", sponsor = null }) {
  const ad = LEARNING_PROMOS[creative] || LEARNING_PROMOS.academy;
  return <section className={`ad-slot ad-${format} ad-${ad.tone}`} aria-label={sponsor ? `Sponsored by ${sponsor.name}` : "Recommended chess guide"}>
    <div className="ad-label">{sponsor ? "Advertisement" : "Learn with ChessNexa"}<span>{sponsor ? `Sponsored by ${sponsor.name}` : "Free learning guide"}</span></div>
    <div className="ad-content">
      <span className="ad-art" aria-hidden="true"><ColorIcon name={ad.icon} size={36} /></span>
      <div className="ad-copy"><span className="ad-brand">{sponsor ? sponsor.name : "ChessNexa guides"}</span><h3>{sponsor?.title || ad.title}</h3><p>{sponsor?.text || ad.text}</p></div>
      {sponsor ? <a className="ad-cta" href={sponsor.href} target="_blank" rel="sponsored noopener noreferrer">Visit sponsor <span aria-hidden="true">↗</span></a> : <Link className="ad-cta" href={ad.href}>{ad.cta} <span aria-hidden="true">→</span></Link>}
    </div>
  </section>;
}
