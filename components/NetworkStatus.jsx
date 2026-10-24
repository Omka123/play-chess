"use client";
import { useEffect, useState } from "react";
export default function NetworkStatus() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  return offline ? <div className="network-status" role="status">You are offline. Downloaded lessons and local practice remain available. Online game clocks continue on the server; reconnect to sync your game.</div> : null;
}
