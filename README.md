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

The public site includes a learning hub, four original chess guides, three interactive exercises, and About, Contact, Privacy and Terms pages. Sample ad cards are retained in source for future customization but removed from visitor pages. No live AdSense script is installed and no approval is guaranteed.

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

1. **Account features**: add editable profiles and account game history. Google sign-in and persistent account records are already supported.
2. **Scale multiplayer**: add rate limiting and optionally replace polling with a WebSocket service. Shared Redis room storage is already supported.
3. **Ratings**: store games and update Glicko-2 ratings after each result.
4. **Stronger bots**: load Stockfish (WASM) in the worker instead of `engine.js`.
5. **More puzzles**: import the open Lichess puzzle database (CC0).

## Google sign-in and player accounts

1. In Google Cloud Console, configure the OAuth consent screen and create an OAuth client of type **Web application**. Request only basic profile/email access. If the app is in testing, add your Google account under test users.
2. Add authorized redirect URIs `http://localhost:3000/api/auth/callback/google` and `https://chessnexa.com/api/auth/callback/google` (use your actual production domain). The protocol, domain, port and path must match exactly.
3. Copy `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` into `.env.local` and the deployment's environment variables. Generate `NEXTAUTH_SECRET` using the command in `.env.example`. Set `NEXTAUTH_URL` to `http://localhost:3000` locally and your HTTPS origin in production. Use a different secret for production; never commit credentials.
4. Production accounts use the same Upstash REST configuration as rooms. Local accounts use `.gambit-users/`. Account records do not expire with game rooms. Keep the database private. Local records are not automatically migrated to hosted storage.
5. Restart development or redeploy, choose **Sign in with Google**, and complete Google's consent screen. A returning Google account receives the same player ID. Verify sign-out and sign-in again, then create an invite and join from a second account in another browser. Account-bound seats require both their private room token and the matching login. Signing out does not delete an account.

The `/account` page shows player details and saved game history, with results, opponents, colours, clocks, dates, filters, totals, replay, and basic mistake review. Completed friend games are archived for signed-in participants; bot games started while signed in are submitted by the browser as unrated practice games. Duplicate saves are ignored. Guests can still play, but their games are not attached to an account. Matchmaking, ratings, and cross-device recovery of active games are separate features. Puzzles remain browser-local. Google credentials are required for an end-to-end OAuth test; automated tests do not contact Google.

History is stored separately from expiring rooms: in `.gambit-history/` locally and Redis hashes in hosted deployments, without a room expiry. Only the signed-in user's history is loaded by the account page. Finished friend games are archived on a successful move, resignation, or authenticated room read that detects clock expiry. Abandoned rooms with no further requests are not automatically adjudicated. Existing expired rooms and old bot games cannot be recovered. If archiving fails, reopen/reload the room before its 24-hour expiry to retry; bot games offer an explicit retry while the finished game remains open. History does not contain room tokens or invite secrets. Bot submissions are checked for legal moves, but client-reported resignation/timeout is not suitable for rated games.

Provider setup reference: https://next-auth.js.org/providers/google
