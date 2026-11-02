"use client";
import { useEffect, useState } from "react";
export default function ConnectionStatus({ connection, retry }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (connection.status === "connected") return; const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer); }, [connection.status]);
  const seconds = Math.max(0, Math.ceil((connection.retryAt - now) / 1000));
  return <div className={`connection-status connection-${connection.status}`}>
    <p role="status">{connection.status === "connected" ? `Connected · ${Math.round(connection.rttMs || 0)} ms round-trip` : connection.status === "offline" ? "Offline. Your clock continues on the server." : connection.status === "retrying" ? `Connection interrupted. Retrying in ${seconds}s. Your clock continues on the server.` : "Connecting to your game…"}</p>
    {connection.status !== "connected" && <button className="btn" onClick={retry}>Reconnect now</button>}
  </div>;
}
