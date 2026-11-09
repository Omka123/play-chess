"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ADSTERRA, adsterraPage } from "@/lib/adsterra";
import AdsterraAd from "./AdsterraAd";

function NativeAd() {
  const element = useRef(null);
  useEffect(() => {
    const node = element.current;
    const script = document.createElement("script");
    script.src = ADSTERRA.native; script.async = true;
    script.setAttribute("data-cfasync", "false");
    node.appendChild(script);
    return () => script.remove();
  }, []);
  return <aside ref={element} className="adsterra-native" aria-label="Advertisement"><span className="responsive-ad-label">Advertisement</span><div id={ADSTERRA.container} /></aside>;
}

export default function AdsterraNetwork() {
  const path = usePathname();
  if (process.env.NODE_ENV !== "production" || !adsterraPage(path || "")) return null;
  return <section className="adsterra-network" aria-label="Sponsored advertising">
    {ADSTERRA.scripts.map((src, index) => <Script key={src} id={`adsterra-network-${index}`} src={src} strategy="afterInteractive" data-cfasync="false" />)}
    {path === "/" && <div className="adsterra-home-ads"><AdsterraAd /><AdsterraAd vertical /></div>}
    <NativeAd />
    <a className="adsterra-sponsored-link" href={ADSTERRA.link} target="_blank" rel="sponsored noopener noreferrer">Sponsored offer ↗</a>
  </section>;
}
