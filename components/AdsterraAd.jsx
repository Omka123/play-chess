"use client";
import { useEffect, useRef, useState } from "react";
import { ADSTERRA, bannerUnit } from "@/lib/adsterra";

function BannerFrame({ unit }) {
  const frame = useRef(null);
  const [status, setStatus] = useState("loading");
  const { width, height } = ADSTERRA.units[unit];
  useEffect(() => {
    const receive = event => {
      if (!frame.current || event.source !== frame.current.contentWindow || event.data?.type !== "chessnexa-ad" || event.data.unit !== unit) return;
      if (event.data.status === "ready" || event.data.status === "empty") setStatus(event.data.status);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [unit]);
  return <div data-ad-status={status}>{status === "empty" ? <p className="sub" role="status">Advertisement unavailable.</p> : <iframe ref={frame} title={`Advertisement ${width} × ${height}`} width={width} height={height} loading="lazy" style={{ background: "transparent", colorScheme: "dark" }} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" referrerPolicy="strict-origin-when-cross-origin" src={`/ads/adsterra/${unit}`} onError={() => setStatus("empty")} />}</div>;
}

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
  return <aside ref={element} className={`adsterra-ad${vertical ? " adsterra-vertical" : ""}`} aria-label="Advertisement"><span className="responsive-ad-label">Advertisement</span>{unit && <BannerFrame key={unit} unit={unit} />}</aside>;
}
