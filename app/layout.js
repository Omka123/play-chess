import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/site";
import AuthProvider from "@/components/AuthProvider";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const font = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });

export const metadata = {
  ...(siteUrl() ? { metadataBase: new URL(siteUrl()) } : {}),
  title: "ChessNexa: Play Chess",
  description: "Invite friends to play chess online, challenge five bots, and solve checkmate puzzles.",
  other: { "google-adsense-account": "ca-pub-9915062612412572" },
};

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={font.variable}>
      <head>
        {process.env.NODE_ENV === "production" && <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9915062612412572" crossOrigin="anonymous" />}
      </head>
      <body><AuthProvider>{children}</AuthProvider><GoogleAnalytics /></body>
    </html>
  );
}
