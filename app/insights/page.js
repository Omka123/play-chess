import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { listGames } from "@/lib/gameHistory";
import { performanceInsights } from "@/lib/performanceInsights";
import ContentShell from "@/components/ContentShell";
import PerformanceInsights from "@/components/PerformanceInsights";
export const metadata = { title: "Performance insights | ChessNexa" };
export default async function Insights() { const session = await getServerSession(authOptions); if (!session?.user?.id) redirect("/login"); return <ContentShell><PerformanceInsights insights={performanceInsights(await listGames(session.user.id))} /></ContentShell>; }
