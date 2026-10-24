import { timingSafeEqual } from "node:crypto";
import { advanceEvents } from "@/lib/events";
import { apiError } from "@/lib/apiSession";
export const runtime = "nodejs";
export async function GET(request) { const secret = process.env.CRON_SECRET; const provided = request.headers.get("authorization") || ""; const expected = `Bearer ${secret}`; if (!secret || Buffer.byteLength(provided) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return new Response(null, { status: 401 }); try { return Response.json(await advanceEvents()); } catch (error) { return apiError(error); } }
