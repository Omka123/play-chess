"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import SoundSettings from "./SoundSettings";
import ColorIcon from "./ColorIcon";

export default function AccountMenu() {
  const { data: session, status } = useSession();
  if (status === "loading") return <span className="account-menu">Loading account…</span>;
  return <div className="account-menu">{session?.user ? <>
    <Link href="/account"><ColorIcon name="user" />{session.user.name || "My account"}</Link>
    <button className="btn" onClick={() => signOut({ callbackUrl: "/" })}><ColorIcon name="logout" />Sign out</button>
  </> : <Link className="btn" href="/login">Sign in with Google</Link>}<SoundSettings /></div>;
}
