# ChessNexa production checklist

Updated: 23 October 2026. These procedures are templates; adding this file does not configure a live service.

## Runnable operations checks

Run these from the project directory. Scripts use environment variables already supplied to their process; npm does not automatically load `.env.local` for these commands. Node 22 can load it explicitly without printing credentials:

```powershell
node --env-file=.env.local --experimental-default-type=module scripts/operations-check.mjs
```

This defaults to production checks. Add `--local` for localhost/development storage, or `--json` for a machine-readable, credential-free report. Exit code 1 means configuration remains pending; syntactically valid settings do not prove that credentials work. Run the production check with the actual production environment, not a development file containing localhost.

| Command | What it does |
| --- | --- |
| `npm run ops:check` | Validate supplied production settings without contacting providers or printing their values. |
| `npm run ops:smoke -- https://your-domain.example` | Read-only checks for storage health, private API authentication, maintenance protection and manifest icons. |
| `npm run ops:restore-drill` | Create synthetic records, encrypt/restore into a new temporary directory, compare every record, then remove only that drill directory. Uses no production data or keys. |
| `npm run ops:maintenance -- --once` | Run one authenticated maintenance cycle; nonzero exit status indicates failure or incomplete traversal. |
| `npm run ops:backup -- create` | Create a real encrypted backup using the configured storage/key. |

The restore drill validates the backup code path; it does not prove an actual production backup can be recovered. Smoke checks do not create games or Google sessions. These commands do not deploy the app, install scheduled tasks, configure monitoring, or send alerts to anyone.

## Latest verification - 23 October 2026

- [x] Automated tests, including configuration validation and credential-free report checks.
- [x] Synthetic encrypted restore drill: all three records recovered and compared.
- [x] Isolated local production-build smoke checks: health 200; unauthenticated export, moderation and maintenance 401; manifest 200 with a 512px icon.
- [x] One authenticated maintenance cycle against isolated local storage.
- [x] Missing local maintenance and backup keys generated in git-ignored `.env.local`; values were not printed. Existing nonempty keys were preserved.
- [ ] Retain the backup key separately and configure application/worker production secrets. Local generation does not update hosting settings.
- [ ] Supply the support contact and moderator Google-account email allowlist.
- [ ] Confirm the current live domain and deploy the current application. The last known domain, `https://play-chess-kohl.vercel.app`, returned HTTP 404 for all five operations probes; this does not establish whether the domain is still current.
- [ ] Verify real Google login, database credentials, production backups, external monitoring and supervised scheduling on the confirmed deployment.

No real production backup was restored, no public deployment was performed, and no background worker was left running by these checks.

## Deployment verification

1. Set the production `NEXTAUTH_URL`, Google OAuth credentials and `NEXTAUTH_SECRET` in the deployment environment. Register that domain's exact `/api/auth/callback/google` URL in the same Google OAuth client. Keep localhost configured separately for development.
2. Configure both Upstash REST variables and test `/api/health`. Do not use development filesystem persistence on ephemeral hosting.
3. Configure `MODERATOR_EMAILS` and the published support contact. Verify that a normal player cannot open moderator APIs.
4. Test first sign-in, returning sign-in, two-account friend play, a rated result, history persistence, export and reconnect on the deployed domain.
5. Run the CI workflow and mobile smoke tests before rollout. Keep the previous deployment available for rollback.

## Unattended clocks and events

Set a high-entropy `CRON_SECRET` on the application and worker. Run `node scripts/maintenance.mjs` as a supervised process with `NEXTAUTH_URL` and `CRON_SECRET` set. It visits bounded room pages every cycle and settles elapsed live/daily clocks before advancing events. `--once` runs one cycle. The worker must remain running; it is not installed as a system service automatically.

Alternatively call `GET /api/cron/maintenance` with `Authorization: Bearer <secret>` from an external scheduler. Follow the returned numeric `cursor` until it is `0` on each scan. Schedule often enough for your desired result-settlement delay. Do not put secrets in URL query parameters. Alert on non-2xx responses, nonzero failed counts or missed cycles. Expired Redis records cannot be recovered by a late worker; keep it running before game records expire.

## Backups and restore drills

- Generate and retain a base64-encoded 32-byte `GAMBIT_BACKUP_KEY` outside the database and backup storage. Do not commit it or paste it into support messages.
- Run `node --experimental-default-type=module scripts/backup.mjs create`, or supervise `watch 24`. Configure `GAMBIT_BACKUP_DIRECTORY` to durable storage and copy encrypted files off-site.
- Suggested starting retention: seven daily copies and four weekly copies. Adapt this to actual storage, privacy commitments and recovery requirements.
- Each month, inspect a copy and restore into an isolated empty environment using the dry-run mode first. Explicit restoration requires `--confirm-restore`. Verify game/history counts and a representative account before declaring the drill successful.
- During actual restoration, stop writes, snapshot current storage, verify destination settings and key access, restore, run smoke tests, then reopen traffic. Never test restoration over production data.

## Monitoring and incidents

- Use an external uptime monitor on `/api/health`, plus deployment/provider logs and storage quotas. Configure an operator alert destination and verify delivery. Process-local `/api/ops` counters are not durable monitoring.
- When an incident occurs: record impact/time, stop the damaging operation, preserve restricted evidence, notify the responsible operator, restore service, verify recovery, and document the cause and corrective action.
- Never send OAuth secrets, player room tokens or private game content to public logs. Rotate compromised credentials through their provider and redeploy.

## Privacy and deletion operations

- Review deletion/support requests through the published support channel and verify ownership without requesting credentials.
- Explain retained opponent records and moderation evidence. Minimize retained evidence and restrict access. A suggested initial moderation review interval is 90 days; the operator must decide and publish the actual retention policy.
- Deletion removes active application records as described in Settings. Encrypted backups expire through the retention policy; if restoring an older backup, reapply deletions before reopening the service.
- Keep an access-controlled record of completed deletion requests sufficient to prevent restoring deleted profiles. Do not place that record in the repository.

## Offline and accessibility checks

On production builds, download lessons, disconnect, reload a downloaded lesson and solve a local tactic. Confirm private API responses are absent from Cache Storage. Remove downloads, reload and confirm caches/worker removal. Check Chrome/Edge and available mobile browsers, including upgrades from an older service worker.

Use Tab to enter the chess board, arrow keys to move focus, Enter/Space to select and move, and Escape to cancel selection. Check promotion choices, visible focus, screen-reader square labels, mobile touch input, long translated text and reduced-motion preferences.
