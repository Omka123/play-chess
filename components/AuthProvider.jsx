"use client";
import { SessionProvider } from "next-auth/react";
import AccountPresence from "./AccountPresence";
export default function AuthProvider({ children }) {
  return <SessionProvider><AccountPresence />{children}</SessionProvider>;
}
