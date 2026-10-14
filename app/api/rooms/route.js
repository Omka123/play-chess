import { createRoom } from "@/lib/rooms";
export const runtime = "nodejs";
export async function POST(request) {
  try { return Response.json(await createRoom(await request.json()), { status: 201 }); }
  catch { return Response.json({ error: "Could not create a game. Please try again." }, { status: 500 }); }
}
