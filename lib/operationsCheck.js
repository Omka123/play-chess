// Reports contain labels and pass/fail states, never environment values.
export function operationsCheck(env, { production = true } = {}) {
  const checks = [];
  const add = (name, ok, action) => checks.push({ name, ok: Boolean(ok), ...(!ok ? { action } : {}) });
  let origin;
  try { origin = new URL(env.NEXTAUTH_URL); } catch { /* Report invalid URL below. */ }
  add("Application URL", origin && !origin.username && !origin.password && origin.pathname === "/" && !origin.search && !origin.hash && (production ? origin.protocol === "https:" && !["localhost", "127.0.0.1"].includes(origin.hostname) : ["http:", "https:"].includes(origin.protocol)), "Set NEXTAUTH_URL to the application origin; production requires HTTPS.");
  add("Google OAuth client", env.GOOGLE_CLIENT_ID?.endsWith(".apps.googleusercontent.com") && env.GOOGLE_CLIENT_SECRET?.length >= 16, "Configure the Google web client ID and secret; verify its exact callback URL in Google Console.");
  add("Session secret", env.NEXTAUTH_SECRET?.length >= 32, "Set an unpredictable NEXTAUTH_SECRET of at least 32 characters.");
  add("Shared storage", production ? Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) : Boolean(env.UPSTASH_REDIS_REST_URL) === Boolean(env.UPSTASH_REDIS_REST_TOKEN), "Set both Upstash REST variables for production; never configure only one.");
  if (env.UPSTASH_REDIS_REST_URL) {
    let database; try { database = new URL(env.UPSTASH_REDIS_REST_URL); } catch { /* Invalid below. */ }
    add("Database transport", database?.protocol === "https:" && !database.username && !database.password, "Use an HTTPS Upstash REST URL without embedded credentials.");
  }
  add("Maintenance secret", env.CRON_SECRET?.length >= 32, "Set an unpredictable CRON_SECRET of at least 32 characters on both application and worker.");
  add("Backup encryption key", /^[A-Za-z0-9+/]{43}=$/.test(env.GAMBIT_BACKUP_KEY || ""), "Configure a base64-encoded 32-byte backup key and retain it separately.");
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  add("Support contact", email.test(env.SUPPORT_EMAIL || ""), "Set a working SUPPORT_EMAIL and verify delivery manually.");
  const moderators = (env.MODERATOR_EMAILS || "").split(",").map((value) => value.trim()).filter(Boolean);
  add("Moderator allowlist", moderators.length > 0 && moderators.every((value) => email.test(value)), "Configure MODERATOR_EMAILS and verify permission boundaries.");
  return { ok: checks.every((check) => check.ok), mode: production ? "production" : "local", checks, limitations: "Configuration syntax only. Provider permissions, credential validity, Google callbacks, delivery, monitoring and scheduling require separate verification." };
}
