# ChessNexa

A chess site built with Next.js (App Router): invite friends online, play five bots, solve mate-in-one puzzles, drag-and-drop or click to move, clocks, move review, light/dark theme.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

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

1. **Accounts**: add Auth.js (NextAuth) with a Postgres database via Prisma.
2. **Scale multiplayer**: add rate limiting and optionally replace polling with a WebSocket service. Shared Redis room storage is already supported.
3. **Ratings**: store games and update Glicko-2 ratings after each result.
4. **Stronger bots**: load Stockfish (WASM) in the worker instead of `engine.js`.
5. **More puzzles**: import the open Lichess puzzle database (CC0).
