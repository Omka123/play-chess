import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ContentShell from "@/components/ContentShell";
import ReportForm from "@/components/ReportForm";
export const metadata = { title: "Report a problem | ChessNexa", robots: { index: false, follow: false } };
export default async function ReportPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  return <ContentShell><span className="eyebrow">COMMUNITY SUPPORT</span><h1>Report a problem</h1><p>Help us keep chess welcoming and fair. Give a clear account of what happened; moderators review reports before taking action. Game reports must concern a game linked to your account.</p>
    {session?.user?.id ? <ReportForm initialType={params.type} initialTarget={typeof params.target === "string" ? params.target.slice(0, 500) : ""} /> : <p><Link className="btn primary" href="/login">Sign in to submit a report</Link></p>}
    <p>For a guide correction, privacy request or suspension appeal, use <Link href="/contact">Contact</Link>. Include your report reference when following up.</p>
  </ContentShell>;
}
