import { operationsCheck } from "../lib/operationsCheck.js";
const report = operationsCheck(process.env, { production: !process.argv.includes("--local") });
if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`ChessNexa ${report.mode} preflight`);
  for (const check of report.checks) console.log(`${check.ok ? "PASS" : "PENDING"} ${check.name}${check.action ? `: ${check.action}` : ""}`);
  console.log(report.limitations);
}
if (!report.ok) process.exitCode = 1;
