import Script from "next/script";

export default function GoogleAnalytics() {
  const measurementId = process.env.GOOGLE_ANALYTICS_ID || "G-6P7MVWK6YT";
  if (process.env.NODE_ENV !== "production" || process.env.GOOGLE_ANALYTICS_ENABLED === "false" || !/^G-[A-Z0-9]+$/.test(measurementId)) return null;

  return <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
    <Script id="google-analytics" strategy="afterInteractive">{`
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}', {
        allow_google_signals: false,
        allow_ad_personalization_signals: false
      });
    `}</Script>
  </>;
}
