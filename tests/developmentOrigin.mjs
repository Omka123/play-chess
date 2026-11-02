import assert from "node:assert/strict";
import { developmentOrigin } from "../lib/developmentOrigin.js";
assert.equal(developmentOrigin([], { NEXTAUTH_URL: "https://chessnexa.in" }), "http://localhost:3000");
assert.equal(developmentOrigin(["--port", "3100"]), "http://localhost:3100");
assert.equal(developmentOrigin(["-p", "3200"], { PORT: "4000" }), "http://localhost:3200");
assert.equal(developmentOrigin(["--port=3300"]), "http://localhost:3300");
assert.equal(developmentOrigin([], { PORT: "3400" }), "http://localhost:3400");
for (const args of [["--port"], ["-p", "0"], ["--port", "65536"], ["--port", "https://other.invalid"]]) assert.throws(() => developmentOrigin(args), /development port/);
console.log("Passed: local-only development auth origin, port flags, environment priority and invalid port rejection.");
