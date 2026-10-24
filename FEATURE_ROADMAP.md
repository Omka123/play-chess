# ChessNexa feature roadmap

Updated: 23 October 2026

This is the implementation checklist for the chess platform discussed in this project. Existing features are recorded separately so they are not rebuilt unnecessarily. An implemented feature does not mean its production services are configured or that it matches every capability of another platform.

Status: `[x]` implemented baseline; `[ ]` remaining work. Priorities: P0 = production readiness, P1 = core improvement, P2 = expansion, P3 = optional future work.

## Product decisions

- Keep memberships and existing features free. Do not add paid checkout without a new decision.
- Use the player's own saved games for opening statistics. A master-game service is optional future work.
- Start new player ratings at 200; use separate bullet, blitz and rapid ratings.
- Keep bot, direct invitation and local variant games unrated.
- Keep the king-defeat animation removed.
- Build original ChessNexa branding and assets while using established chess interfaces as usability references.

## 1. Accounts and player profiles

- [x] Google sign-in and persistent player accounts.
- [x] Usernames, display names, chess-piece avatars and opt-in public profiles.
- [x] Player ratings, history and rating changes.
- [x] Account export and typed-confirmation deletion with retention disclosure.
- [x] Board, piece, coordinate, training-language and notification preferences.
- [ ] **P0:** Verify production OAuth credentials, exact callback URLs and returning-user login on the deployed domain.
- [x] Load saved account preferences automatically on every entry route, including a new device.
- [ ] **P2:** Profile photo controls, account recovery guidance and accessible account-management flows.

## 2. Playing chess

- [x] Legal standard chess moves, castling, en passant and promotion.
- [x] Bot games with selectable opponents and a thinking delay.
- [x] Online friend invitations, matchmaking, game recovery and clocks with increments.
- [x] Premoves, resignation, draw offers and mutual rematches.
- [x] Checkmate/result presentation, winner indicators and move sounds.
- [x] Move lists showing recorded move durations.
- [x] Separate rated matchmaking categories with idempotent rating settlement.
- [x] Provide authenticated maintenance scanning for abandoned live games and expired daily deadlines without participant requests.
- [ ] **P0:** Run and monitor the maintenance worker or external scheduler in production.
- [ ] **P1:** Add explicit reconnect/offline status, reconnect countdowns and tested clock reconciliation.
- [ ] **P1:** Improve real-time delivery and measure latency before adding clock lag compensation.
- [ ] **P1:** Expand bot strength calibration, playing styles and adjustable thinking speed.
- [ ] **P2:** Add configurable challenge clocks and player-defined rating ranges where not already exposed.

## 3. Game history and review

- [x] Private saved history, search/filter controls and rating records.
- [x] PGN export, FEN copying and explicitly shared public replay links.
- [x] Local Stockfish review, mistake/better-move arrows and interactive practice.
- [x] Evaluation graph and candidate lines in analysis.
- [x] Save review mistakes for later practice.
- [ ] **P1:** Refine move classifications and explanations using tested engine thresholds and clearly stated search limits.
- [x] Add light/standard/deep review effort, progress, stop/restart controls and bounded engine usage.
- [ ] **P1:** Group recurring mistakes by tactical theme and show trends across reviewed games.
- [ ] **P2:** Add searchable personal annotations, game collections and comparison between review sessions.
- [ ] **P2:** Add an accuracy metric only after its formula, limitations and validation are documented.

## 4. Puzzles and training

- [x] A baseline library of 46 validated tactical positions, including curated multi-move study lines.
- [x] Adaptive theme/difficulty selection and first-attempt puzzle ratings.
- [x] Timed three/five-minute runs and survival training with server-validated scoring.
- [x] Daily puzzles, saved progress and a ten-minute daily plan.
- [x] Courses, lesson completion and spaced mistake revision.
- [x] Intention-before-move prompts and continuation practice against local Stockfish.
- [x] Hindi/Marathi training prompts and theme explanations.
- [ ] **P1:** Expand the puzzle library with licensed/original content, difficulty calibration and editorial review.
- [ ] **P1:** Support multiple sound defensive replies and alternative correct continuations in multi-move puzzles.
- [x] Add training insights for latest-attempt theme success, revision stages and recent daily activity.
- [ ] **P1:** Add historical attempt series and calibrated improvement trends beyond latest-attempt summaries.
- [ ] **P2:** Add dedicated time-management drills, endgame exercises and opening-repertoire practice.
- [ ] **P2:** Add multiplayer puzzle races with authoritative clocks and reconnect handling.
- [ ] **P2:** Translate the full application and review explanations into Hindi/Marathi with human review.
- [ ] **P2:** Add richer lesson checkpoints and prerequisite validation for structured courses.

## 5. Analysis, openings and insights

- [x] PGN/FEN import, legal variations and private saved studies.
- [x] Three local engine candidates and factual move-feature explanations.
- [x] Personal opening statistics from saved games, including clearly labelled bot results.
- [x] Public seven-piece tablebase lookup for supported positions.
- [x] Saved-result and move-time insights by opening, month and game phase.
- [x] Add private repertoire folders, branching lines, position notes and spaced opening recall.
- [ ] **P1:** Improve opening identification beyond the small curated prefix catalogue.
- [ ] **P2:** Add comparison against personal rating bands and recent periods without exposing other players' private data.
- [ ] **P3:** Optional master-game explorer, subject to provider access, credentials, usage limits and attribution.

## 6. Friends, studies and community

- [x] Friend requests, presence, direct challenges and blocking.
- [x] Clubs, announcements, daily chess invitations and free peer-coaching requests.
- [x] Collaborative studies with chapters, branches, comments, invitation codes and editor removal.
- [x] Opt-in practice partners matched by training goal and consent-based invitations.
- [x] Revocable live spectator links.
- [ ] **P1:** Improve shared-study synchronization, conflict recovery and revision history.
- [ ] **P2:** Add study roles, read-only sharing and moderated discovery.
- [ ] **P2:** Add club management roles and richer event discovery.
- [ ] **P2:** Add optional game chat only alongside reporting, blocking, retention and moderation controls.
- [ ] **P3:** Add integrated coaching calls or scheduling-provider integration if requested.

## 7. Tournaments and variants

- [x] Manual community events and automatic Swiss-style/arena baselines.
- [x] Score standings, Buchholz tie-breaks and repeat-opponent avoidance for Swiss-style pairing.
- [x] Unrated 5+2 event games and ready-player arena pairing.
- [x] Local Chess960, King of the Hill and Three-check.
- [ ] **P0:** Configure and verify an external scheduler for unattended event advancement.
- [ ] **P1:** Add organizer recovery tools, withdrawal handling and event lifecycle notifications.
- [ ] **P1:** Expand pairing tests for unusual participant counts, blocked players and interrupted games.
- [ ] **P2:** Add configurable event clocks, durations, eligibility and tie-break rules.
- [ ] **P2:** Add online variant rooms, persisted history and variant-specific matchmaking.
- [ ] **P2:** Replace the random variant bot with a compatible engine where available.
- [ ] **P3:** Add further variants after rules, UI and engine support are selected.

## 8. Interface, accessibility and mobile

- [x] Compact play panel, board-side controls and responsive layouts.
- [x] Board colour themes, classic/symbol pieces and coordinate controls.
- [x] Optional public-content offline downloads and an installable-app manifest.
- [x] Verify production-build download, offline reload, private-API cache exclusion and cache removal in Edge.
- [ ] **P0:** Complete mobile-browser and service-worker upgrade checks.
- [x] Add keyboard board controls: arrow navigation, Enter/Space selection, Escape cancellation and visible focus.
- [ ] **P1:** Complete screen-reader, promotion focus and contrast audit.
- [ ] **P1:** Test long labels, translated text, touch promotion, small screens and landscape layouts.
- [x] Add a global offline notice explaining local practice and server clocks, plus offline-download removal.
- [ ] **P1:** Improve reconnect countdowns and protect unsaved annotations from refresh/conflicts.
- [x] Supply 192px/512px raster app icons alongside the SVG manifest icon.
- [ ] **P2:** Verify installation and platform metadata across supported mobile browsers.
- [ ] **P3:** Consider native mobile applications after the responsive web experience is stable.

## 9. Fair play, safety and privacy

- [x] Reports, moderator permissions, suspensions, appeals and audit records.
- [x] Reported-game move-time evidence and explicit local engine comparisons.
- [x] Server validation, rate limits and private study/account boundaries.
- [ ] **P0:** Configure moderator access and a working support contact for production.
- [ ] **P0:** Establish retention, deletion-request and incident-response procedures.
- [ ] **P1:** Broaden abuse/concurrency testing for invitations, studies, events and account deletion.
- [ ] **P2:** Develop a human-reviewed fair-play workflow with evidence quality checks and appeals.
- [ ] **P3:** Research statistical detection only with validated false-positive rates; engine agreement alone must not trigger sanctions.

## 10. Infrastructure and operations

- [x] Local persistence and shared Redis support with concurrency safeguards.
- [x] Health endpoint, moderator-only process counters and retryable error boundary.
- [x] Encrypted backup creation, inspection and dry-run restoration tools.
- [ ] **P0:** Verify production shared storage, environment configuration and deployment smoke tests.
- [ ] **P0:** Configure backup encryption keys, scheduling, off-site retention and a tested restoration procedure.
- [ ] **P0:** Configure persistent monitoring, uptime checks and actionable alerts.
- [ ] **P1:** Replace the shared community document with indexed records as usage grows; plan migrations.
- [ ] **P1:** Load-test matchmaking, simultaneous room moves, events and study updates.
- [x] Add CI workflow for automated tests, production builds and key browser journeys.
- [ ] **P0:** Verify the CI workflow runs successfully on the connected repository.
- [ ] **P2:** Add persistent operational metrics with documented privacy and retention.

## Recommended delivery order

1. Complete P0 production configuration, unattended clock settlement, backups and offline verification.
2. Improve reconnect behavior, accessibility and multi-move training correctness.
3. Expand reviewed puzzle/course content and recurring-mistake insights.
4. Strengthen community/event recovery and shared-study synchronization.
5. Add opening repertoires, online variants and other P2 expansion work.
6. Reassess optional integrations and P3 work using actual player feedback.

## Completion checklist for each feature

- [ ] Define the player-visible behavior and acceptance criteria.
- [ ] Implement persistence, authorization and validation where needed.
- [ ] Cover important rules, failure paths and concurrency with appropriate tests.
- [ ] Verify desktop/mobile behavior and accessibility relevant to the change.
- [ ] Update documentation and privacy disclosures for new data flows.
- [ ] Record production dependencies and confirm their setup before announcing availability.

This roadmap is a project planning artifact, not a claim of complete feature parity with Chess.com or any other service.

## Implementation update ? 23 October 2026

This delivery adds maintenance scanning/worker, cross-route preferences, configurable cancellable review, keyboard board moves, training insights, opening repertoires, offline notices/removal, CI and operator procedures. Items still unchecked remain outstanding; external setup and optional integrations are not silently marked complete. See OPERATIONS.md for deployment, monitoring, backups and privacy procedures.

Operations follow-up adds executable configuration checks, read-only smoke probes, a synthetic restore drill and npm commands. Local health/authentication probes and a maintenance cycle passed. Production deployment, monitoring, retained backup keys, actual backup recovery, support/moderator contact settings and scheduler supervision remain pending; see the dated verification checklist in OPERATIONS.md.
