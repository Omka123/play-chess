"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
export const applyBoardPreferences = (settings) => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.boardTheme = settings.boardTheme || "green";
  document.documentElement.dataset.pieceStyle = settings.pieceStyle || "classic";
  document.documentElement.dataset.coordinates = settings.coordinates === false ? "off" : "on";
  try { localStorage.setItem("gambit:board-settings", JSON.stringify(settings)); } catch { /* Preferences remain applied in memory. */ }
};
export default function BoardPreferences() {
  const { data: session, status } = useSession();
  useEffect(() => { try { const settings = JSON.parse(localStorage.getItem("gambit:board-settings") || "null"); if (settings) applyBoardPreferences(settings); } catch { /* Use default board styles. */ } }, []);
  useEffect(() => {
    if (status !== "authenticated") return;
    const controller = new AbortController();
    fetch("/api/academy", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) return;
      const value = await response.json();
      if (!controller.signal.aborted && value.profile?.settings) applyBoardPreferences(value.profile.settings);
    }).catch(() => { /* Keep local preferences available offline. */ });
    return () => controller.abort();
  }, [status, session?.user?.email]);
  return null;
}
