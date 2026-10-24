"use client";
import { useEffect, useState } from "react";
import { LESSONS } from "@/lib/lessons";
export default function OfflineStudy() {
  const [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [install, setInstall] = useState(null);
  async function removeDownloads() {
    setBusy(true);
    try {
      if ("caches" in window) for (const key of await caches.keys()) if (key.startsWith("chessnexa-public-")) await caches.delete(key);
      if ("serviceWorker" in navigator) for (const registration of await navigator.serviceWorker.getRegistrations()) if (new URL(registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || location.href).pathname === "/sw.js") await registration.unregister();
      setMessage("Offline downloads removed. Reload to stop the current offline worker. Your account data and board preferences are unchanged.");
    } catch { setMessage("Could not remove downloads. Retry or clear site storage in your browser settings."); }
    finally { setBusy(false); }
  }
  useEffect(() => { const handler = (event) => { event.preventDefault(); setInstall(event); }; window.addEventListener("beforeinstallprompt", handler); return () => window.removeEventListener("beforeinstallprompt", handler); }, []);
  async function prepare() { if (!("serviceWorker" in navigator)) { setMessage("Offline study is not supported in this browser."); return; } setBusy(true);
    try { const registration = await navigator.serviceWorker.register("/sw.js"); await navigator.serviceWorker.ready; const worker = registration.active || navigator.serviceWorker.controller; if (!worker) throw new Error("Reload this page, then download again.");
      await new Promise((resolve, reject) => { const channel = new MessageChannel(); const timer = setTimeout(() => reject(new Error("Download timed out. Stay connected and retry.")), 60000); channel.port1.onmessage = (event) => { clearTimeout(timer); event.data?.ok ? resolve() : reject(new Error("Download failed. Retry while connected.")); }; worker.postMessage({ type: "PREPARE_OFFLINE", lessonPaths: LESSONS.map((lesson) => `/learn/${lesson.slug}`) }, [channel.port2]); }); setMessage("Public training pages downloaded. Account and game data are never cached. Open /offline.html when disconnected.");
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  return <section className="card"><h2>Install and study offline</h2><p>Download public training pages and their app assets. Private API responses and account pages are excluded from the offline cache.</p><button className="btn primary" disabled={busy} onClick={prepare}>{busy ? "Downloading…" : "Download offline study"}</button>{install ? <button className="btn" onClick={async () => { await install.prompt(); setInstall(null); }}>Install ChessNexa</button> : <p>Use your browser’s “Install app” or “Add to Home Screen” option when available.</p>}<button className="btn" disabled={busy} onClick={removeDownloads}>Remove offline downloads</button><p role="status">{message}</p><a href="/offline.html">Open offline study page</a></section>;
}
