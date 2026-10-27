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
- Search in a composer's works list, by title or catalogue number (accents, case and spacing ignored: `k550` finds `K. 550`), working together with the genre chips
- Suggested recordings: a work without recordings shows up to 5 Spotify albums of it (performers and year, albums naming the work first) with "Listen ↗" and "Add"; "Add" opens the add-recording form filled with the album. "Connect Spotify" appears when not connected, and a "Find on YouTube ↗" search link always
- `GET /api/spotify/suggestions` (search a work's albums)
- Composer map views on the home page and the Library, switched with Cloud (List in the Library) · Timeline · Periods · Movements and kept in the URL (`?view=`): a timeline of lifespans with contemporaries stacked and era chips to zoom in; one small cloud per period; one per movement, where a composer in several movements appears in each and untagged composers stay under their period
- In the Library's map views, every Open Opus composer appears: imported ones link to their page, the rest are faded and open the list filtered to them, next to their Import button
- Composer movements (schools): seeded on import / Update for composers without any, from a built-in list of well-known schools (The Five, Les Six, Second Viennese School, Impressionism, Minimalism, …) and Wikidata's "movement" when it is more specific than the period; shown and editable as chips on the composer page (`PUT /api/composers/[id]/schools`)
- `npm run db:schools` gives composers imported before movements existed their built-in and Wikidata movements
- Adding a Spotify recording reads the pasted album (or any track of it): performer and year are filled in from Spotify, and each of the work's movements shows its matched track in a dropdown of the album's tracks (the work's own first), changeable or clearable before saving — no separate "Edit movements" step. A track link for a work without movements stays a track recording; the media type follows the pasted link
- `GET /api/spotify/preview` (what adding a Spotify link would save); `POST /api/recordings` takes the movements' tracks or start times
- The player's title bar has the movement control beside the work's name: « dropdown » lists every movement, with or without a score, sends both score and recording to the chosen one, and follows page turns and playback
- A floating mini player, bottom right on every page while Spotify has a track: album cover, track and artists, previous / play-pause / next, repeat this track, like on Spotify, "Go to current track" (opens the work at the movement the track belongs to) and Disconnect
- Recordings shown as a track list: one row per recording (performer, year, source; ✎ edit, ✕ delete), and the selected one lists its tracks — one per movement, or the piece itself — each with its own play button; the track playing now is in Spotify green, the app's one accent color
- Editing a recording: the add form, filled in, with Cancel / Escape; link, performer and year can change and Spotify links are matched again; `PATCH /api/recordings/[id]`
- Suggested recordings' "Listen" plays the album in your Spotify app, from the work's first track
- For a work without movements, adding a Spotify album saves the work's own track (a "Track" dropdown when it isn't clear which)
- `POST /api/spotify/control` (previous, next, repeat), `GET` / `PUT /api/spotify/library` (liked? like / unlike), `GET /api/spotify/locate` (the page for a playing track); the Spotify login also asks to read and change your library, for liking
- Performers: each recording's performer text ("Karajan / BPO (cycle)") is linked to performers by name, ignoring case, accents and hyphens; new ones are created with a guessed kind (person, orchestra, choir, ensemble). `npm run db:performers` links recordings made before
- `/performers` (people grouped by instrument or role from a fixed list, then orchestras, choirs, ensembles) and `/performer/<name>` (their recordings by composer); a "Performers" link in the header; a recording's performers link to their pages from the recordings list
- On a performer page: rename (the old name stays another name for them), set kind and instrument or role, and merge with another performer ("BPO" into "Berliner Philharmoniker"); `PATCH /api/performers/[id]`, `POST /api/performers/[id]/merge`
- Play-through: "▶ Play all" on a performer page plays their recordings one after another — each work opens with that recording playing (Spotify Connect, YouTube autoplay) and moves on when it ends; a queue bar shows the position, ⏮ ⏭ between works, ✕ to stop, and the whole queue with the current work highlighted
- A "With recordings" toggle on the works list, alongside search and the genre chips
- Likes (★) for a recording's movements — or its piece, for a work without movements — on the track rows; `/liked` lists them by composer with the performer at the right, each opening the player at that movement with that recording; "Liked" in the header; `PUT /api/likes`
- Score PDFs are filed as `storage/scores/<composer>/<work>/<label>.pdf` (file names capped at 40 characters, numbered when taken); `npm run db:scores` moves scores stored under the old generated names, which keep working until then
- YouTube keeps playing when you leave the work page: one player for the whole app sits over the work page's video area and, elsewhere, floats bottom-right above the Spotify mini player with the work's name (linking back) and ✕; play-through loads each next video into it. Opening another work while a video plays leaves it playing and offers "▶ Play this recording here" (a track's ▶ or picking a recording in the list also takes over); coming back to the playing work shows its recording
- The floating video and the Spotify mini player minimize (▾) to a one-line bar and expand again (▴); the minimized video keeps playing
- YouTube links with a timestamp (`t=754`, `t=754s`, `t=1h2m3s`, `#t=…`, an embed's `start=`) start the piece there — e.g. one piece inside a whole concert video — when the recording is played or opened without a movement; movement times stay times in the video

- Concert videos: `/concerts` (in the header) lists every YouTube video mapped into pieces, with "+ Add concert" to paste a link (titles come from YouTube, no API key). `/concert/[video]` shows the video beside its pieces, each with a start and an optional end ("Now" buttons; a piece ends at the next one's start unless given its own end, e.g. before the applause), its work or one movement of it (searched across every composer, with composers not yet imported offered from Open Opus and imported on the spot) and its performers. Each piece is saved as an ordinary recording of its work, sharing the video; "Open concert ↗" on a work page leads back
- A piece of a concert plays only itself on its work page: from its start, stopping at its end
- Play mode for YouTube, one icon cycling through play along (green arrows: skip from a piece's own end to the next piece, pause after the last, move on to the next recording), loop the track (green arrows with a 1: back to the start of the current piece or movement) and off (gray arrows: the video just plays)
- A recording can be of one movement, added from the work page too (a Movement choice in the form): a YouTube video of just that movement needs no start time, and a Spotify album gives just that movement's track
- The performer field suggests known performers as you type, forgiving misspellings and other romanizations ("sungjin jo" finds Seong-Jin Cho, "wladimir horovits" Horowitz), with "+ New performer" for someone new; for several performers, it suggests for the one after the last "/"
- The floating players drag to any corner and stay there: they stretch a little toward the pointer, jump to another corner as soon as the pointer is over it, and spring back when let go
- A player that is playing (the floating video, the Spotify mini player or both) is tinted light mint
- Only one player plays at a time: starting the video pauses Spotify, and Spotify starting pauses the video; pausing one never resumes the other
- The Library dims composers not imported yet, and an "Imported only" switch (off at first) hides them
- `GET /api/performers/search?q=` and `GET /api/works/search?q=`
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
- The Spotify mini player is stacked bottom-right under the floating YouTube video; the works list's movement toggle (▸ ▾) is larger
- The works list's "With recordings" is a switch, on by default (off for a composer with no recordings yet)
- The recordings pane lists the work by movement instead of by performer: a "Whole work" row (every recording) and one row per movement, each with avatars (initials) of the recordings that have it and a dot for their source (Spotify green, YouTube red); a single piece is one row. Clicking an avatar plays that recording there and selects it; the selected recording is named below with its performers, ✎ edit and ✕ delete, and the ★s like its movements, on the rows where it has an avatar

- Links to a recording use a short slug of its performer and year, `?recording=vladimir-horowitz-1987`, instead of its id (old links by id still work)
- A YouTube link's timestamp is now stored as the recording's start (`start_seconds`, with an optional `end_seconds`), moved out of existing links by a migration
- The minimized players show ⏯ and the title; a click anywhere else on the bar expands it, with an animated fold either way. The minimize button is an underscore, at the top right of the Spotify player
- The Spotify mini player's controls are centred: like, previous, play/pause, next, repeat; repeat shows the loop icon with a 1, green while the track repeats
- The players' animations play even when the system asks for reduced motion
### Removed
- The performer tiles (initials) and the recordings pane's Spotify panel with "Play this recording from the start" (replaced by the track list and the mini player)
- Login, sessions and `proxy.ts`; `/login`, `/api/auth/*` and the header log in / log out link; `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`
- Vercel Blob uploads and `POST /api/scores`; `BLOB_READ_WRITE_TOKEN`
- Neon serverless driver
- The composer page "Edit" link, which led to a missing page (it returns with the admin pages)
- The movement dropdown beside the score's page turners and the work page's "N movements" list (replaced by the title bar's movement control)

- The floating video's ✕: it is never closed, only minimized
- "Disconnect Spotify" from the mini player, until a settings page arrives with logins (the route remains)
### Fixed
- Play started whatever Spotify had paused instead of the recording; it now resumes only a track of that recording and otherwise plays the recording
- Recordings saved as a single Spotify track didn't start (an idle Spotify accepts a bare track request but doesn't play it); every recording now starts inside its album, and an album saved for a work without movements starts at the work's track
- Editing the selected recording left a stale edit form behind when switching recordings
- A YouTube recording now plays after jumping to a movement
- Scanned scores (JBIG2 images) no longer render as blank pages
- Component tests no longer see leftover output from earlier tests (Testing Library cleanup now runs after each test)
- The recording list tests no longer raise "Body has already been read" errors (each mocked fetch returns a fresh response)
