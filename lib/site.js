export const operator = process.env.SITE_OPERATOR?.trim() || "";
const email = process.env.SUPPORT_EMAIL?.trim() || "";
export const supportEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
export function siteUrl() {
  try {
    const url = new URL(process.env.SITE_URL);
    if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
  } catch { /* Public URL has not been configured. */ }
  return null;
}
