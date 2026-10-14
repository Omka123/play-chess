export function resolveFriendSession(search, hash, saved) {
  const id = new URLSearchParams(search).get("room");
  const secret = new URLSearchParams(hash.replace(/^#/, "")).get("invite");
  // Browsers may copy sessionStorage into a newly opened tab. An explicit
  // invitation must take priority over that copied host session.
  if (id && secret) return { invite: { id, token: secret } };
  if (saved && typeof saved.id === "string" && typeof saved.token === "string" && (!id || saved.id === id)) {
    return { session: saved };
  }
  return {};
}
