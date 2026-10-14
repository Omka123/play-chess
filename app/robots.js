import { siteUrl } from "@/lib/site";
export default function robots() {
  const base = siteUrl();
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, ...(base ? { sitemap: `${base}/sitemap.xml` } : {}) };
}
