import ContentShell from "@/components/ContentShell";
import WatchGame from "@/components/WatchGame";
export const metadata = { title: "Watch a game | ChessNexa", robots: { index: false, follow: false } };
export default async function Watch({ params }) { const { id } = await params; return <ContentShell><WatchGame id={id} /></ContentShell>; }
