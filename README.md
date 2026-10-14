# Gambit

A chess site built with Next.js (App Router): invite friends online, play five bots, solve mate-in-one puzzles, drag-and-drop or click to move, clocks, move review, light/dark theme.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

No environment variables are needed. Online friend games require a **single persistent Node.js server with a writable disk** (`npm run build`, then `npm start`). Rooms are saved privately in `.gambit-rooms/`, last for 24 hours, and use server-validated moves and clocks. This storage implementation is not suitable for Vercel/serverless or multiple server instances; use a shared database and distributed locking before deploying there. Expired room files can be removed periodically by the server administrator.

## Play with a friend

Open **Friends**, enter your name, choose your colour and clock, and create a link. Send the link to your friend; they enter their name and join. Moves sync approximately once per second. The clock starts when the second player joins. Reloading the same tab reconnects using a private session stored in sessionStorage. Keep the invite private: anyone with it can claim the other seat. Each game supports two players.

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
2. **Scale multiplayer**: replace the single-server file store with shared transactional storage, add rate limiting, and optionally replace polling with a WebSocket service.
3. **Ratings**: store games and update Glicko-2 ratings after each result.
4. **Stronger bots**: load Stockfish (WASM) in the worker instead of `engine.js`.
5. **More puzzles**: import the open Lichess puzzle database (CC0).
