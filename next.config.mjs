import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

// Keep production builds from overwriting a running development server's chunks.
export default function nextConfig(phase) {
  return {
    reactStrictMode: true,
    distDir: phase === PHASE_DEVELOPMENT_SERVER
      ? `.next-dev/${/^[a-f0-9-]+$/.test(process.env.CHESSNEXA_DEV_SESSION || "") ? process.env.CHESSNEXA_DEV_SESSION : "manual"}`
      : ".next",
  };
}
