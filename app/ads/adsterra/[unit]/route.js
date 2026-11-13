import { ADSTERRA, adsterraDocument } from "@/lib/adsterra";

export const runtime = "nodejs";
export async function GET(_request, { params }) {
  const { unit } = await params;
  if (!Object.hasOwn(ADSTERRA.units, unit)) return new Response("Ad unit not found.", { status: 404 });
  return new Response(adsterraDocument(unit), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy": "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox",
    },
  });
}
