"use client";

import { useId } from "react";

// Lightweight sculpted pieces: curved silhouettes, ivory/ebony lighting,
// turned bases and highlights without a WebGL canvas over the board.
export default function ChessPiece({ type, color }) {
  const id = useId().replace(/:/g, "");
  const white = color === "w";
  const fill = `url(#${id}-body)`;
  const edge = white ? "#6b5941" : "#0c1218";
  const shine = white ? "#fffdf0" : "#8f9ca8";
  const shapes = {
    p: <><path d="M28 28 C30 37 29 45 23 53 L49 53 C43 45 42 37 44 28Z" /><circle cx="36" cy="21" r="10" /><ellipse cx="36" cy="32" rx="12" ry="3.5" /></>,
    r: <><path d="M24 26 L26 43 Q26 48 22 53 L50 53 Q46 48 46 43 L48 26Z" /><path d="M19 12 H27 V19 H32 V12 H40 V19 H45 V12 H53 V27 Q36 32 19 27Z" /><path d="M24 34 H48" fill="none" /></>,
    b: <><path d="M30 32 C31 42 27 48 22 53 H50 C45 48 41 42 42 32Z" /><path d="M36 9 C31 15 23 20 25 27 Q27 34 36 34 Q45 34 47 27 C49 20 41 15 36 9Z" /><circle cx="36" cy="8" r="3" /><path d="M39 15 L32 25" fill="none" strokeWidth="3" /><ellipse cx="36" cy="35" rx="13" ry="3.5" /></>,
    n: <><path d="M22 53 C24 44 30 40 36 35 L29 31 L22 35 L15 28 L24 17 L30 15 L31 8 L38 13 C51 16 55 32 50 53Z" /><path d="M38 18 Q49 24 46 43" fill="none" stroke={shine} strokeOpacity=".4" strokeWidth="2" /><circle cx="30" cy="23" r="2" fill={edge} stroke="none" /><path d="M17 29 L23 28 M25 16 L28 21" fill="none" /></>,
    q: <><path d="M29 32 C31 42 28 47 22 53 H50 C44 47 41 42 43 32Z" /><path d="M24 32 L17 16 L28 24 L36 12 L44 24 L55 16 L48 32Z" /><circle cx="17" cy="14" r="3.5" /><circle cx="36" cy="10" r="3.5" /><circle cx="55" cy="14" r="3.5" /><ellipse cx="36" cy="33" rx="14" ry="4" /></>,
    k: <><path d="M27 30 C31 40 29 46 22 53 H50 C43 46 41 40 45 30Z" /><path d="M27 6 H33 V1 H39 V6 H45 V12 H39 V19 H33 V12 H27Z" /><path d="M23 20 Q36 15 49 20 L45 31 Q36 35 27 31Z" /><ellipse cx="36" cy="33" rx="13" ry="3.5" /></>,
  };

  return <svg className="chess-piece" viewBox="0 0 72 76" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2=".15">
        <stop offset="0" stopColor={white ? "#a18b65" : "#111b25"} />
        <stop offset=".24" stopColor={white ? "#fff7da" : "#667687"} />
        <stop offset=".42" stopColor={white ? "#fffdf0" : "#3c4b59"} />
        <stop offset=".7" stopColor={white ? "#decca5" : "#17222d"} />
        <stop offset="1" stopColor={white ? "#90764f" : "#080f16"} />
      </linearGradient>
      <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor={white ? "#fff9df" : "#738292"} />
        <stop offset=".4" stopColor={white ? "#ddc89f" : "#2d3b48"} />
        <stop offset="1" stopColor={white ? "#8e744e" : "#080e15"} />
      </linearGradient>
    </defs>
    <ellipse cx="37" cy="70" rx="25" ry="4" fill="#0a131b" opacity=".23" />
    <g fill={fill} stroke={edge} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {shapes[type]}
      <ellipse cx="36" cy="53" rx="15" ry="4" />
      <path d="M22 53 Q23 58 17 61 L55 61 Q49 58 50 53Z" />
      <path d="M17 60 Q13 63 13 68 Q36 74 59 68 Q59 63 55 60Z" />
      <ellipse cx="36" cy="61" rx="19" ry="4" fill={`url(#${id}-rim)`} />
      <path d="M15 67 Q36 72 57 67" fill="none" stroke={shine} strokeOpacity=".45" />
    </g>
    <path d="M25 58 Q36 61 47 58" fill="none" stroke={shine} strokeWidth="1.2" strokeOpacity=".6" />
  </svg>;
}
