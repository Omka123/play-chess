"use client";
import { usePathname } from "next/navigation";
import AdsterraAd from "./AdsterraAd";

// Display slots only. Never install document-level advertising click handlers.
export default function AdsterraNetwork() {
  const path = usePathname();
  if (process.env.NODE_ENV !== "production" || path !== "/") return null;
  return <section className="adsterra-network" aria-label="Sponsored advertising"><div className="adsterra-home-ads"><AdsterraAd /><AdsterraAd vertical /></div></section>;
}
