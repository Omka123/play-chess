import { recordServiceError } from "@/lib/operations";
let windowStart = 0, count = 0;
export async function POST(request) { if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 }); if (Date.now() - windowStart > 60000) { windowStart = Date.now(); count = 0; } if (++count > 60) return new Response(null, { status: 429 }); recordServiceError(500, "client"); return new Response(null, { status: 204 }); }
