"use client";

import { ADS } from "@/lib/ads";

export default function AdCard({ creative = "academy", format = "card" }) {
  const ad = ADS[creative];
  return <section className={`ad-slot ad-${format} ad-${ad.tone}`} aria-label={`Sample advertisement: ${ad.brand}`}>
    <div className="ad-label">Advertisement <span>Sample promotion</span></div>
    <div className="ad-content">
      <span className="ad-art" aria-hidden="true">{ad.icon}</span>
      <div className="ad-copy"><span className="ad-brand">{ad.brand}</span><h3>{ad.title}</h3><p>{ad.text}</p></div>
      {ad.href ? <a className="ad-cta" href={ad.href} target="_blank" rel="sponsored noopener noreferrer">{ad.cta} <span aria-hidden="true">↗</span></a>
        : <details className="ad-details"><summary className="ad-cta">View details <span aria-hidden="true">›</span></summary><p>{ad.detail}</p></details>}
    </div>
  </section>;
}
