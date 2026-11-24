"use client";
import { usePathname } from "next/navigation";
import AdsterraNativeAd from "./AdsterraNativeAd";
import { adsterraPage } from "@/lib/adsterra";

// Display slots only. Never install document-level advertising click handlers.
export default function AdsterraNetwork() {
  const path = usePathname();
  if (process.env.NODE_ENV !== "production" || !adsterraPage(path || "")) return null;
  return <section className="adsterra-network" aria-label="Sponsored advertising"><AdsterraNativeAd /></section>;
}
