import { notFound } from "next/navigation";
import ContentShell from "@/components/ContentShell";
import SharedReplay from "@/components/SharedReplay";
import { sharedGame } from "@/lib/gameHistory";
export const dynamic = "force-dynamic";
export const metadata = { title: "Shared game replay | ChessNexa", robots: { index: false, follow: false } };
export default async function SharedGamePage({ params }) {
  const { id } = await params;
  const game = await sharedGame(id);
  if (!game) notFound();
  return <ContentShell><SharedReplay game={game} /></ContentShell>;
}
