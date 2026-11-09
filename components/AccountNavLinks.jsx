"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

// These pages require an account, so signed-out visitors should not land on a sign-in screen from the main menu.
export default function AccountNavLinks() {
  const { data: session } = useSession();
  if (!session?.user) return null;
  return <><Link href="/insights">Insights</Link><Link href="/hub">Player hub</Link></>;
}
