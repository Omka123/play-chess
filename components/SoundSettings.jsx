"use client";
import { useEffect, useState } from "react";
import { configureSound, unlockSound } from "@/lib/sounds";
import ColorIcon from "./ColorIcon";
export default function SoundSettings() {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    try { const value = localStorage.getItem("gambit:sound") !== "off"; setEnabled(value); configureSound(value); } catch { /* Use default. */ }
    document.addEventListener("pointerdown", unlockSound);
    document.addEventListener("keydown", unlockSound);
    return () => { document.removeEventListener("pointerdown", unlockSound); document.removeEventListener("keydown", unlockSound); };
  }, []);
  return <button className="btn sound-toggle" aria-pressed={enabled} aria-label={enabled ? "Mute game sounds" : "Enable game sounds"} onClick={() => {
    const next = !enabled; setEnabled(next); configureSound(next); if (next) unlockSound();
    try { localStorage.setItem("gambit:sound", next ? "on" : "off"); } catch { /* Keep preference for this page. */ }
  }}><ColorIcon name={enabled ? "sound" : "mute"} />Sound {enabled ? "on" : "off"}</button>;
}
