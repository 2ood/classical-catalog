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

### Fixed
- Component tests no longer see leftover output from earlier tests (Testing Library cleanup now runs after each test)
