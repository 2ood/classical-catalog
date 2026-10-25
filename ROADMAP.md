# Roadmap

Spec: [classical-catalog-proposal.md](classical-catalog-proposal.md). Every milestone is test-driven (Vitest) and ends with a manual verification checklist run against `npm run dev`.

## In Progress

## Planned

### Milestone 9: Admin
- [ ] `POST /api/composers`, `POST /api/works`, `PATCH`/`DELETE /api/works/[id]`
- [ ] `/admin` composer dashboard
- [ ] `/admin/composer/[id]` — edit composer, add/remove works
- [ ] `/admin/work/[id]` — edit work, manage recordings and scores

## Completed

### Milestone 8: Recording sync by movement (completed 2026-10-25)
Movements belong to the work; scores mark start pages, recordings mark start times (YouTube) or tracks (Spotify).
- [x] Data: `works.movements` (`[{ id, name }]`), `scores.movement_pages` and `recordings.movement_starts` (maps keyed by movement id); migration carries existing per-score movements over, then drops `scores.movements` — tested on a scratch database first
- [x] `lib/movements.ts`: row validation for score pages / YouTube times / Spotify tracks, merging edits into the work list (stable ids), timestamp parse/format, movement at a playback time — test-first
- [x] `PUT /api/scores/[id]/movements` and `PUT /api/recordings/[id]/movements` update the work's names and their own marks in one transaction — test-first
- [x] YouTube player via the IFrame API: seek on movement choice; while playing, turn the score at each new movement
- [x] Spotify: choosing a movement switches the embed to its track
- [x] Recording movement editor (name + time with "Now", or name + track link) — test-first
- [x] Manual verification checklist — passed
- Decisions:
  - Movement ids (not positions) key every score page and recording start, so inserting, removing or reordering movements never shifts marks
  - Both editors edit the same work-level names and order; each saves names plus its own marks in one transaction
  - Migration 0003 copied per-score movements to their works (the score with the most movements supplies the names; other scores map by position), rehearsed on a restored copy before running on the real database
  - YouTube uses the IFrame API: choosing a movement in the score seeks the video; while playing (polled once a second) a new movement turns the score to its start page
  - Spotify has no way to report which movement it is on, so its sync is one-way: choosing a movement loads that movement's track
  - `MediaEmbed` became `SpotifyEmbed` once YouTube got its own player

### Milestone 7: Movement navigation (completed 2026-10-25)
Turn the score by musical movement, not just by page.
- [x] `lib/movements.ts` — validate a movement list; current movement for a page; previous/next movement targets — test-first
- [x] `scores.movements` (jsonb list of `{ name, page }`, per score) + migration; `PUT /api/scores/[id]/movements` — test-first
- [x] `MovementNav` in the viewer bar: « / » previous / next movement, dropdown naming the current movement — test-first
- [x] `MovementEditor`: rows of name (tempo) + start page, "Add at current page", save — test-first
- [x] Manual verification checklist — passed
- Decisions:
  - Movements are stored per score (a full score and a piano reduction start movements on different pages), as a jsonb list sorted by start page
  - « behaves like a music player's back button: start of the current movement first, then the previous movement
  - Jumps are clamped to the PDF's page count, so a mistyped start page can't break the viewer
  - Saving replaces the whole list (`PUT`); there is no per-movement endpoint
  - Only the name is entered (usually the tempo, e.g. "Allegro con brio"); Roman numerals come from page order, shown as "II. Andante con moto"; new rows are inserted in page order

### Milestone 6: Local-only pivot (completed 2026-10-25)
Storing PDF scores in a hosted service is the wrong fit; the app now runs only on the owner's machine, using local disk and a local Postgres.
- [x] `docker-compose.yml` — Postgres 17 with a named volume; `DATABASE_URL` points at it
- [x] Swap `@neondatabase/serverless` for `postgres` (postgres.js) + `drizzle-orm/postgres-js`; one client reused across dev reloads
- [x] Scores stored on local disk (`SCORES_DIR`, default `./storage/scores`, git-ignored); `scores.blob_url` → `file_name`; migration regenerated for the fresh database
- [x] `POST /api/scores/upload` takes the PDF itself (multipart), checks it really is a PDF, saves file + record; `GET /api/scores/[id]/file` streams it; `DELETE /api/scores/[id]` removes both — test-first
- [x] Remove login: `proxy.ts`, `lib/session.ts`, `lib/auth.ts`, `/login`, `/api/auth/*`, header link, `iron-session` / `bcryptjs`, credential env vars; editing controls always shown
- [x] Remove `@vercel/blob`, `lib/blob.ts`, `POST /api/scores`
- [x] `dev` / `start` bind to 127.0.0.1 only
- [x] README, `.env.example` and docs updated for local setup; fresh local database seeded
- [x] Manual verification checklist — passed
- Decisions:
  - Fresh local database (Neon data and the Blob-stored score were not migrated); the initial migration was regenerated with `file_name`
  - Uploaded files get generated names (`<uuid>.pdf`); only such names are accepted when reading or deleting, so a stored name can't point outside `SCORES_DIR`
  - Uploads are checked for the `%PDF-` signature, not just the file name or type
  - `GET /api/scores/[id]/file` streams the PDF with a long-lived private cache header (file names never get reused)
  - The composer page "Edit" link is always shown; it 404s until Milestone 7

### Milestone 5: Player — score pane (completed 2026-10-25, on Vercel Blob)
- [x] `lib/blob.ts`; `POST /api/scores/upload`, `DELETE /api/scores/[id]`
- [x] `DropUpload` drag-and-drop zone (logged in only)
- [x] `ScoreViewer` with react-pdf, page controls pinned to bottom
- [x] Score selector dropdown when multiple scores; IMSLP search button
- [x] `POST /api/scores` saves the score record after the browser finishes uploading (not in the spec's route list)
- [x] "Upload" and "Remove" in the score pane header when logged in and a score exists — adding a second score or removing a wrong one shouldn't wait for Milestone 6
- [x] Manual verification — upload and page rendering passed; second score, Remove and non-PDF rejection not checked before the local-only pivot
- Decisions:
  - Uploads go browser → Blob directly (`@vercel/blob/client`); `/api/scores/upload` only issues tokens (PDF only, ≤100MB). Vercel functions cap request bodies at ~4.5MB, too small for many scores
  - No `onUploadCompleted` webhook: Vercel can't reach localhost, and `proxy.ts` would reject it without a session
  - Blob store is public; deleting a score removes the record first, then the file (a failed file delete is only logged)
  - The PDF page is fitted to the pane height; text and annotation layers are off
  - PDF.js decoder assets (JBIG2/JPEG 2000 wasm, cMaps, standard fonts, ICC profiles) are copied to `public/pdfjs` on postinstall and self-hosted; without the wasm, scanned (JBIG2) scores rendered as blank pages
  - The IMSLP button runs a Google search restricted to imslp.org ("site:imslp.org Op. 67 Symphony No. 5, C minor Ludwig van Beethoven"); IMSLP's own search page was broken
  - Default score label comes from the file name

### Milestone 4: Player — recordings pane (completed 2026-10-25)
- [x] `PerformerTiles` — 40px circles with initials, active state
- [x] Hover ✕ delete when logged in; `DELETE /api/recordings/[id]`
- [x] Embed fills remaining pane height; two-column layout with 1px divider
- [x] "+" tile in the strip opens the add-recording form (spec Screen 3; replaces the always-visible form)
- [x] Caption under the tiles names the active performer and year — initials alone are ambiguous (e.g. two "KB" Karajan recordings); not in the spec
- [x] Manual verification checklist — passed
- Decisions:
  - Initials are the first letters of the first two words, splitting on spaces and `/`
  - Deleting asks for confirmation in a browser dialog
  - The header is a fixed 3rem tall so the player fills exactly the rest of the viewport; the score pane is a placeholder until Milestone 5

### Milestone 3: Works list (completed 2026-10-25)
- [x] Catalogue-number natural sort (`K. 9` < `K. 550`, `Op. 10 No. 2`) — test-first
- [x] Group by genre, genre header styling
- [x] `GenreFilter` chips (active/inactive states)
- [x] Recording dot; 35% opacity for works without recordings
- [x] Header with serif name, era label, back arrow, "Edit" link when logged in
- [x] `GET /api/works?composer_id=`
- [x] Manual verification checklist — passed
- Decisions:
  - Natural sort via `Intl.Collator` (numeric, case-insensitive); works without a catalogue number sort last, then by title
  - Genre groups are alphabetical; the filter is client state (kept on back-navigation), chips hidden when there is only one genre
  - "Edit" links to `/admin/composer/[id]`, which 404s until Milestone 6

### Milestone 2: Composer cloud (completed 2026-10-25)
- [x] Seeded PRNG from composer UUID (deterministic, test-first)
- [x] Font-size scale 16–42px from count of works with ≥1 recording (test-first)
- [x] Collision-nudge loop, max 20 iterations per composer (test-first: no overlapping boxes)
- [x] `ComposerCloud` render, underline on hover, tooltip "Name · Era · …"
- [x] `GET /api/composers` with recording counts
- [x] Manual verification checklist — passed
- Decisions:
  - Layout runs on the server from estimated text boxes (0.55em per character), so there is no layout shift; horizontal positions are % of a 960px-wide area
  - Cloud height grows with the catalogue (word boxes cover at most 25% of the area, minimum 560px); a fixed height cannot fit large catalogues without overlaps
  - Each nudge iteration picks the best of four push-outs plus one seeded random jump; 0 overlaps in 9,000 stress layouts of 20–80 composers
  - Tooltip reads "Mozart · Classical · 2 recorded works" (CSS-only); per-genre counts like "41 symphonies" left out

### Milestone 1: Walking skeleton (completed 2026-10-25)
End-to-end slice on real data: composer list → works list → player with a working embed.
- [x] Scaffold with `create-next-app@latest` (TypeScript, App Router, Tailwind v4, ESLint)
- [x] Add Prettier + `eslint-config-prettier`, Vitest + Testing Library, `npm test` / `format` scripts
- [x] Design tokens in `app/globals.css` `@theme`; Inter + IM Fell English via `next/font`
- [x] `lib/schema.ts` (composers, works, recordings, scores), `lib/db.ts` (Neon serverless + Drizzle), `drizzle.config.ts`, first migration applied to Neon
- [x] `scripts/seed.ts` — sample composers, works, and YouTube + Spotify recordings (run with tsx)
- [x] `lib/media.ts` — `extractYouTubeId`, `extractSpotifyId` (track/album/playlist), test-first
- [x] Auth: `lib/session.ts`, `POST /api/auth/login` (env-var check, test-first), `POST /api/auth/logout`, `/login` page
- [x] `proxy.ts` — `/admin` redirects to `/login`, unauthenticated mutating API calls get 401
- [x] `/` — plain list of composers linking to `/composer/[id]`
- [x] `/composer/[id]` — plain list of works linking to `/work/[id]`
- [x] `/work/[id]` — `MediaEmbed` for the selected recording; plain performer buttons to switch
- [x] `POST /api/recordings` + `AddRecordingForm`, shown only when logged in
- [x] Manual verification checklist handed over with the local dev server running — passed
- [x] Header log in / log out link (`AuthStatus`) — added so the owner can log out; not in the original plan
- Decisions:
  - Next.js 16.4 ships with Cache Components + Partial Prefetching on; every DB / cookie read sits inside `<Suspense>`
  - Session read (`isLoggedIn`) uses `"use cache: private"` because iron-session checks the TTL with `Date.now()`
  - Route handlers re-check the session themselves; `proxy.ts` is the first gate, not the only one
  - Invalid ids render the 404 UI with status 200 (streaming has already started) — accepted for a personal app
  - `@types/node` bumped to 22 for Vitest 5

- [x] Project initialized — README, CHANGELOG, ROADMAP created (2026-10-25)
- [x] Proposal revised: env-var auth, latest Next.js, Neon serverless + Drizzle, tsx, Tailwind v4, Vitest (2026-10-25)

## Deferred / Reconsidered
- IMSLP API integration to auto-populate work metadata
- Keyboard shortcuts (J/K pages, number keys for performers)
- Mobile layout (stacked score and video)
- JSON export / backup of the catalogue
- Public read-only share links per work
- Apple Music as a third media type
- Users table / multi-user — replaced by env-var credentials for a single owner
- Playwright / e2e tests — replaced by manual verification checklists
- Vercel deploy (Neon + Blob) — dropped in the local-only pivot (2026-10-25); the app runs with `npm run build && npm start` on the owner's machine
- Login / single-owner auth — removed in the local-only pivot; the server listens on 127.0.0.1 only
