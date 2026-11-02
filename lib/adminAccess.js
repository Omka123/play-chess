// Ownership comes only from server configuration and the verified Google session.
// Client roles, profile flags and moderator membership never grant admin access.
export function isAdmin(user) {
  const id = process.env.ADMIN_USER_ID?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(id && email && user?.id === id && typeof user.email === "string" && user.email.toLowerCase() === email);
}
export function requireAdmin(user) {
  if (!isAdmin(user)) throw Object.assign(new Error("Administrator access required."), { status: 403 });
}
