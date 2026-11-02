# MongoDB migration

Updated: 2 November 2026

The Redis source contained 27 application records. These were copied to the
`chessnexa` MongoDB database, read back and compared. The source was checked again
and had not changed during the copy. No source records were deleted. This is a
point-in-time copy; later changes made by the live Redis deployment require a
fresh migration before production cutover.

Local `.env.local` now selects MongoDB. The URI is server-only and gitignored.
Never put it in `NEXT_PUBLIC_*`, source code or screenshots. Rotate the database
password shared in chat, then update local and hosting secrets.

## Production cutover

1. Pause all writes to the old deployment, including players, maintenance workers,
   scheduled events and other app instances. A stable-copy check cannot prevent
   writes that happen after it completes.
2. With the old Redis credentials available, run:

   ```powershell
   npm run db:migrate -- --source=redis --verify
   ```

   If verification differs, set `MONGODB_DB` to a new empty database name, then
   run the dry run and copy below. The tool refuses to overwrite an existing
   destination. It leaves a partial destination untouched on failure; retry with
   a new empty database rather than deleting records blindly.

   ```powershell
   npm run db:migrate -- --source=redis
   npm run db:migrate -- --source=redis --apply
   npm run db:migrate -- --source=redis --verify
   ```

3. Set these server-only variables in Vercel for the intended environment:

   ```dotenv
   GAMBIT_STORAGE=mongodb
   MONGODB_URI=<your rotated Atlas connection string>
   MONGODB_DB=chessnexa
   ```

   Use the new database name if a fresh copy was required. Ensure Atlas network
   access allows the application's egress addresses and the database user has
   read/write and index-creation permissions for that database. Do not disable TLS.
4. Redeploy the app and update any external worker's database settings. Check
   `/api/health`, returning Google login, existing profiles/history and a complete
   friend game. Resume writes only against the MongoDB deployment.
5. Retain Redis and encrypted backups until these checks pass. Once MongoDB has
   accepted new writes, switching back to old Redis would lose those changes;
   reconcile data before any rollback.

The live deployment and its environment have not been changed by the local migration.

## Storage layout and limits

`users` stores Google accounts as native documents with top-level `id`, `name`,
`email`, `image` and `createdAt` fields. Its `_id` is the existing user ID.
`records` preserves application keys with structured BSON values, atomic
compare-and-set updates, revisions and room expiration dates. `historyEntries`
stores each saved game as a structured value with a unique `(key, field)` index. IDs, ratings,
moderation records, studies and relationships remain unchanged. The community
state is still one document; MongoDB's 16 MiB document limit applies, so splitting
that state into indexed records remains future scaling work. This migration is
not a redesign of the community schema.

The TTL index removes expired records in the background. Reads also reject expired
records immediately. Server-side Google sessions still use NextAuth's existing
session configuration. Browser-only preferences and unsaved tab drafts remain on
the device; they were never part of the Redis database.

Backups now identify MongoDB as their backend. Shared-storage backup entries remain
compatible with legacy Redis snapshots. Restore only into an offline destination
after inspecting and backing up it first. One-shot backup commands close the pool.

For filesystem-only installations, use `--source=local` instead. This copies users,
community state, history and unexpired rooms from `GAMBIT_DATA_DIRECTORY`; do not
merge arbitrary old local test folders into the migrated production data.

## Verification

`npm test` uses isolated storage and explicitly removes MongoDB settings from its
process. `npm run test:mongodb` is an opt-in Atlas integration check using a unique
test database and removing only its generated fixture records. It covers account
creation, concurrency, history deduplication, expiration, room listing and backup
collection. Empty test collections/indexes may remain in that isolated database.

Validation completed: full unit suite, isolated Atlas integration tests, production build and read-only application smoke checks against local MongoDB passed. A subsequent source comparison verified all 27 copied source records; MongoDB contains 49 history entries. No live deployment settings were modified.

## Native document upgrade

The original compatibility format stored JSON as strings. Existing data has now
been upgraded: 3 Google users moved into `users`, 49 history values converted to
objects, and the community state converted to an object. A second dry run found
zero remaining conversions. No source Redis records changed.

For another installation, stop all application writes and run
`npm run db:upgrade-documents`, then `npm run db:upgrade-documents -- --apply`.
Conversion verifies every user before removing its old wrapper, rejects conflicts,
and is safe to rerun. New Google sign-ins write directly into `users`. The storage
boundary still accepts legacy documents during upgrades, and backups include native
users. User deletion removes the dedicated user document as well as account history.

In Atlas, open `chessnexa` → `users` and filter by `{ "email": "your-email" }`.
For community data, open `records` and filter by `{ "_id": "gambit:community:v1" }`;
its `value.players` object contains chess profiles and ratings.
