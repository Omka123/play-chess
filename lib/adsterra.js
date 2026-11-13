// Publisher unit IDs are public. Google AdSense and Adsterra are separate providers.
export const adProvider = () => process.env.NEXT_PUBLIC_AD_PROVIDER || "adsterra";
export const ADSTERRA = {
  units: {
    mobile: { key: "1356fcc96fdfaeb1ebf88c825d206c01", width: 300, height: 250 },
    banner: { key: "5a5baf75805fd994abb599fa33cc48c6", width: 468, height: 60 },
    leaderboard: { key: "2fd96529db421387e68c7d03efe697af", width: 728, height: 90 },
    rectangle: { key: "9de5df166a7a57c683d463546fc6060f", width: 160, height: 300 },
    skyscraper: { key: "f36420a7828bc2e11677a4cfd19c91b6", width: 160, height: 600 },
  },
};
export function bannerUnit(width) { return width >= 728 ? "leaderboard" : width >= 468 ? "banner" : width >= 300 ? "mobile" : null; }
export function adsterraPage(path) { return path === "/" || path === "/learn" || path.startsWith("/learn/"); }
export function adsterraDocument(unit) {
  const { key, width, height } = ADSTERRA.units[unit];
  // Each iframe has its own atOptions global, avoiding collisions across units.
  return `<!doctype html><html><head><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body><script>var atOptions=${JSON.stringify({ key, format: "iframe", height, width, params: {} })};</script><script data-cfasync="false" src="https://bauval.org/22/${key}"></script></body></html>`;
}
