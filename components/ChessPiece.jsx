"use client";
import { memo } from "react";

// Original vector silhouettes drawn to match the supplied classic-piece reference.
function ChessPiece({ type, color }) {
  const white = color === "w";
  const fill = white ? "#fafaf8" : "#595852";
  const edge = white ? "#5a5a50" : "#34352e";
  const detail = edge;
  const shapes = {
    p: <>
      <path d="M30 36 C32 44 28 49 23 53 C18 57 17 63 15 68 H57 C55 63 54 57 49 53 C44 49 40 44 42 36Z" />
      <circle cx="36" cy="25" r="10" />
      <path d="M25 35 Q36 39 47 35 L45 40 Q36 43 27 40Z" />
    </>,
    r: <>
      <path d="M24 28 L27 47 L23 57 H49 L45 47 L48 28Z" />
      <path d="M16 9 H25 L26 18 H31 V9 H41 V18 H46 L47 9 H56 L53 26 Q36 31 19 26Z" />
      <path d="M25 33 H47 M26 49 Q36 47 46 49" fill="none" stroke={detail} />
    </>,
    b: <>
      <path d="M26 46 Q30 51 24 57 H48 Q42 51 46 46Z" />
      <path fillRule="evenodd" d="M36 10 C31 16 22 26 22 36 C22 45 28 51 36 51 C44 51 50 45 50 36 C50 26 42 16 36 10Z M36 17 L40 20 L33 38 L29 36Z" />
      <circle cx="36" cy="9" r="4" />
    </>,
    n: <>
      <path d="M23 57 C23 48 30 43 36 36 L30 32 L23 37 Q19 39 15 35 L12 31 L24 16 L30 14 L34 5 L40 12 C54 15 58 28 55 43 L51 57Z" />
      <path d="M42 20 Q52 29 45 43 Q41 49 36 53 M17 31 L23 30 M27 18 L30 22" fill="none" stroke={detail} strokeWidth="2" />
      <circle cx="33" cy="25" r="2" fill={detail} stroke="none" />
    </>,
    q: <>
      <path d="M24 39 Q29 48 23 57 H49 Q43 48 48 39Z" />
      <path d="M23 43 L12 23 L22 29 L24 12 L31 28 L36 9 L41 28 L48 12 L50 29 L60 23 L49 43Z" />
      {[ [12, 20], [24, 10], [36, 7], [48, 10], [60, 20] ].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="4" />)}
      <path d="M24 47 Q36 45 48 47" fill="none" stroke={detail} />
    </>,
    k: <>
      <path d="M24 41 Q29 49 23 57 H49 Q43 49 48 41Z" />
      <path d="M32 3 H40 V10 H48 V17 H40 V26 H32 V17 H24 V10 H32Z" />
      <path fillRule="evenodd" d="M36 29 C28 15 12 20 13 31 C14 39 23 44 27 48 H45 C49 44 58 39 59 31 C60 20 44 15 36 29Z M24 28 Q32 28 32 39 Q23 36 21 32 Q20 28 24 28Z M48 28 Q52 28 51 32 Q49 36 40 39 Q40 28 48 28Z" />
    </>,
  };

  return <svg className="chess-piece" viewBox="0 0 72 76" aria-hidden="true" focusable="false">
    <g fill={fill} stroke={edge} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      {shapes[type]}
      {type !== "p" && <>
        <path d="M23 57 H49 Q57 57 57 63 V68 H15 V63 Q15 57 23 57Z" />
        <path d="M18 61 H54" fill="none" stroke={detail} strokeWidth="1.5" />
      </>}
    </g>
  </svg>;
}
export default memo(ChessPiece);
