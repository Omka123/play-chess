import { apiUser, apiError } from "@/lib/apiSession";
import { createAutomaticEvent, eventReady, advanceEvents } from "@/lib/events";
export const runtime = "nodejs";
export async function POST(request) { try { const user = await apiUser(request, true); const input = await request.json(); const result = input.type === "create" ? await createAutomaticEvent(user, input) : input.type === "ready" ? await eventReady(user, input.id, input.ready) : null; if (!result) return Response.json({ error: "Invalid event action." }, { status: 400 }); await advanceEvents(); return Response.json(result); } catch (error) { return apiError(error); } }
