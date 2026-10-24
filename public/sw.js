const CACHE = "chessnexa-public-v1";
const PAGES = ["/offline.html", "/improve", "/training", "/learn"];
const publicPage = (pathname) => PAGES.includes(pathname) || /^\/learn\/[a-z0-9-]+$/.test(pathname);
self.addEventListener("install", (event) => { event.waitUntil(caches.open(CACHE).then((cache) => cache.add("/offline.html"))); self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(Promise.all([self.clients.claim(), caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("chessnexa-public-") && key !== CACHE).map((key) => caches.delete(key))))])); });
const asset = (url) => url.pathname.startsWith("/_next/static/") || url.pathname === "/chessnexa-icon.svg";
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || (!asset(url) && !(event.request.mode === "navigate" && publicPage(url.pathname)))) return;
  event.respondWith((async () => { const cache = await caches.open(CACHE); try { const response = await fetch(event.request); if (response.ok) await cache.put(event.request, response.clone()); return response; } catch { return await cache.match(event.request) || (event.request.mode === "navigate" ? await cache.match("/offline.html") : Response.error()); } })());
});
self.addEventListener("message", (event) => {
  if (event.data?.type !== "PREPARE_OFFLINE") return;
  event.waitUntil((async () => {
    try { const cache = await caches.open(CACHE);
      const pages = [...PAGES, ...(Array.isArray(event.data.lessonPaths) ? event.data.lessonPaths.slice(0, 20).filter((path) => typeof path === "string" && /^\/learn\/[a-z0-9-]+$/.test(path)) : [])];
      for (const page of pages) { const response = await fetch(page); if (!response.ok) throw new Error("Unable to download lessons."); const html = await response.clone().text(); await cache.put(page, response);
        const paths = [...html.matchAll(/(?:src|href)="([^" ]+)"/g)].map((match) => match[1].replaceAll("&amp;", "&")).filter((path) => path.startsWith("/_next/static/"));
        for (const path of new Set(paths)) if (!await cache.match(path)) { const response = await fetch(path); if (response.ok) await cache.put(path, response); }
      }
      event.ports[0]?.postMessage({ ok: true });
    } catch { event.ports[0]?.postMessage({ ok: false }); }
  })());
});
