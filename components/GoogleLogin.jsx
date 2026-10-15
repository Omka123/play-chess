"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
export default function GoogleLogin({ enabled }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <><button className="google-signin-button" aria-busy={busy} disabled={!enabled || busy} onClick={async () => {
    setBusy(true);
    try { await signIn("google", { callbackUrl: "/" }); }
    catch { setError("Could not connect to Google. Please try again."); setBusy(false); }
  }}><svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.5-.1-3-.4-4.5H24v8.5h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15.3Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.5a12 12 0 0 1 0-7V15H5.8a20 20 0 0 0 0 18l6.8-5.5Z"/><path fill="#EA4335" d="M24 12.1c3 0 5.6 1 7.7 3l5.8-5.8A19.4 19.4 0 0 0 24 4 20.4 20.4 0 0 0 5.8 15l6.8 5.5c1.6-4.8 6.1-8.4 11.4-8.4Z"/></svg><span>{busy ? "Connecting to Google…" : "Continue with Google"}</span>{busy && <span className="signin-spinner" aria-hidden="true" />}</button>
  {!enabled && <p className="signin-notice" role="status">Google sign-in is being set up. You can still play as a guest.</p>}
  {error && <p className="signin-notice signin-error" role="alert">{error}</p>}</>;
}
