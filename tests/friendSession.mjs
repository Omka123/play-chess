import assert from "node:assert/strict";
import { resolveFriendSession } from "../lib/friendSession.js";

const host = { id: "room-one", token: "host-token" };
assert.deepEqual(resolveFriendSession("?room=room-one", "#invite=guest-invite", host),
  { invite: { id: "room-one", token: "guest-invite" } });
assert.deepEqual(resolveFriendSession("?room=room-one", "", host), { session: host });
assert.deepEqual(resolveFriendSession("", "", host), { session: host });
assert.deepEqual(resolveFriendSession("?room=other", "", host), {});
assert.deepEqual(resolveFriendSession("", "", { id: 123 }), {});
assert.deepEqual(resolveFriendSession("?room=room-one", "#invite=guest-invite", null),
  { invite: { id: "room-one", token: "guest-invite" } });
console.log("Passed: invitation priority over copied host sessions, reload recovery, and invalid saved sessions.");
