import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import ContentShell from "@/components/ContentShell";
import PlayerHub from "@/components/PlayerHub";
export const metadata = { title: "Player hub | ChessNexa" };
export default async function Hub() { const session = await getServerSession(authOptions); if (!session?.user?.id) redirect("/login?callbackUrl=/hub"); return <ContentShell><PlayerHub /></ContentShell>; }
