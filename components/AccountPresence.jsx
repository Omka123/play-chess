"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
export default function AccountPresence() {
  const { data: account } = useSession();
  useEffect(() => {
    if (!account?.user?.id) return;
    let cancelled = false, timer;
    const heartbeat = async () => {
      try { if (document.visibilityState === "visible") await fetch("/api/community", { cache: "no-store" }); } catch { /* Retry on the next heartbeat. */ }
      if (!cancelled) timer = setTimeout(heartbeat, 30000);
    };
    heartbeat();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [account?.user?.id]);
  return null;
}
