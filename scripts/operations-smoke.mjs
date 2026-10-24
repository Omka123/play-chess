// Read-only public probes. No Google sessions or live games are created.
const args = process.argv.slice(2);
const source = args.find((value) => !value.startsWith("--")) || process.env.NEXTAUTH_URL;
let origin;
try { origin = new URL(source); } catch { console.error("Supply an application origin or set NEXTAUTH_URL."); process.exit(1); }
if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/" || (origin.protocol !== "https:" && !(origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname)))) { console.error("Use an HTTPS application origin, or HTTP localhost, without credentials."); process.exit(1); }
const probes = [
  ["Storage health", "/api/health", 200, (body) => body.status === "ok"],
  ["Account API requires sign-in", "/api/account/export", 401],
  ["Moderation API requires sign-in", "/api/moderation", 401],
  ["Maintenance rejects missing credentials", "/api/cron/maintenance", 401],
  ["Web manifest", "/manifest.webmanifest", 200, (body) => Array.isArray(body.icons) && body.icons.some((icon) => icon.sizes === "512x512")],
];
let failed = false;
for (const [name, path, status, validate] of probes) {
  try {
    const response = await fetch(new URL(path, origin), { redirect: "manual", signal: AbortSignal.timeout(15000) });
    const ok = response.status === status && (!validate || validate(await response.json()));
    console.log(`${ok ? "PASS" : "FAIL"} ${name} (HTTP ${response.status})`); failed ||= !ok;
  } catch { failed = true; console.log(`FAIL ${name} (request failed)`); }
}
console.log("Read-only smoke checks do not verify Google sign-in, rated games, backups or scheduler operation.");
if (failed) process.exitCode = 1;
