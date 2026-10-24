# Classical Catalog

A personal web app for curating a library of classical music scores and recordings. Browse composers in a word cloud, open a composer's works grouped by genre and sorted by catalogue number, then study a work in a split view: the PDF score on the left, a YouTube or Spotify recording on the right, switchable between stored performers. All data is entered by hand by a single logged-in owner; everyone else gets a read-only view.

Full specification: [classical-catalog-proposal.md](classical-catalog-proposal.md).

## Features

- Composer cloud — names sized by number of recorded works, deterministic layout
- Works list — grouped by genre, sorted by catalogue number, genre filter chips
- Player page — PDF score viewer (upload or IMSLP lookup) beside a YouTube/Spotify embed
- Per-work performer tiles to switch between recordings
- Single-user login (credentials in env vars); editing only when logged in
- Admin pages for managing composers, works, recordings and scores

## Tech Stack

- Next.js (latest stable, App Router), TypeScript
- Tailwind CSS v4 — monochrome design system
- Neon Postgres via `@neondatabase/serverless` + Drizzle ORM
- Vercel Blob for PDF storage
- iron-session + bcryptjs for auth
- react-pdf, YouTube and Spotify iframe embeds
- Vitest + Testing Library; ESLint + Prettier
- Deployed on Vercel

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- A Neon Postgres database (free tier is enough)
- A Vercel Blob token (only needed for score uploads)

### Installation

```bash
git clone [TODO: repo URL]
cd classical-catalog
npm install
cp .env.example .env.local   # then fill in the values below
npm run db:migrate           # [TODO: confirm script name once scaffolded]
npx tsx scripts/seed.ts      # optional sample data
npm run dev
```

### Environment variables

```
DATABASE_URL=            # Neon connection string
BLOB_READ_WRITE_TOKEN=   # Vercel Blob
SESSION_SECRET=          # random 32+ char string
ADMIN_USERNAME=
ADMIN_PASSWORD_HASH=     # node -e "console.log(require('bcryptjs').hashSync('pw',10))"
```

bcrypt hashes contain `$` — wrap `ADMIN_PASSWORD_HASH` in single quotes in `.env.local`.

### Scripts

```bash
npm run dev       # local dev server
npm test          # Vitest
npm run lint      # ESLint
npm run format    # Prettier  [TODO: confirm once scaffolded]
```

## Project Structure

```
app/          routes: /, /composer/[id], /work/[id], /login, /admin/*, /api/*
components/   UI components (ComposerCloud, WorksList, ScoreViewer, MediaEmbed, ...)
lib/          db client, Drizzle schema, session, blob and media-URL helpers
scripts/      tsx scripts (sample-data seed)
proxy.ts      auth guard for /admin and mutating API routes
```

## Conventions

- Test-driven: write a failing Vitest test first, then make it pass
- Tests live next to the code they test (`lib/media.ts` → `lib/media.test.ts`)
- No e2e framework — each milestone ends with a manual check against `npm run dev`
- Prettier formats, ESLint lints (`eslint-config-prettier` resolves conflicts)
- Monochrome design tokens only — no ad-hoc colors; font weights 400/500 only, never bold
- Mutating API routes and `/admin` pages require a session; reads are public

## Roadmap

See [ROADMAP.md](ROADMAP.md) for current status and planned work.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.
