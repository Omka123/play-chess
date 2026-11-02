# Owner admin panel

Open `/admin` while signed in with the owner's Google account. Local owner access
is configured for `omkarprajapati8268@gmail.com` and its existing account ID.
The account menu shows an Admin panel link only for that account.

## Local Google login

Use `npm run dev` and open `http://localhost:3000/login`. The development launcher
sets its process's `NEXTAUTH_URL` to localhost automatically, including the selected
`--port`/`-p` or `PORT` value. It does not edit `.env.local` or production settings.
Restart an already-running server after updating this launcher. Use `localhost`
consistently rather than mixing it with `127.0.0.1` or the live domain.

Register `http://localhost:3000` as an authorized JavaScript origin and
`http://localhost:3000/api/auth/callback/google` as an authorized redirect URI on
the same Google OAuth client. Keep the live origin and callback too. A custom
development port needs its own matching Google callback entry. After signing in
with the owner Google account, open `/admin`. A live-domain cookie cannot sign you
in to localhost. If an old session is present, sign out locally and sign in again.

`npm start` uses production configuration; it does not apply this dev-only override.

## Hosting setup

Add these **server-only** environment variables in the intended Vercel environment,
using the same values as your local `.env.local`, then redeploy:

```dotenv
ADMIN_EMAIL=<owner Google email>
ADMIN_USER_ID=<owner account id from MongoDB users>
```

Both fields must match the signed-in session. Empty or missing settings deny all
admin access. There is no public registration, profile flag, client role claim or
moderator permission that can grant admin rights. No admin-role editor is exposed.
The live hosting configuration has not been changed by this local implementation.

## Available tools

- Overview counts for accounts, player profiles, open reports, suspended players,
  shared studies and running events.
- Paginated Google account directory with name, email, joined date, chess ratings
  and account status. MongoDB supports search by email, name, username and ID.
- Suspend or restore players and reset inappropriate public profiles. Actions
  require a reason, use existing moderation validation and record an audit entry.
- Existing reported-game evidence, report resolution, shared-replay moderation
  and recent audit history.
- Storage reachability and current-process service counters; this is not a full
  uptime monitor or Atlas resource dashboard.

The owner account is protected from moderation changes. Existing moderator routes
retain their separate configured permissions; they cannot access the admin API or
its email directory. The panel does not expose credentials, invitation tokens,
database editing, account deletion or rating manipulation.

## Verification

`npm test` covers denied role forgery, fail-closed configuration, owner protection
and audited actions. `npm run test:mongodb` covers the real MongoDB account search
in an isolated test database. `tests/admin.browser.mjs` checks page/API boundaries,
owner actions, cross-origin rejection, search and narrow-screen layout against an
isolated local-storage server. Never run that fixture script against real storage.
