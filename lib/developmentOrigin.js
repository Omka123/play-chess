// Used only by the development launcher. Never infer auth origins from request
// headers or change production authentication settings.
export function developmentOrigin(args = [], env = {}) {
  let port = env.PORT || "3000";
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--port" || args[index] === "-p") port = args[++index];
    else if (args[index].startsWith("--port=")) port = args[index].slice(7);
  }
  if (!/^\d{1,5}$/.test(String(port)) || Number(port) < 1 || Number(port) > 65535) throw new Error("Choose a development port between 1 and 65535.");
  return `http://localhost:${Number(port)}`;
}
