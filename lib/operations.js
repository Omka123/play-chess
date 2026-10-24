const started = Date.now();
const counters = new Map();
export function recordServiceError(status = 500, area = "api") {
  const code = Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
  const key = `${["api", "client", "storage"].includes(area) ? area : "api"}:${code}`;
  counters.set(key, { count: (counters.get(key)?.count || 0) + 1, lastAt: Date.now() });
}
export function serviceMetrics() { return { startedAt: started, uptimeSeconds: Math.floor((Date.now() - started) / 1000), counters: Object.fromEntries(counters), scope: "Current server process only. Use deployment logs and an external uptime monitor for durable, cross-instance monitoring." }; }
