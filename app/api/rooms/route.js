import { createRoom } from "@/lib/rooms";
export const runtime = "nodejs";
export async function POST(request) {
  let input;
  try { input = await request.json(); }
  catch { return Response.json({ error: "Invalid game settings." }, { status: 400 }); }
  try { return Response.json(await createRoom(input), { status: 201, headers: { "Cache-Control": "no-store" } }); }
  catch (error) {
    console.error("Room creation failed", { code: error.code, status: error.status });
    return Response.json({ error: error.status ? error.message : "Could not create a game. Please try again." }, { status: error.status || 500 });
  }
}
