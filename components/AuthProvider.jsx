"use client";
import { SessionProvider } from "next-auth/react";
import AccountPresence from "./AccountPresence";
import BoardPreferences from "./BoardPreferences";
import NetworkStatus from "./NetworkStatus";
export default function AuthProvider({ children }) {
  return <SessionProvider><BoardPreferences /><NetworkStatus /><AccountPresence />{children}</SessionProvider>;
}
