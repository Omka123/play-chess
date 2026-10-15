import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import ContentShell from "@/components/ContentShell";
import AccountMenu from "@/components/AccountMenu";
import GameHistory from "@/components/GameHistory";
import { listGames } from "@/lib/gameHistory";

export const metadata = { title: "Your player account | ChessNexa" };
export default async function Account() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  let games = [], historyError = false;
  try { games = await listGames(session.user.id); } catch { historyError = true; }
  return <ContentShell><h1>{session.user.name}</h1><p>{session.user.email}</p>
    <p>Your Google account is connected. Your player name is used automatically when you create or join a friend game.</p>
    <p><Link className="btn primary" href="/">Play chess</Link></p>
    {historyError ? <p role="alert">Game history is temporarily unavailable. Please refresh to retry.</p> : <GameHistory games={games} />}
    <AccountMenu />
  </ContentShell>;
}
