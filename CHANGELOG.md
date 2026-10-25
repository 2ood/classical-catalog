# Changelog

All notable changes to this project will be documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Initial project scaffolding
- README, CHANGELOG, and ROADMAP created
- Project proposal (`classical-catalog-proposal.md`), revised with stack and auth decisions
- Next.js 16.4 app (App Router, TypeScript, Tailwind v4) with Prettier, ESLint, and Vitest + Testing Library; `npm test`, `format`, `db:generate`, `db:migrate`, `db:seed` scripts
- Monochrome design tokens and type scale in `app/globals.css`; Inter and IM Fell English fonts
- Database schema for composers, works, recordings and scores (Drizzle on Neon Postgres), with the first SQL migration in `drizzle/`
- Sample-data seed: 3 composers, 6 works, 5 real YouTube/Spotify recordings; skips a database that already has composers
- YouTube and Spotify link parsing (watch / youtu.be / embed / shorts / live links; Spotify track, album, playlist links and `spotify:` URIs)
- Single-owner login against `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH`, encrypted session cookie (two-week lifetime), logout, `/login` page, and a log in / log out link in the header
- `proxy.ts`: `/admin` redirects anonymous visitors to `/login`; anonymous POST/PATCH/DELETE API calls get 401
- Plain composer list (`/`), works list (`/composer/[id]`), and player (`/work/[id]`) with performer buttons switching a YouTube or Spotify embed
- `POST /api/recordings` with input validation (performer required, year a whole number, URL must match the chosen media type) and an add-recording form shown only when logged in
- Composer cloud on `/`: short names in IM Fell English, sized 16–42px by number of works with at least one recording, placed at the same spot on every visit (seeded from each composer's id) without overlapping; underline and a "Name · Era · N recorded works" tooltip on hover
- The cloud is 560px tall and grows taller as the catalogue grows, so names keep room to spread out
- `GET /api/composers` returns every composer with their count of recorded works
- Works list on `/composer/[id]`: works grouped by genre (alphabetical) and sorted naturally by catalogue number (`K. 9` before `K. 550`, `Op. 10 No. 2` before `Op. 10 No. 12`); genre filter chips; a dot marks works with recordings and works without are faded; header with back arrow, serif name, era label, and an "Edit" link when logged in
- `GET /api/works?composer_id=` returns a composer's works with a has-recording flag (400 for a malformed id)
- Player page (`/work/[id]`) fills the viewport: score pane (placeholder) and recordings pane side by side with a 1px divider; the embed fills the rest of its pane
- Performer tiles: 40px circles with the performer's initials, active tile in black, a caption naming the active performer and year; when logged in, a ✕ on hover deletes a recording (after confirmation) and a "+" tile opens the add-recording form
- `DELETE /api/recordings/[id]` (login required; 400 for a malformed id, 404 if not found)
- Score pane on the player: PDF viewer (react-pdf) fitted to the pane height with ← page / total → controls; dropdown to switch between several scores; IMSLP button (Google search limited to imslp.org); when logged in, a drag-and-drop upload zone and header "Upload" / "Remove" buttons
- Score uploads go from the browser straight to Vercel Blob (PDF only, up to 100MB) via `POST /api/scores/upload` tokens, then `POST /api/scores` saves the record; `DELETE /api/scores/[id]` removes the record and the file
- PDF.js decoder assets are copied to `public/pdfjs` on `npm install` and served by the app
- Movement navigation in the score viewer: « / » jump to the previous / next movement (« first returns to the start of the current one) and a dropdown names the current movement, e.g. "II. Andante con moto"
- Movement editor per score: enter each movement's name (usually its tempo) and start page, with "Add at page N" for the page on screen; movements are numbered automatically in page order and saved with `PUT /api/scores/[id]/movements`
- Recording sync by movement: choosing a movement in the score seeks the YouTube video to its start or loads the movement's Spotify track; a playing YouTube video turns the score to each new movement's start page
- Recording movement editor: start time per movement for YouTube (m:ss, with a "Now" button and "Add at m:ss"), or a track link per movement for Spotify
- `PUT /api/recordings/[id]/movements`
- Spotify Connect (optional, needs Spotify Premium and a Spotify developer app): log in once with "Connect Spotify"; Spotify recordings then play in your own Spotify app, with what is playing, the device, Play / Pause and Disconnect shown in the recordings pane
- With Spotify Connect, choosing a movement in the score plays that movement's track (inside the track's own album, so later movements follow), and the score turns to a movement when Spotify starts its track
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_REDIRECT_URI` settings and the `/api/spotify/*` routes; the login is kept in the local database
- Library page (`/library`, linked from the header): every composer Open Opus knows (~220), filtered by era chips and an accent-insensitive search; each shows whether it is imported (with its work count) and an Import button
- Importing a composer adds their complete work list from Open Opus, with catalogue number, key, plain title and genre read from each title (`Piano Sonata no. 14 in C sharp minor, op. 27 no. 2, "Moonlight"` → `Op. 27 No. 2` · `C-sharp minor` · `Piano Sonata No. 14 “Moonlight”` · Piano Sonata); works entered by hand are matched by catalogue number (or title) and linked instead of duplicated, and a composer entered by hand keeps their details
- Imported works carry Open Opus' "popular" and "recommended" picks
- Movements from MusicBrainz during import: symphonies, sonatas and concertos get their movements, collections (e.g. Brahms' Klavierstücke) their pieces; the Library row shows progress while they come in. Movement lists entered by hand are never replaced
- "Update" on an imported composer adds new works and fills in missing movements; the Library says when movements failed or MusicBrainz has no match for the composer
- `POST /api/library/import`, streaming its progress as newline-delimited JSON
- Work page header: "N movements" opens the work's full movement list
- Works list: each work's movements are listed under it, folded and unfolded with ▾ / ▸; clicking one opens the player at that movement (score at its start page, YouTube cued at its start, the Spotify embed on its track, Spotify Connect ready to play it on Play)

### Changed
- Movements now belong to the work: names and order are shared by all its scores and recordings, which each store their own start pages, times or tracks; existing per-score movements were migrated to their works
- The app is now local-only: Postgres 17 runs in Docker Compose (`npm run db:up`), PDF scores are stored on local disk (`SCORES_DIR`, default `storage/scores`), and `npm run dev` / `npm start` listen on 127.0.0.1 only
- Database access uses postgres.js instead of the Neon serverless driver; `npm run build` no longer needs `DATABASE_URL`
- `POST /api/scores/upload` now receives the PDF itself, checks its `%PDF-` signature, and stores file and record together; `GET /api/scores/[id]/file` serves it; deleting a score removes its file
- Editing controls (add/delete recordings, upload/remove scores, "Edit") are always shown
- The scores table stores `file_name` instead of `blob_url` (fresh initial migration)
- The add-recording form is no longer always visible; it opens from the "+" tile
- The site header is a fixed 48px tall
- Readable addresses: `/composer/brahms`, `/composer/brahms/klavierstucke-op-118` and `/composer/brahms/klavierstucke-op-118/ii-intermezzo-in-a-dur-andante-teneramente` replace `/composer/<id>` and `/work/<id>`; a composer or work keeps its address when renamed
- In the works list, a movement shows as recorded only when some recording has a start time or track for it
- The composer page, the Library and the composer cloud are centred in the window

### Removed
- Login, sessions and `proxy.ts`; `/login`, `/api/auth/*` and the header log in / log out link; `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`
- Vercel Blob uploads and `POST /api/scores`; `BLOB_READ_WRITE_TOKEN`
- Neon serverless driver
- The composer page "Edit" link, which led to a missing page (it returns with the admin pages)

### Fixed
- Scanned scores (JBIG2 images) no longer render as blank pages
- Component tests no longer see leftover output from earlier tests (Testing Library cleanup now runs after each test)
