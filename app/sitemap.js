import { LESSONS } from "@/lib/lessons";
import { siteUrl } from "@/lib/site";
export default function sitemap() {
  const base = siteUrl();
  if (!base) return [];
  return ["", "/learn", "/training", "/analysis", "/about", "/editorial", "/contact", "/advertise", "/privacy", "/terms", ...LESSONS.map((lesson) => `/learn/${lesson.slug}`)]
    .map((path) => ({ url: `${base}${path}` }));
}
