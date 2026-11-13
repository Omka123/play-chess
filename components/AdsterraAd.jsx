"use client";
import { useEffect, useRef, useState } from "react";
import { ADSTERRA, bannerUnit, adsterraDocument } from "@/lib/adsterra";

export default function AdsterraAd({ vertical = false }) {
  const element = useRef(null);
  const [unit, setUnit] = useState(null);
  useEffect(() => {
    const node = element.current; if (!node) return;
    const measure = () => setUnit(vertical ? innerHeight >= 800 ? "skyscraper" : "rectangle" : bannerUnit(node.clientWidth));
    const observer = new ResizeObserver(measure); observer.observe(node);
    window.addEventListener("resize", measure); measure();
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [vertical]);
  if (process.env.NODE_ENV !== "production") return null;
  const size = unit ? ADSTERRA.units[unit] : null;
  return <aside ref={element} className={`adsterra-ad${vertical ? " adsterra-vertical" : ""}`} aria-label="Advertisement"><span className="responsive-ad-label">Advertisement</span>{size && <iframe key={unit} title={`Advertisement ${size.width} × ${size.height}`} width={size.width} height={size.height} loading="lazy" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" referrerPolicy="strict-origin-when-cross-origin" srcDoc={adsterraDocument(unit)} />}</aside>;
}
