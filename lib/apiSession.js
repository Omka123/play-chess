import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { communityTransaction } from "./communityStore.js";
import { recordServiceError } from "./operations.js";
export async function apiUser(request, mutation = false) {
  if (mutation && request.headers.get("origin") !== new URL(request.url).origin) throw Object.assign(new Error("Invalid request origin."), { status: 403 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw Object.assign(new Error("Sign in to continue."), { status: 401 });
  if (await communityTransaction((state) => Boolean(state.players[session.user.id]?.deleted), { readOnly: true })) throw Object.assign(new Error("This account has been deleted."), { status: 403 });
  return session.user;
}
export const apiError = (error) => { recordServiceError(error.status || 503); return Response.json({ error: error.status ? error.message : "The service is unavailable. Please try again." }, { status: error.status || 503 }); };
