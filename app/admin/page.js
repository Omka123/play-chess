import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/adminAccess";
import { adminOverview } from "@/lib/admin";
import ContentShell from "@/components/ContentShell";
import AdminDashboard from "@/components/AdminDashboard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin | ChessNexa", robots: { index: false, follow: false } };
export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!isAdmin(session.user)) notFound();
  return <ContentShell><div className="admin-heading"><div><span className="eyebrow">OWNER WORKSPACE</span><h1>Site administration</h1><p>Manage ChessNexa players, reports and community access.</p></div><span className="admin-owner-badge">Owner access</span></div><AdminDashboard initial={await adminOverview(session.user)} /></ContentShell>;
}
