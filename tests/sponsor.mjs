import assert from "node:assert/strict";
import { sponsorConfig } from "../lib/sponsor.js";
import { EXTRA_LESSONS } from "../lib/extraLessons.js";
const keys = ["SPONSOR_NAME", "SPONSOR_TITLE", "SPONSOR_TEXT", "SPONSOR_URL"];
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
try {
  for (const key of keys) delete process.env[key];
  assert.equal(sponsorConfig(), null);
  process.env.SPONSOR_NAME = "Test Sponsor"; process.env.SPONSOR_TITLE = "Test placement"; process.env.SPONSOR_TEXT = "Test sponsor copy.";
  process.env.SPONSOR_URL = "javascript:alert(1)"; assert.equal(sponsorConfig(), null);
  process.env.SPONSOR_URL = "https://user:password@example.test"; assert.equal(sponsorConfig(), null);
  process.env.SPONSOR_URL = "https://example.test/chess"; assert.equal(sponsorConfig().href, "https://example.test/chess");
  delete process.env.SPONSOR_NAME; assert.equal(sponsorConfig(), null);
  for (const lesson of EXTRA_LESSONS) {
    assert.ok(lesson.sections.length >= 4);
    assert.ok(lesson.sections.flatMap((section) => section.text).join(" ").split(/\s+/).length >= 300);
  }
  console.log("Passed: sponsor opt-in, HTTPS destinations, no URL credentials, required sponsor copy and substantial original guides.");
} finally { for (const key of keys) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]; } }
