import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { developmentOrigin } from "../lib/developmentOrigin.js";

const require = createRequire(import.meta.url);
const authOrigin = developmentOrigin(process.argv.slice(2), process.env);
console.log(`Local Google sign-in: ${authOrigin}/api/auth/callback/google`);
// Each invocation gets its own cache, inherited by Next.js and its workers.
const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, NEXTAUTH_URL: authOrigin, CHESSNEXA_DEV_SESSION: randomUUID() },
});
server.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
server.on("exit", (code) => { process.exitCode = code ?? 0; });
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => { server.kill(signal); });
}
