import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/site";
import AuthProvider from "@/components/AuthProvider";

const font = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });

export const metadata = {
  ...(siteUrl() ? { metadataBase: new URL(siteUrl()) } : {}),
  title: "ChessNexa: Play Chess",
  description: "Invite friends to play chess online, challenge five bots, and solve checkmate puzzles.",
};

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={font.variable}>
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
