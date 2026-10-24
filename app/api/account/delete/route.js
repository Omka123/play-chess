import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/apiSession";
import { deleteAccountData } from "@/lib/accountDeletion";
export const runtime = "nodejs";
export async function POST(request) { try { if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid origin." }, { status: 403 }); const session = await getServerSession(authOptions); const { confirmation } = await request.json(); return Response.json(await deleteAccountData(session?.user, confirmation)); } catch (error) { return apiError(error); } }
