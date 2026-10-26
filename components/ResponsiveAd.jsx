"use client";

import { useEffect, useRef } from "react";

export default function ResponsiveAd() {
  const element = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    const ad = element.current;
    if (!ad) return;
    const initialize = () => {
      if (initialized.current || !navigator.onLine || ad.getBoundingClientRect().width === 0) return;
      if (ad.hasAttribute("data-adsbygoogle-status")) { initialized.current = true; return; }
      try {
        initialized.current = true;
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch { initialized.current = false; }
    };
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) initialize();
    });
    observer.observe(ad);
    const online = () => { if (ad.getBoundingClientRect().top < innerHeight && ad.getBoundingClientRect().bottom > 0) initialize(); };
    window.addEventListener("online", online);
    return () => { observer.disconnect(); window.removeEventListener("online", online); };
  }, []);

  if (process.env.NODE_ENV !== "production") return null;

  return <aside className="responsive-ad" aria-label="Advertisement">
    <span className="responsive-ad-label">Advertisement</span>
    <ins ref={element} className="adsbygoogle" style={{ display: "block" }}
      data-ad-client="ca-pub-9915062612412572"
      data-ad-slot="7248730706"
      data-ad-format="auto"
      data-full-width-responsive="true" />
  </aside>;
}
