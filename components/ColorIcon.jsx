/** Decorative, local SVG icons. Text labels remain the accessible names. */
export default function ColorIcon({ name, size = 24, className = "" }) {
  const icons = {
    play: <><rect x="3" y="5" width="26" height="20" rx="5" fill="#6fba55"/><path d="m14 11 8 5-8 5Z" fill="#fff"/><path d="M11 29h10M16 25v4" stroke="#a4da83" strokeWidth="2.5" strokeLinecap="round"/></>,
    bot: <><path d="M16 4v4" stroke="#87afff" strokeWidth="2.5"/><circle cx="16" cy="3" r="2" fill="#f7c85b"/><rect x="5" y="8" width="22" height="20" rx="7" fill="#779feb"/><path d="M3 15v7m26-7v7" stroke="#b8ccf5" strokeWidth="3" strokeLinecap="round"/><circle cx="11" cy="16" r="2.5" fill="#fff"/><circle cx="21" cy="16" r="2.5" fill="#fff"/><path d="M12 23h8" stroke="#284e9c" strokeWidth="2.5" strokeLinecap="round"/></>,
    friends: <><circle cx="11" cy="10" r="5" fill="#78baff"/><circle cx="23" cy="11" r="4" fill="#bba0f3"/><path d="M1 27v-4a10 10 0 0 1 20 0v4Z" fill="#568fda"/><path d="M21 18a8 8 0 0 1 10 8v1h-8v-4Z" fill="#9c7bd6"/><path d="M8 23h6" stroke="#dbeaff" strokeWidth="2" strokeLinecap="round"/></>,
    puzzle: <><path d="M5 5h8a4 4 0 1 1 6 0h8v8a4 4 0 1 1 0 6v8h-8a4 4 0 1 0-6 0H5v-8a4 4 0 1 1 0-6Z" fill="#f2ae43"/><path d="M6 6h6M6 6v5" stroke="#ffe3a1" strokeWidth="2" strokeLinecap="round"/></>,
    history: <><rect x="6" y="3" width="22" height="26" rx="4" fill="#9d83df"/><path d="M11 9h11M11 14h7" stroke="#f2ecff" strokeWidth="2.5" strokeLinecap="round"/><circle cx="11" cy="23" r="8" fill="#6dbfc4" stroke="#292b32" strokeWidth="2"/><path d="M11 18v5l3 2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></>,
    learn: <><path d="M16 7C11 3 6 4 2 5v21c5-1 10-1 14 2 4-3 9-3 14-2V5c-4-1-9-2-14 2Z" fill="#5ec4bc"/><path d="M16 8v19" stroke="#287f82" strokeWidth="2"/><path d="m6 10 6 1m-6 5 6 1m8-6 6-1m-6 7 6-1" stroke="#dcffed" strokeWidth="2" strokeLinecap="round"/></>,
    user: <><circle cx="16" cy="16" r="15" fill="#6e9ddd"/><circle cx="16" cy="12" r="5" fill="#eff6ff"/><path d="M6 27a10 10 0 0 1 20 0" fill="#c4def9"/></>,
    logout: <><rect x="4" y="4" width="16" height="24" rx="4" fill="#de9699"/><path d="M14 16h15m-5-5 5 5-5 5" stroke="#fff0e3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></>,
    sound: <><path d="M3 12h6l9-8v24l-9-8H3Z" fill="#62c6b6"/><path d="M23 10a9 9 0 0 1 0 12m4-16a15 15 0 0 1 0 20" stroke="#a2e2d1" strokeWidth="2.5" strokeLinecap="round" fill="none"/></>,
    mute: <><path d="M3 12h6l9-8v24l-9-8H3Z" fill="#8493a5"/><path d="m23 12 7 8m0-8-7 8" stroke="#eb9c9c" strokeWidth="2.5" strokeLinecap="round"/></>,
    flip: <><path d="M6 10a12 12 0 0 1 20 0m0 12a12 12 0 0 1-20 0" stroke="#64c4d8" strokeWidth="3" fill="none"/><path d="M26 3v8h-8M6 29v-8h8" stroke="#b2eaf3" strokeWidth="3" strokeLinejoin="round" fill="none"/></>,
    undo: <><path d="M12 8 4 15l8 7v-5h8a6 6 0 0 1 6 6v3c6-10 1-15-6-15h-8Z" fill="#e9b65f"/></>,
    flag: <><path d="M8 3v27" stroke="#c9d1dd" strokeWidth="3" strokeLinecap="round"/><path d="M10 4c6-4 12 5 19 0v14c-7 5-13-4-19 0Z" fill="#ed7c7b"/></>,
    star: <path d="m16 2 4 9 10 1-8 7 3 11-9-6-9 6 3-11-8-7 10-1Z" fill="#f4c55c" stroke="#fff0b3" strokeWidth="1.2"/>,
    knight: <><path d="m12 4 4 3 5-3 1 7 6 7-5 5-5-3-2 4h9v5H5v-5l4-7 4-5-5 1-3-3Z" fill="#9acb65" stroke="#568a37" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="18" cy="11" r="1.4" fill="#28472c"/></>,
  };
  return <svg className={`color-icon ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">{icons[name] || icons.star}</svg>;
}
