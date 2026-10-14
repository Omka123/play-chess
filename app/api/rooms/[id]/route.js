import { accessRoom } from "@/lib/rooms";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(request, context, action) {
  try {
    const { id } = await context.params;
    const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
    return Response.json(await accessRoom(id, token, action), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error.status ? error.message : "Could not update the game. Please try again." }, { status: error.status || 500 });
  }
}
export async function GET(request, context) { return handle(request, context); }
export async function POST(request, context) {
  let action;
  try { action = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  return handle(request, context, action);
}
