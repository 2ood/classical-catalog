# Classical Catalog

A personal, local-only web app for curating a library of classical music scores and recordings. Browse composers in a word cloud, open a composer's works grouped by genre and sorted by catalogue number, then study a work in a split view: the PDF score on the left, a YouTube or Spotify recording on the right, switchable between stored performers. It runs on your own machine — Postgres in Docker, PDF scores on local disk — and listens on 127.0.0.1 only, so there is no login.

Original specification: [classical-catalog-proposal.md](classical-catalog-proposal.md) (hosting and auth sections superseded by the local-only pivot; see [ROADMAP.md](ROADMAP.md)).

## Features

- Library — import composers and their complete work lists from [Open Opus](https://openopus.org), with movements (or a collection's pieces) from [MusicBrainz](https://musicbrainz.org); works you entered by hand are matched, not duplicated
- Composer cloud — names sized by number of recorded works, deterministic layout
- Composer map views — a timeline of lifespans, clouds per period, and clouds per movement (The Five, Impressionism, Les Six, …; editable per composer), on the home page and over the whole Open Opus catalogue in the Library
- Works list — grouped by genre, sorted by catalogue number, genre filter chips; each work's movements listed under it, opening the player at that movement
- Suggested recordings — a work without recordings suggests Spotify albums of it; plus a YouTube search link
- Adding a Spotify recording matches the album's tracks to the work's movements as you paste the link, to check and adjust before saving
- Search within a composer's works by title or catalogue number, or show only works with recordings
- Likes (★) for a recording's movements, listed on a Liked page
- Readable addresses, e.g. `/composer/brahms/klavierstucke-op-118/ii-intermezzo-in-a-dur-andante-teneramente`
- Player page — PDF score viewer (upload, or search IMSLP) beside a YouTube/Spotify embed
- Recordings as a track list — each movement (or the piece) with its own play button, the one playing in Spotify green; edit or delete a recording; a movement control beside the work's title moves score and recording together
- Performers — recordings linked to performers (orchestras, choirs, people by instrument), with pages, renaming and merging; "Play all" plays a performer's recordings one after another
- A floating mini player on every page while Spotify plays (previous / next, repeat, like, "Go to current track"); YouTube keeps playing across pages too, floating above it; both minimize to a one-line bar
- Movements: jump through the score by movement; a YouTube recording seeks to the chosen movement and turns the score as it plays; a Spotify recording loads each movement's track — or, with Spotify Connect, plays it in your Spotify app and turns the score as tracks change
- PDF scores stored on local disk by composer and work (`storage/scores/<composer>/<work>/<label>.pdf`), served by the app
- Admin pages for managing composers, works, recordings and scores (planned)

## Tech Stack

- Next.js (latest stable, App Router), TypeScript
- Tailwind CSS v4 — monochrome design system with one accent color
- PostgreSQL 17 (Docker Compose) via `postgres` (postgres.js) + Drizzle ORM
- Local filesystem for PDF scores
- react-pdf, YouTube and Spotify iframe embeds
- Vitest + Testing Library; ESLint + Prettier

## Getting Started

### Prerequisites

- Node.js 22+ and npm
- Docker Desktop (running)

### Installation

```bash
git clone https://github.com/2ood/classical-catalog.git
cd classical-catalog
npm install                  # also copies PDF.js assets to public/pdfjs
cp .env.example .env         # defaults match docker-compose.yml
npm run db:up                # start Postgres in Docker
npm run db:migrate           # apply drizzle/ migrations
npm run db:seed              # optional sample data (skips a non-empty DB)
npm run dev                  # http://127.0.0.1:3000
```

For everyday use, `npm run build && npm start` serves the optimized build on the same address.

To fill the library, open **Library** and import composers. Importing needs internet access: works come from Open Opus, movements from MusicBrainz, which allows about one request per second — a composer takes from a few seconds to about 3 minutes (Bach), with progress shown. **Update** adds new works and missing movements later.

### Environment variables

```
DATABASE_URL=postgres://classical:classical@127.0.0.1:5432/classical
SCORES_DIR=              # optional; where PDFs are stored (default storage/scores)
SPOTIFY_CLIENT_ID=       # optional; see Spotify Connect below
```

Postgres data lives in the `pgdata` Docker volume; PDFs live in `SCORES_DIR`. Back up both to keep the library.

### Spotify Connect (optional)

Spotify recordings can play in your own Spotify app (desktop or phone) instead of the embedded player, with the score following each movement's track. This needs Spotify Premium.

1. Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) — APIs used: **Web API**.
2. Add the redirect URI `http://127.0.0.1:3000/api/spotify/callback` (Spotify does not accept `localhost`).
3. Put the app's client ID in `.env` as `SPOTIFY_CLIENT_ID` and restart the server.
4. Open the app at **http://127.0.0.1:3000**, go to a Spotify recording and click **Connect Spotify**.

The login is stored in the local database; **Disconnect** forgets it.

### Scripts

```bash
npm run dev          # dev server on 127.0.0.1
npm start            # production server on 127.0.0.1 (after npm run build)
npm test             # Vitest
npm run lint         # ESLint
npm run format       # Prettier
npm run db:up        # start Postgres (docker compose up -d)
npm run db:generate  # generate a migration after editing lib/schema.ts
npm run db:schools   # give composers without movements their built-in / Wikidata ones
npm run db:performers # link recordings made before performers to their performers
npm run db:scores    # move scores stored under old generated names into composer/work folders
```

## Project Structure

```
app/                routes: /, /library, /liked, /performers, /performer/[slug], /composer/[slug], /composer/[slug]/[work]/[[...movement]], /api/*
components/         UI components (ComposerCloud, WorksList, LibraryBrowser, ScoreViewer, RecordingPlayer, ...)
lib/                db client, Drizzle schema, Open Opus / MusicBrainz clients, title parsing, import, slugs, local score storage
scripts/            seed and PDF.js asset copy scripts
drizzle/            generated SQL migrations (npm run db:generate)
docker-compose.yml  local Postgres 17
storage/            uploaded PDF scores (git-ignored)
```

## Conventions

- Test-driven: write a failing Vitest test first, then make it pass
- Tests live next to the code they test (`lib/media.ts` → `lib/media.test.ts`)
- No e2e framework — each milestone ends with a manual check against `npm run dev`
- Prettier formats, ESLint lints (`eslint-config-prettier` resolves conflicts)
- Monochrome design tokens plus one accent, Spotify green (`accent`), used only for what is playing now — no ad-hoc colors; font weights 400/500 only, never bold
- Local-only: servers bind to 127.0.0.1 and nothing requires a login

## Roadmap

See [ROADMAP.md](ROADMAP.md) for current status and planned work.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.
