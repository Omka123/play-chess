import { notFound } from "next/navigation";
import ContentShell from "@/components/ContentShell";
import { publicProfile } from "@/lib/platform";
export const dynamic = "force-dynamic";
export const metadata = { title: "Player profile | ChessNexa" };
export default async function Player({ params }) {
  const { username } = await params; const player = await publicProfile(username); if (!player) notFound();
  return <ContentShell><h1>{player.name}</h1><p>@{player.username}</p><div className="rating-cards">{Object.entries(player.ratings).map(([category, value]) => <div className="card" key={category}><span>{category}</span><strong>{value}</strong></div>)}</div><p>{player.ratedCount} rated games · Puzzle rating {player.puzzleRating} · {player.lessonsCompleted} lessons completed</p><p>To send a friend request, enter this username in <a href="/account">your account</a>.</p></ContentShell>;
}
