// Tests always use isolated local files or an in-memory Redis mock, never a live database.
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.VERCEL;
await import("./rooms.mjs");
await import("./users.mjs");
await import("./redisRooms.mjs");
await import("./friendSession.mjs");
await import("./lessons.mjs");
await import("./boardMotion.mjs");
await import("./review.mjs");
await import("./history.mjs");
