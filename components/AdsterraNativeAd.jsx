"use client";
import { useEffect, useRef, useState } from "react";
import { ADSTERRA } from "@/lib/adsterra";

export default function AdsterraNativeAd() {
  const container = useRef(null);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    let stopped = false;
    const observer = new MutationObserver(() => {
      if (!stopped && node.querySelector("iframe,img,a,video,canvas")) setStatus("ready");
    });
    observer.observe(node, { childList: true, subtree: true });
    // Native banners are an async container embed. Do not convert this into a
    // sandboxed sync-banner iframe: this SDK requires normal document.cookie.
    const script = document.createElement("script");
    script.src = ADSTERRA.native.src;
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.onerror = () => { if (!stopped) setStatus("error"); };
    node.parentElement.appendChild(script);
    const timer = setTimeout(() => { if (!stopped && !node.querySelector("iframe,img,a,video,canvas")) setStatus("empty"); }, 15000);
    return () => { stopped = true; clearTimeout(timer); observer.disconnect(); script.remove(); node.replaceChildren(); };
  }, []);
  return <aside className="adsterra-ad adsterra-native" data-ad-status={status} aria-label="Advertisement"><span className="responsive-ad-label">Advertisement</span><div id={ADSTERRA.native.container} ref={container} />{(status === "empty" || status === "error") && <p className="sub" role="status">Advertisement unavailable.</p>}</aside>;
}
