"use client";
import Link from "next/link";
import ColorIcon from "./ColorIcon";
import { useRef } from "react";

export default function MatchPanel({ children }) {
  const content = useRef(null);
  return <aside className="panel match-panel" aria-label="Game controls">
    <nav className="match-panel-tabs" aria-label="Game navigation">
      <button type="button" className="active" onClick={() => content.current?.scrollTo({ top: 0, behavior: "smooth" })}><ColorIcon name="play" /><span>New Game</span></button>
      <Link href="/account"><ColorIcon name="history" /><span>Games</span></Link>
      <Link href="/hub"><ColorIcon name="friends" /><span>Players</span></Link>
    </nav>
    <div className="match-panel-content" ref={content}>{children}</div>
    <div className="match-panel-footer"><ColorIcon name="knight" size={20} /><span>Play. Practise. Improve.</span><Link href="/hub">Your hub →</Link></div>
  </aside>;
}
