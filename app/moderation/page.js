import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isModerator, moderationOverview } from "@/lib/moderation";
import ContentShell from "@/components/ContentShell";
import ModerationDashboard from "@/components/ModerationDashboard";
export const metadata = { title: "Moderation | ChessNexa", robots: { index: false, follow: false } };
export default async function ModerationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!isModerator(session.user)) notFound();
  const data = await moderationOverview(session.user);
  return <ContentShell><span className="eyebrow">PRIVATE MODERATOR WORKSPACE</span><h1>Community moderation</h1><p>Review reports, manage player access, and hide inappropriate shared replays. Record the reason for each decision.</p><ModerationDashboard initial={data} /></ContentShell>;
}
