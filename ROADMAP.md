# Roadmap

Spec: [classical-catalog-proposal.md](classical-catalog-proposal.md). Every milestone is test-driven (Vitest) and ends with a manual verification checklist run against `npm run dev`.

## In Progress

_Nothing in progress._

## Planned

### Milestone 11: Collecting
Explore the pre-populated catalogue and fill it in one work at a time; a work is collected once it has a recording.
- [ ] Composer page header shows progress, e.g. "12 / 344 collected"; the cloud tooltip shows the same
- [ ] Works list filter: All / Collected / To collect, plus "Highlights" (Open Opus popular / recommended) as a starting point
- [ ] Search within a composer's works (title or catalogue number)
- [ ] Cloud stays readable with many imported composers (sizes by collected works; uncollected composers at the smallest size)
- [ ] Manual verification checklist

### Milestone 12: Composer map views
The home page gets a view switch (kept in the URL, e.g. `/?view=timeline`): the current cloud, a timeline, and clusters.
- [ ] Timeline: lifespan bars on a year axis, packed into rows so contemporaries line up; zoom to an era; names link to the composer — layout test-first (no overlapping bars)
- [ ] Clusters by period: one small cloud per Open Opus era (Medieval → 21st Century), in chronological order
- [ ] Clusters by movement: composers can carry movement tags (Impressionism, Second Viennese School, The Five, Les Six, Nationalism, Minimalism, …); seeded from Wikidata's "movement" (P135) where it is more specific than the period, plus a small built-in list of well-known schools; editable per composer. A composer in several movements appears in each; untagged composers fall under their period
- [ ] Schema: `composers.wikidata_id`, birth/death years kept from Open Opus, `composer_movements` (tags); migration
- [ ] Manual verification checklist

### Milestone 13: Performers and playlists
Browse by performer and play through their recordings like a playlist.
- [ ] Schema: `performers` (name, kind: conductor / orchestra / ensemble / soloist + instrument / singer) and `recording_performers` (recording ↔ performer, role); migration that splits existing text such as "Karajan / BPO" into performers — test-first on the parsing
- [ ] Merge aliases (e.g. "BPO" into "Berliner Philharmoniker"), rename, set kind / instrument
- [ ] Add-recording form picks existing performers or creates new ones
- [ ] `/performers` index and `/performer/[id]` page: their recordings grouped by composer, with counts
- [ ] Play-through: Play on a performer page opens the player on the first work and advances to the next work when a recording ends (YouTube end event; Spotify via playback polling), score following along; next / previous / position shown in the player — queue logic test-first
- [ ] Manual verification checklist

### Milestone 14: Admin
- [ ] `POST /api/composers`, `POST /api/works`, `PATCH`/`DELETE /api/works/[id]`
- [ ] `/admin` composer dashboard
- [ ] `/admin/composer/[id]` — edit composer, add/remove works; bring back the composer page "Edit" link
- [ ] `/admin/work/[id]` — edit work, manage recordings and scores

## Completed

### Milestone 10: Catalogue import from Open Opus (completed 2026-10-25)
Pre-populate composers and their complete work lists from [Open Opus](https://openopus.org) (free API, ~220 composers), so the library starts full and gets collected piece by piece.
- [x] `lib/openopus.ts`: fetch all composers and a composer's works — test-first against recorded sample responses (`lib/fixtures/`)
- [x] Title parsing (`lib/work-titles.ts`): catalogue number, key and plain title out of Open Opus titles (`Symphony no. 5 in C minor, op. 67` → `Op. 67` · `C minor` · `Symphony No. 5`; BWV / K. / D. / Hob. / RV / WoO / op. … no. …) — test-first on real titles
- [x] Genre from title (Symphony, Piano Concerto, Piano Sonata, String Quartet, Opera, Mass, …), falling back to Open Opus' broad genre (Chamber, Keyboard, Orchestral, Stage, Vocal) — test-first
- [x] Schema: `composers.open_opus_id`, `works.open_opus_id` (unique), `works.popular` / `recommended` flags; migration 0006 (rehearsed on a restored copy, then applied)
- [x] Import a composer (`lib/import.ts` plan, `lib/import-store.ts`, `POST /api/library/import`): upsert the composer, add their works; re-importing adds only new works; works already entered by hand are matched by catalogue number and linked, not duplicated — test-first
- [x] `/library` page: browse Open Opus composers by era with search; each shows imported or not (with work count) and an Import button; "Library" link in the header
- [x] Movements from MusicBrainz during import (`lib/musicbrainz.ts`): find the composer, page through their works with part links (1 request/s, retries), clean movement names, match parents to works by catalogue number (title when none) — test-first on real titles
- [x] Import streams progress (newline-delimited JSON) after the works are saved; "Update" on imported composers adds new works and fills missing movements
- [x] Work page header: "N movements" opens the work's full movement list, so an import can be checked before any score or recording marks where movements start (the player only lists marked movements)
- [x] Composer page "Edit" link removed until Milestone 14 builds the admin pages (it led to a 404)
- [x] Works list shows each work's movements indented under it (open by default, ▾/▸ folds a work's movements); a movement opens the player set to it: the score turns to its start page, YouTube is cued at its start time, the Spotify embed loads its track, Spotify Connect plays it on Play — test-first
- [x] Movements fade individually: a movement is "recorded" when some recording has a start time or track for it
- [x] Readable paths: `/composer/brahms`, `/composer/brahms/klavierstucke-op-118`, `/composer/brahms/klavierstucke-op-118/ii-intermezzo-in-a-dur-andante-teneramente` replace `/composer/[id]` and `/work/[id]`; `composers.slug` (unique) and `works.slug` (unique per composer), migration 0007 backfills existing rows (rehearsed on a restored copy, then applied) — test-first
- [x] Composer page, Library and the home cloud centred in the window
- [x] Manual verification checklist — passed
- Decisions:
  - One fetch of all ~220 composers, filtered by era and search in the browser, instead of Open Opus' by-era and search endpoints
  - Output matches hand-entered style: `Op. 27 No. 2`, `K. 550`, `BWV 988`, `Hob. XVI:28`, keys as `E-flat major` (a bare `in D` means D major), nicknames kept in the title as `Piano Sonata No. 14 “Moonlight”`
  - With several catalogue numbers, the composer's own catalogue is shown (BWV, HWV, K., D., Hob., RV, S.), then op., then secondary ones (WoO, Sz., BB, B., L., R.); all of them are tried when matching hand-entered works, format-insensitively. Works without any catalogue number match by title
  - Genre: the form named first in the title wins ("Variations on a Theme from the Opera…" → Variations), then the subtitle ("[Opera]", "For string quartet"), then Open Opus' broad genre. Over 6,750 sample titles from 20 composers, 32 keep catalogue leftovers in the title (Open Opus' own `deest`, `H.31a/…` and the like)
  - A composer entered by hand is matched by full name (ignoring case and accents); only their blank born / died / era are filled in, so hand-entered values (e.g. Beethoven as Classical) stay
  - Open Opus answers unknown composers with HTTP 200 and `success: "false"`; the import route reports any Open Opus failure as 502 before touching the database
  - Open Opus has no movements; MusicBrainz does (movements and a collection's pieces are "parts" of a work). Collections are stored like symphonies: pieces become the work's movements, no child works
  - Fetched during import, as the owner chose, so import takes about 2 s per 100 MusicBrainz works (Beethoven 3,028 works ≈ 75 s, Bach 8,417 ≈ 3 min); works are saved first, so a MusicBrainz failure keeps them and "Update" retries
  - Movements are only written to works whose list is empty, never replacing a list (and its score / recording marks) entered by hand
  - MusicBrainz holds many duplicates and arrangements: arrangements and sections with their own parts are skipped, and among several candidates the most common number of movements wins. Beethoven: 206 of 344 works get movements; the rest are mostly songs and single pieces without parts
  - The import keeps running on the server if the browser leaves the page
  - Finding the composer on MusicBrainz searches every name field and accepts the main name, sort name or any alias in any word order: MusicBrainz names some composers in their own script ("Сергей Васильевич Рахманинов"), which first left Rachmaninoff without movements. Birth year (±1) tells namesakes apart; when no year agrees, the only person of that name is taken (early composers' dates differ between sources). All 220 Open Opus composers are found; when one isn't, the Library says so instead of finishing silently
  - Opening a work at a movement never starts sound by itself: YouTube is cued (not played) at the movement's start, and Spotify Connect waits for Play
  - Movements are shown in the works list unless folded (fold state is not remembered); Beethoven's page with all movements is ~540 KB
  - Slugs: composers by short name (full name if two share one), works by title + catalogue number, repeats numbered `-2`, `-3`; at most 80 characters, cut at a word. Stored, so renaming a work keeps its URL. Existing rows got theirs in SQL (`unaccent`), new rows from `lib/slugs.ts`
  - Movement slugs are not stored: numeral + name (`ii-andante-con-moto`), worked out from the work's current list, so repeated names stay distinct; a link to a movement renamed or moved since redirects to the work. API routes keep ids

### Milestone 9: Spotify Connect (completed 2026-10-25)
Control the owner's Spotify app (Premium) instead of the embed, and sync both ways by movement.
- [x] Spotify developer app (owner, Premium); `SPOTIFY_CLIENT_ID` in `.env`; redirect URI `http://127.0.0.1:3000/api/spotify/callback`
- [x] `lib/spotify.ts`: PKCE verifier/challenge, authorize URL, link → `spotify:` URI, track → movement — test-first
- [x] Tokens in a one-row `spotify_tokens` table; client refreshes the access token before it expires — test-first
- [x] Routes: `/api/spotify/login`, `/callback`, `/status`, `/playback`, `/play`, `/pause`, `/disconnect` — test-first where they can be
- [x] `SpotifyConnectPlayer`: now playing + device, Play / Pause; embed + "Connect Spotify" when not connected
- [x] Sync: a chosen movement plays its track (within the track's own album); polling every 2s turns the score when the track changes movement
- [x] Manual verification checklist — passed with the owner's Spotify login
- Decisions:
  - Spotify Connect (control the owner's Spotify app), not the in-browser Web Playback SDK; Premium is required by Spotify for both, and since February 2026 for any Development Mode app
  - PKCE login with only a client ID; tokens stay server-side in `spotify_tokens` and every Spotify call goes through our routes
  - The login starts on the redirect URI's host (127.0.0.1), judged by the Host header, so a localhost visit still completes
  - A movement's track plays inside its own album (looked up with `GET /tracks/{id}`), with the track as offset, so later movements follow on; the recording's album can be a different release that lacks the track (found with the Karajan cycle, whose movement links came from a single-symphony album). Falls back to playing just the track
  - Playback is polled every 2s while the tab is visible; `/api/spotify/status` and `/playback` call `connection()` so they are never prerendered at build time

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
