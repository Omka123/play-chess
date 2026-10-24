// A persistent worker for any deployment. No credentials are printed.
const origin = process.env.NEXTAUTH_URL;
const secret = process.env.CRON_SECRET;
if (!origin || !secret) throw new Error("Set NEXTAUTH_URL and CRON_SECRET before starting maintenance.");
const url = new URL(origin);
if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Remote maintenance requires HTTPS.");
async function tick() {
  let cursor = "0", pages = 0;
  do {
    const target = new URL("/api/cron/maintenance", url); target.searchParams.set("cursor", cursor);
    const response = await fetch(target, { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(55000), redirect: "error" });
    if (!response.ok) throw new Error(`Maintenance returned status ${response.status}.`);
    const result = await response.json(); cursor = result.cursor;
    if (!/^\d{1,20}$/.test(cursor)) throw new Error("Invalid maintenance response.");
    if (result.failed) throw new Error("Some rooms could not be settled. Check storage and retry maintenance.");
    pages++;
  } while (cursor !== "0" && pages < 1000);
  if (cursor !== "0") throw new Error("Maintenance exceeded 1000 pages; increase worker capacity before retrying.");
}
let stopped = false;
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { stopped = true; });
do {
  try { await tick(); console.log("Maintenance cycle completed."); }
  catch (error) { console.error(error.message); if (process.argv.includes("--once")) process.exitCode = 1; }
  if (!process.argv.includes("--once") && !stopped) await new Promise((resolve) => setTimeout(resolve, 15000));
} while (!process.argv.includes("--once") && !stopped);
