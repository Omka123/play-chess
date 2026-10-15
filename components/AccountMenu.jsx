"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function AccountMenu() {
  const { data: session, status } = useSession();
  if (status === "loading") return <span className="account-menu">Loading account…</span>;
  return <div className="account-menu">{session?.user ? <>
    <Link href="/account">{session.user.name || "My account"}</Link>
    <button className="btn" onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button>
  </> : <Link className="btn" href="/login">Sign in with Google</Link>}</div>;
}
