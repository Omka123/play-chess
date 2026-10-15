import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, googleAuthEnabled } from "@/lib/auth";
import ContentShell from "@/components/ContentShell";
import GoogleLogin from "@/components/GoogleLogin";

export const metadata = { title: "Sign in | ChessNexa" };
export default async function Login({ searchParams }) {
  if (await getServerSession(authOptions)) redirect("/account");
  const params = await searchParams;
  return <ContentShell><section className="signin-layout" aria-label="Sign in to ChessNexa">
    <div className="signin-story">
      <span className="signin-overline">YOUR NEXT GREAT MOVE</span>
      <div className="signin-board-art" aria-hidden="true"><span>&#9822;</span></div>
      <h2>A little chess.<br />A better you.</h2>
      <p>Play a friend, find your next move, and make every game a lesson.</p>
      <div className="signin-benefits"><span><i aria-hidden="true">✓</i> Your own player profile</span><span><i aria-hidden="true">✓</i> Saved games & move-by-move review</span><span><i aria-hidden="true">✓</i> Friends, bots & daily practice</span></div>
    </div>
    <div className="signin-card">
      <span className="signin-emblem" aria-hidden="true">&#9822;</span>
      <h1>Welcome to<br />ChessNexa</h1>
      <p className="signin-description">Your board. Your progress. Your next move.</p>
      {params.error && <p className="signin-notice signin-error" role="alert">Sign-in could not be completed. Try again with a verified Google account, or contact the site owner.</p>}
      <GoogleLogin enabled={googleAuthEnabled} />
      <p className="signin-account-note">New here? Your account is created automatically.</p>
      <div className="signin-divider"><span>or take a seat</span></div>
      <Link className="signin-guest" href="/">Play as a guest <span aria-hidden="true">→</span></Link>
      <p className="signin-privacy">We use your Google name, email, and profile photo to set up your account.</p>
      <p className="signin-terms">By continuing, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy policy</Link>.</p>
    </div>
  </section>
  </ContentShell>;
}
