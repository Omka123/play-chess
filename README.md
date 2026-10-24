# ChessNexa

A chess site built with Next.js (App Router): invite friends online, play five bots, solve mate-in-one puzzles, drag-and-drop or click to move, clocks, move review, light/dark theme.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

Each `npm run dev` invocation gets a separate output folder under `.next-dev`; production builds use `.next`. This prevents different dev servers and production builds from overwriting each other's chunks. Use `npm run dev` rather than calling `next dev` directly. After changing `next.config.mjs`, restart existing development servers. Old `.next-dev` session folders can be removed when development servers are stopped.

Bots and puzzles need no environment variables. Local friend games default to a private file store in `.gambit-rooms/` on a single Node server. Hosted friend games use Upstash Redis when configured; on Vercel these settings are required. Rooms expire after 24 hours. Redis updates use atomic compare-and-set to protect moves, joins, and clocks across server instances.

## Deploy friend games to Vercel

1. Create an Upstash Redis database, directly at Upstash or through the Vercel Marketplace integration.
2. Copy its **REST URL** and **REST token** (a token with read/write permissions).
3. In your Vercel project's **Settings → Environment Variables**, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Include Production and, if you test preview deployments, Preview. Use the exact variable names from `.env.example`; do not add `NEXT_PUBLIC_`.
4. Deploy the updated source and redeploy after adding/changing variables. Existing deployments do not receive newly added variables.
5. Open Friends and create a new invite. Old local-file rooms are not migrated to Redis.

For local Redis testing, copy `.env.example` to `.env.local` and fill in the two values. Without them, local development continues to use files. On Vercel the API reports a missing database configuration explicitly instead of attempting filesystem writes. Tests use local files and a Redis mock, never your configured live database.

REST API reference: https://upstash.com/docs/redis/features/restapi

## Content and AdSense review preparation

The public site includes a learning hub, ten original chess guides, interactive exercises, and About, Contact, Privacy and Terms pages. Cards shown during games are unpaid links to relevant ChessNexa guides. Learning pages can show an optional, clearly labelled direct sponsor card. No live AdSense script is installed and no approval or earnings are guaranteed.

Before publishing for review, set `SITE_URL` to your public HTTPS origin, `SITE_OPERATOR` to your real public operator name, and `SUPPORT_EMAIL` to a monitored public contact address. Redeploy after configuring them. `SITE_URL` supplies the sitemap and homepage canonical URL; without it, the sitemap intentionally has no invented domain. Review all editorial and policy text for accuracy against your deployment.

When adding AdSense, use your actual publisher account, update privacy disclosures to describe Google/third-party advertising cookies, and configure a Google-certified consent platform where required for EEA/UK/Switzerland traffic. Do not publish a fake ads.txt publisher ID. Google evaluates the live site; passing tests is not evidence of approval.

Official guidance: https://support.google.com/adsense/answer/7299563

## Playing online

Open **Friends**, enter your name, choose your colour and clock, and create a link. Send the link to your friend; they enter their name and join. Sync checks target a 500ms interval, subject to network latency. Your own legal moves display immediately while the server confirms them; rejected moves revert. Polling reads storage without writing, and stops after a game result. The clock starts when the second player joins. Reloading the same tab reconnects using a private session stored in sessionStorage. Keep the invite private: anyone with it can claim the other seat. Each game supports two players.

Both devices must reach the same server URL. A localhost link only works on the host device; for another device use a reachable LAN address or host the app on a public Node server with HTTPS. Public production use should also add rate limiting for room creation and joining.

## How it is organised

```
app/
  layout.js        fonts, metadata
  page.js          renders <Gambit />
  globals.css      all styles (light and dark tokens at the top)
components/
  Gambit.jsx       all game state: play, puzzles, clocks, bot requests
  Board.jsx        the board: click, drag, promotion picker
  PlayerBar.jsx    name, captured pieces, clock
  PlayPanel.jsx    bot setup, move list, controls
  PuzzlePanel.jsx  puzzle controls
lib/
  engine.js        the bot's search (alpha-beta with piece-square tables)
  engine.worker.js runs the search in a Web Worker
  chessUtil.js     helpers around chess.js
  puzzles.js       puzzle list, validated against chess.js at load
  constants.js     bots, clock options, piece values
```

Rules come from `chess.js`. The bot is a small custom engine, so it is club-level at best.

## Next steps toward a real chess site

1. **Account features**: profiles, avatars, saved games, friends and ratings are available. Add account deletion and moderation tooling as the community grows.
2. **Scale multiplayer**: add rate limiting and optionally replace polling with a WebSocket service. Shared Redis room storage is already supported.
3. **Ratings**: Elo ratings are implemented. Consider Glicko-2 and anti-cheat review for a larger rated pool.
4. **Stronger bots**: load Stockfish (WASM) in the worker instead of `engine.js`.
5. **More puzzles**: import the open Lichess puzzle database (CC0).

## Google sign-in and player accounts

1. In Google Cloud Console, configure the OAuth consent screen and create an OAuth client of type **Web application**. Request only basic profile/email access. If the app is in testing, add your Google account under test users.
2. Add authorized redirect URIs `http://localhost:3000/api/auth/callback/google` and `https://chessnexa.com/api/auth/callback/google` (use your actual production domain). The protocol, domain, port and path must match exactly.
3. Copy `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` into `.env.local` and the deployment's environment variables. Generate `NEXTAUTH_SECRET` using the command in `.env.example`. Set `NEXTAUTH_URL` to `http://localhost:3000` locally and your HTTPS origin in production. Use a different secret for production; never commit credentials.
4. Production accounts use the same Upstash REST configuration as rooms. Local accounts use `.gambit-users/`. Account records do not expire with game rooms. Keep the database private. Local records are not automatically migrated to hosted storage.
5. Restart development or redeploy, choose **Sign in with Google**, and complete Google's consent screen. A returning Google account receives the same player ID. Verify sign-out and sign-in again, then create an invite and join from a second account in another browser. Account-bound seats require both their private room token and the matching login. Signing out does not delete an account.

The `/account` page shows editable player details, avatars, friends, rating progress and saved game history, with results, opponents, colours, clocks, dates, filters, totals, replay, and Stockfish mistake review. Completed friend games are archived for signed-in participants; bot games started while signed in are submitted by the browser as unrated practice games. Duplicate saves are ignored. Guests can still play, but their games are not attached to an account. Online matchmaking and accepted direct challenges can be resumed from the account page. Google credentials are required for an end-to-end OAuth test; automated tests do not contact Google.

History is stored separately from expiring rooms: in `.gambit-history/` locally and Redis hashes in hosted deployments, without a room expiry. Only the signed-in user's history is loaded by the account page. Finished friend games are archived on a successful move, resignation, or authenticated room read that detects clock expiry. Abandoned rooms with no further requests are not automatically adjudicated. Existing expired rooms and old bot games cannot be recovered. If archiving fails, reopen/reload the room before its 24-hour expiry to retry; bot games offer an explicit retry while the finished game remains open. History does not contain room tokens or invite secrets. Bot submissions are checked for legal moves, but client-reported resignation/timeout is not suitable for rated games.

Provider setup reference: https://next-auth.js.org/providers/google

## Online play, social accounts and ratings

- Open **Friends → Play online** to queue for a rated game or resume a current one. Available players using the same clock/increment are paired, preferring the closest rating. Queue tickets expire after 30 seconds without a heartbeat. The queue needs another real signed-in player; it never silently substitutes a bot.
- New players start at 200 and use Elo with K=32. An equal-rated win normally adds 16 points and a loss subtracts 16; changes depend on the opponent's rating and ratings cannot fall below zero. Bullet, blitz and rapid are separate. Existing untouched 1200-point accounts migrate to 200; earned ratings remain unchanged. Categories use initial seconds plus 40 increments: under 180 is bullet, under 600 is blitz, otherwise rapid. Only server-created matchmaking games affect ratings. Rating settlement is atomic and idempotent. Bot games, invitation games, challenges and rematches are unrated.
- The account page supports unique usernames, display names, six chess-piece avatars, friend requests, accepting/declining requests, online presence and direct 5-minute challenges. Challenges expire after two minutes. Status updates every 15–30 seconds while visible. Opponents' email addresses and private room credentials are never returned in friend lists.
- Friend games support draw offers, acceptance/decline, mutual rematch requests with swapped colours, 1/3/5/10-minute clocks, and optional +2/+5-second increments. Both bots and online play support a single queued premove, highlighted on the board with a cancel button. A premove is revalidated and discarded if it is illegal when your turn arrives.
- The shared social state uses atomic Redis compare-and-set in production and a serialized file in `.gambit-community/` locally. This initial implementation uses one shared state document; move to indexed records or a relational database for a large player pool. Clocks are adjudicated on authenticated room requests, so abandoned games need a player to reconnect before their room expires.

## Analysis, puzzles, export and sounds

- Stockfish 19 lite runs locally in a browser worker for post-game review, with a 400ms/depth-16 limit per position. Review includes better-move arrows and an interactive practice board. It is an engine estimate, not guaranteed perfect analysis. Basic review remains available for devices without WASM support. Analysis is available after the game, not during rated play.
- `predev` and `prebuild` copy the engine's JS/WASM assets and GPL license into `public/engine/`. Keep both files together. Engine source and license links appear in the review panel. Stockfish.js is third-party GPL-3.0 software; see its bundled license and corresponding source link.
- Puzzles have editorial difficulty labels, hints, a UTC daily selection, account-saved completions and a daily streak. The library contains six original patterns and 36 generated, validated endgame mates. Regenerate the latter with `node scripts/generate-puzzles.mjs`. The server checks that a submitted move really checkmates before saving progress or awarding a streak. Local guest progress remains available.
- Completed games support PGN download and copying the displayed position's FEN. Saved games can explicitly create a public replay link from history. Anyone with that link can view the player names, result and moves. Public replay pages are marked `noindex`; unshared account history remains private.
- Move, capture, check and checkmate sounds use the Web Audio API after a user interaction. The **Sound on/off** button saves your preference locally.

## Browser verification

`npm test` covers game rules, room concurrency, private sessions, account history, profiles, friend consent, matchmaking, rating idempotency, verified puzzles, rematches, increments, PGN and UCI parsing. Browser tests use Playwright and installed Microsoft Edge. Start an isolated test server in PowerShell (never point this test at a production site):

```powershell
$env:NEXTAUTH_SECRET='local-browser-test-session-key-for-chessnexa-only'
$env:NEXTAUTH_URL='http://localhost:3100'
$env:UPSTASH_REDIS_REST_URL=''
$env:UPSTASH_REDIS_REST_TOKEN=''
$env:GAMBIT_DATA_DIRECTORY=Join-Path $env:TEMP ('chessnexa-browser-' + [guid]::NewGuid().ToString())
npm run dev -- --port 3100
```

In another terminal run `node tests/browser.mjs`. It creates temporary test sessions without using Google, and checks two-account matchmaking, premoves, draw/rematch controls, history/sharing, WASM analysis and mobile login. Stop the isolated server after testing. Normal development should use a fresh terminal so the test-only environment overrides are not reused.

## Sponsorship configuration

Set `SPONSOR_NAME`, `SPONSOR_TITLE`, `SPONSOR_TEXT` and `SPONSOR_URL` in your server environment, then restart locally or rebuild/redeploy. All four are required; the URL must be HTTPS and cannot contain a username/password. The placement appears after learning content and is labelled **Advertisement / Sponsored by …**, with `rel="sponsored noopener noreferrer"` on the outbound link. No third-party script or ad-network account is used. Empty settings show a first-party learning recommendation instead. The old sample creatives in `lib/ads.js` are not rendered.

Publish a real `SUPPORT_EMAIL` to receive enquiries from `/advertise`. Agree commercial terms with an advertiser before enabling their placement, and review the destination and claims. Adding content supports a useful site; it does not guarantee AdSense approval or income. Google's own preparation guidance is https://support.google.com/adsense/answer/7299563. If you add an advertising network later, complete its setup and update consent/privacy disclosures for that actual integration.

## Moderation setup

Set `MODERATOR_EMAILS` to a comma-separated allowlist of the Google account emails authorised to moderate, then restart/redeploy. Leave it empty to disable access. After signing in, an authorised operator can open `/moderation` directly or use the link on `/account`. Moderator permission is checked on the server for both reads and writes; editing profile fields or sending a client-side role flag does not grant access. Never use a `NEXT_PUBLIC_` prefix for the allowlist.

- `/report` accepts player, participated-game and public-replay reports from signed-in accounts, including suspended accounts requesting review. It limits each account to five reports per day and deduplicates open reports for the same target. Game evidence is checked against server records or the reporter's saved history; room tokens and invite secrets are omitted.
- Moderators can resolve/dismiss reports, suspend/restore accounts, reset public names/avatars, and hide/restore public replay links. Each action needs a reason and creates an audit entry. Moderator accounts cannot be suspended or reset through this dashboard.
- Suspensions immediately block authenticated matchmaking, game creation/joining/moves/rematches, friend interactions, puzzle submissions and new replay sharing. Existing session cookies do not bypass this check. Players can view their account, read their game, resign, submit reports or contact support. Guest practice is not an identity-based ban; this is account moderation, not IP/device enforcement.
- Shared replay ownership is kept privately for moderation. Hiding a link does not delete the user's private game history. A profile reset applies immediately to new online games; older game records retain their historical names and can be reported separately.
- Reports, decisions, private replay-owner associations and audit records use the existing community store. The dashboard displays the latest 100 audit entries, while the stored log is retained. Configure operator retention and respond to deletion/appeal requests through the published support contact. No automated cheating detector or rating penalty is claimed.

`npm test` includes allowlist boundaries, role-forgery denial, report privacy, participant checks, suspension enforcement, profile resets and replay hide/restore tests. For an isolated browser moderation test, add `$env:MODERATOR_EMAILS='moderator@example.test'` to the temporary server setup above and run `node tests/moderationBrowser.mjs`.

Run `node tests/reviewBrowser.mjs` against the same isolated server to check a completed checkmate game's review: Stockfish mate detection, automatic key-moment selection, move badges, played/best arrow filters, interactive better-move practice, engine switching and the mobile layout. Reviews cache the latest ten analysed games in page memory; analysis is an estimate at the selected engine's search limit, not Chess.com's proprietary move classification or accuracy score.

## Free player hub, training and analysis

- `/hub` requires sign-in and provides account notifications, server-saved game recovery, clubs, unrated tournaments, daily invitations, three-minute puzzle challenges, free peer coaching requests, blocking, public-profile consent and account export. No payment credentials or prices are needed, and no checkout is installed.
- Clubs may be public or invite-only. Members can read announcements; owners can post them. Owners can create club events by supplying their club ID. Private club information is not returned to nonmembers.
- Tournaments support up to 32 players with 5+2 games. The organiser starts rounds manually after the scheduled start. Pairings prefer similar scores, avoid repeat opponents and blocked pairings, and award an odd-player bye. This is a simple round system, not a full Swiss/arena competition engine. Completed games update standings exactly once. Participants resume games from the hub.
- Daily chess requires the recipient to accept. Choose 1/3/7 days per move. Server-enforced deadlines reset after legal moves. Daily games are unrated, coexist with later live games, and expire after one year. Open a game to settle an elapsed deadline; no background scheduling or email notifications are installed.
- Review mistakes can be saved explicitly to a private personal practice list (up to 50 positions) in Training. Live-game participants can enable a revocable spectator link from the online game panel. The link returns names and positions without player credentials and never permits moves.
- `/training` saves lesson completion and server-validated puzzle results. Puzzle ratings start at 200 and only the first unhinted attempt changes the rating. Each puzzle scores once per timed battle, regardless of whether it was previously solved in normal practice. The original collection teaches mate in one; /improve also provides curated multi-move study lines.
- `/analysis` accepts PGN text/files and FEN, allows legal variations, and displays local Stockfish evaluation, a suggested line and move arrow. Signed-in users can save up to 20 private studies with up to 500 positions each and load them across devices. Imported games do not alter rated history. Opening names in history use a small explicitly curated prefix catalogue, not an external master-game database.
- Account history supports opponent/opening search, colour/result/date filters, colour win rates, and actual before/after ratings for newly completed rated games. Search dates use UTC.
- Public profiles at `/player/[username]` are opt-in and omit email, friendships, room credentials and private studies. Download your own profile/studies and game history through Settings; account deletion is available under /improve Settings, with disclosed retention of opponent records and moderation evidence.
- Coaching is free, self described, and unverified. A coach must accept a session request; overlapping accepted sessions within one hour are rejected. This feature does not provide video calling or paid booking.
- New community writes have an account rate limit. Blocking prevents new matchmaking and invitation flows. Rate-based matching starts within 100 points and expands by 50 points every 15 seconds, capped at 1,000, while maintaining each player's allowed range.
- These additions use the existing local/Redis persistence. For production use, configure the existing shared Redis store and operator moderation contact. See the additions below for local variants and optional backup/monitoring tools. A master opening database, automated cheating verdicts and payment subscriptions are not included.

Run `node tests/platformBrowser.mjs` against the isolated browser-test server above for club announcements, profile visibility, puzzle solving, imported analysis, Stockfish arrows, saved-study recovery, export and mobile layouts. `npm test` includes permissions, invitation consent, exactly-once event scores and puzzle ratings, validated puzzles, blocked interactions and private study isolation.


## Improvement centre and operations

- /improve provides 46 validated tactical positions, adaptive selection, multi-move study lines, timed/survival runs, a daily plan, courses, spaced mistake revision, shared studies, consent-based practice partners and automatic community events. Hindi/Marathi prompts and theme explanations are available; the entire application is not translated.
- Swiss-style events avoid repeat opponents and use score/Buchholz standings. Arenas pair ready players during a one-hour window. Both are simplified, unrated 5+2 formats. Pairings advance on polling and game completion.
- Analysis includes three local Stockfish candidates, factual move explanations, personal opening statistics and public seven-piece tablebase queries. Personal statistics include bot games and require no master-explorer token. Tablebase queries send the selected position to Lichess. Reviews include a selectable evaluation graph.
- /insights compares actual saved results and move timings. Quick/slow moves are practice candidates, not automatic mistakes or cheating verdicts.
- /variants provides local Chess960, King of the Hill and Three-check with pass-and-play or a casual random-move bot. Results do not affect standard ratings. Chess960 layout numbering is specific to this application.
- Settings support board/piece preferences, notifications, export and typed-confirmation deletion. Deletion retains a minimal tombstone, opponent records and moderation evidence as disclosed in the interface.
- Optional offline downloads cache public lessons and static training pages, excluding private APIs and history. Account progress and social tools require connectivity. Installation depends on browser support.
- Moderator review tools compare timings and local engine moves without automated sanctions. /api/health checks storage; moderator-only /api/ops exposes process-local counters which reset on restart.
- Unattended event advancement needs an external scheduler calling /api/cron/events with a Bearer CRON_SECRET. No scheduler is installed automatically.
- Run node --experimental-default-type=module scripts/backup.mjs create for encrypted backups. Configure GAMBIT_BACKUP_KEY as a securely retained base64-encoded 32-byte key, plus optional GAMBIT_BACKUP_DIRECTORY. The watch 24 command repeats while the process runs. inspect <file> checks backups; restore <file> defaults to dry run and needs --confirm-restore to write. Configure an external scheduler and off-site retention for production.

Tests cover tactical lines, run integrity, shared-study permissions, revision scheduling, automatic pairings, 960 layouts, variants, statistics, encrypted backup round trips and deletion safeguards.


## Roadmap implementation update (23 October 2026)

The improvement centre now includes private opening repertoires and training insights. Repertoires support branches, notes and spaced recall; their moves are user preparation rather than engine-verified recommendations. Game review offers light/standard/deep effort and stop/restart controls. The chess board supports arrow-key focus, Enter/Space selection and Escape cancellation. Account preferences load across routes, and an offline notice plus download removal are available.

For unattended clock settlement and events, configure CRON_SECRET and supervise `node scripts/maintenance.mjs` with NEXTAUTH_URL set, or schedule /api/cron/maintenance and follow its cursor pages. No worker is installed automatically. See OPERATIONS.md for deployment checks, restore drills, monitoring and privacy procedures. The GitHub Actions workflow runs tests, a build and a production browser smoke test when connected to GitHub.
