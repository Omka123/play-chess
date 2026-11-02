import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const { upgradeMongoDocuments } = await import("../lib/mongoSchema.js");
const { closeMongo } = await import("../lib/mongoStore.js");
try { console.log(JSON.stringify(await upgradeMongoDocuments({ apply: process.argv.includes("--apply") }))); }
catch { console.error("MongoDB document conversion stopped. Existing records were preserved where conversion could not be verified. Pause writes and inspect before retrying."); process.exitCode = 1; }
finally { await closeMongo(); }
