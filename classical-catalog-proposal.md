# Classical Music Catalog — Development Plan

> **Superseded in part (2026-10-25):** the project pivoted to local-only. Vercel hosting, Neon, Vercel Blob and the login (sections 2, 3, 8, 10–11) are replaced by Postgres in Docker, PDFs on local disk, and no auth. See [ROADMAP.md](ROADMAP.md), Milestone 6.

A personal web service for curating classical music scores and recordings, deployed on Vercel.

---

## 1. Product Overview

A three-screen web app where the user manually curates a personal library of classical music. The user browses composers via an interactive word cloud, navigates to a genre-clustered works list sorted by catalogue number, and opens a split-view player page that shows a PDF score alongside a recording — either a YouTube video or a Spotify track — selected from a set of stored performer links.

All data (composer catalogue, media links, PDF files) is entered and managed by the user. There is no automated scraping or public API ingestion beyond an optional IMSLP search helper.

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js, latest stable (App Router) | File-based routing, server components, API routes, Vercel-native |
| Styling | Tailwind CSS v4 | Utility-first; theme defined in CSS via `@theme` (the default from `create-next-app`) |
| Database | Neon Postgres (via Vercel Marketplace) + `@neondatabase/serverless` | Serverless-friendly relational DB; free tier sufficient. Replaces the deprecated `@vercel/postgres` |
| File storage | Vercel Blob | PDF score uploads, simple SDK |
| Auth | Iron Session + bcryptjs | Lightweight cookie-session auth; credentials checked against env vars, no users table |
| PDF viewer | `react-pdf` (pdf.js wrapper) | In-browser PDF rendering, no server needed |
| YouTube embed | YouTube IFrame API | Swap videos by updating `src`, no reload |
| Spotify embed | Spotify iFrame API | Embed tracks or episodes inline |
| ORM | Drizzle ORM | Lightweight, type-safe, works well with Neon |
| Language | TypeScript | End-to-end type safety |
| Package manager | npm | |
| Lint / format | ESLint + Prettier | `eslint-config-prettier` to avoid rule conflicts |
| Testing | Vitest + Testing Library | Test-driven; no e2e framework — end-to-end checks are manual against a local dev server |
| Scripts | `tsx` | Runs TypeScript scripts (e.g. sample-data seed) directly |

---

## 3. Authentication

Single user. No OAuth, no magic links, no users table — the username and bcrypt password hash live in environment variables.

**How it works:**
- `/login` — a plain HTML form (username + password). On submit, compare the username to `ADMIN_USERNAME` and verify the password against `ADMIN_PASSWORD_HASH` with `bcrypt.compare`, create an encrypted Iron Session cookie, redirect to `/`.
- `proxy.ts` (called `middleware.ts` before Next.js 16) — checks for a valid session cookie on all `/admin` routes and all mutating API routes. Pages redirect to `/login`; API routes return 401.
- `/api/auth/logout` — clears the session cookie.
- No user management UI and no seed script for the admin. Changing the password = regenerating the hash and updating the env var.

**Packages:**
```
iron-session       # encrypted cookie sessions
bcryptjs           # password hashing
```

**Environment variables:**
```
SESSION_SECRET=    # random 32-char string; used by iron-session to sign cookies
ADMIN_USERNAME=    # seeded at deploy time
ADMIN_PASSWORD_HASH= # bcrypt hash; generate with: node -e "console.log(require('bcryptjs').hashSync('yourpw', 10))"
```

Note: bcrypt hashes contain `$`. In `.env.local`, wrap the value in single quotes so it isn't interpolated.

---

## 4. Design System

Minimal monochrome. Every surface, text, and border is black, white, or a shade of gray. No color is used for decoration — only for functional state (e.g. active/selected).

### Palette

```
--color-bg:        #ffffff   /* page background */
--color-surface:   #f7f7f7   /* card, pane, sidebar backgrounds */
--color-border:    #e0e0e0   /* all dividers and outlines */
--color-muted:     #999999   /* secondary labels, hints, placeholders */
--color-text:      #111111   /* primary text */
--color-inverse-bg:  #111111 /* inverted surfaces (active states) */
--color-inverse-text: #ffffff
```

### Typography

- Font: `Inter` (Google Fonts). Weights used: 400 regular, 500 medium.
- Never use bold (700) — hierarchy comes from size and opacity, not weight.
- Base size: 14px. Line height: 1.6.
- Composer cloud uses `font-family: 'IM Fell English', serif` for character — sizes scale from 16px to 42px.

```
text-xs:   11px  /* metadata, labels, badges */
text-sm:   13px  /* secondary content, filter chips */
text-base: 14px  /* body, list rows */
text-lg:   18px  /* section headings */
text-xl:   24px  /* page titles */
```

### Spacing

4px base unit. Use multiples: 4, 8, 12, 16, 24, 32, 48px.

### Components

**Buttons**
- Default: white bg, 1px `--color-border` border, `--color-text`. Hover: bg `--color-surface`.
- Primary (save, submit): black bg (`--color-inverse-bg`), white text. Hover: `#333`.
- No border-radius curves larger than 4px on buttons. Keep them rectangular.
- No shadows.

**Filter chips** (works list genre filter)
- Inactive: white bg, 1px border, muted text.
- Active: black bg, white text, no border.
- Border-radius: 2px.

**Performer avatar tiles**
- Circle, 40px diameter.
- Default: `--color-surface` bg, 1px border, initials in `--color-muted`.
- Active: black bg, white initials, no border.

**Inputs**
- 1px border `--color-border`. Bg white. No border-radius.
- Focus: border becomes `--color-text` (black). No colored outline or glow.

**Dividers**
- Always `1px solid --color-border`. Never thicker.

**Opacity states**
- Works with no recordings: `opacity: 0.35`.
- Disabled controls: `opacity: 0.4`.

### Era indicator (composer cloud only)

Era is encoded only through font size and a small superscript era label on hover tooltip — not color. This keeps the cloud strictly monochrome.

```
Baroque   → "B"
Classical → "C"
Romantic  → "R"
Modern    → "M"
```

### Tailwind theme (v4, CSS-first)

Tailwind v4 has no `tailwind.config.ts`; the theme lives in `app/globals.css`. Fonts are loaded with `next/font/google` and exposed as CSS variables.

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-surface: #f7f7f7;
  --color-border:  #e0e0e0;
  --color-muted:   #999999;

  --font-sans:  var(--font-inter), sans-serif;
  --font-serif: var(--font-im-fell), serif;

  --radius-sm: 2px;
  --radius-md: 4px;
}
```

---

## 5. Data Model

```sql
-- Composers
composers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,         -- "Wolfgang Amadeus Mozart"
  short_name  TEXT NOT NULL,         -- "Mozart" (used in the cloud)
  born        INT,
  died        INT,
  era         TEXT,                  -- "Baroque" | "Classical" | "Romantic" | "Modern"
  created_at  TIMESTAMPTZ DEFAULT NOW()
)

-- Works (pieces)
works (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  composer_id   UUID REFERENCES composers(id) ON DELETE CASCADE,
  catalogue_num TEXT,                -- "K. 550" or "Op. 67"
  title         TEXT NOT NULL,       -- "Symphony No. 40 in G minor"
  genre         TEXT NOT NULL,       -- "Symphony" | "Piano Concerto" | "Opera" ...
  key           TEXT,                -- "G minor"
  created_at    TIMESTAMPTZ DEFAULT NOW()
)

-- Recordings (YouTube or Spotify, per performer)
recordings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id       UUID REFERENCES works(id) ON DELETE CASCADE,
  performer     TEXT NOT NULL,       -- "Karajan / BPO"
  year          INT,
  media_type    TEXT NOT NULL,       -- "youtube" | "spotify"
  media_url     TEXT NOT NULL,       -- full YouTube URL or Spotify track/album URL
  created_at    TIMESTAMPTZ DEFAULT NOW()
)

-- Scores (PDF files)
scores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id     UUID REFERENCES works(id) ON DELETE CASCADE,
  label       TEXT,                  -- "Full score" | "Piano reduction"
  blob_url    TEXT NOT NULL,         -- Vercel Blob URL
  source      TEXT,                  -- "IMSLP" or free-text note
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
)
```

---

## 6. Page Structure

```
/                        → Composer cloud (Screen 1)
/composer/[id]           → Works list (Screen 2)
/work/[id]               → Player page (Screen 3)

/login                   → Login form
/admin                   → Dashboard: manage composers
/admin/composer/[id]     → Edit composer, add/remove works
/admin/work/[id]         → Edit work, add/remove recordings and scores
```

All `/admin` routes and all mutating API routes require a valid session cookie.

---

## 7. Screen Specifications

### Screen 1 — Composer Cloud (`/`)

- Render all composers as absolutely-positioned names inside a fixed-height container.
- Font: `font-serif` (IM Fell English). Color: `--color-text`. Hover: underline only.
- Font size proportional to number of works with at least one recording. Scale: 16px → 42px.
- Positions computed deterministically from a seeded PRNG (seed = composer UUID). Run a collision-nudge loop (max 20 iterations per composer) to separate overlapping bounding boxes.
- Clicking a name navigates to `/composer/[id]`.
- No color coding by era. Era shown only in the tooltip on hover: e.g. "Mozart · Classical · 41 symphonies".

### Screen 2 — Works List (`/composer/[id]`)

- Header: composer full name (text-xl, font-serif) + era label (text-xs, muted) + back arrow.
- Genre filter chips below the header.
- Works grouped by genre, sorted by catalogue number within each group. Genre group label is text-xs uppercase muted, with a 1px top border.
- Each row: `[catalogue num]  [title]  [● dot]`. Dot is a filled 5px circle in black if at least one recording exists; absent if none.
- No-recording rows at 35% opacity.
- Row click → `/work/[id]`.
- If authenticated: "Edit" link appears in the header.

### Screen 3 — Player Page (`/work/[id]`)

**Layout:** Two equal columns, full viewport height minus header. 1px vertical divider between panes.

**Left pane — Score**
- Pane header: "Score" label + optional score-selector dropdown (if multiple scores stored) + IMSLP button (opens `https://imslp.org/wiki/Special:Search?search=[title]` in new tab).
- If no score: centered drag-and-drop zone. On drop/select: POST to `/api/scores/upload`, re-render viewer.
- If score exists: `react-pdf` viewer. Page controls (← page N/total →) pinned to bottom of pane.

**Right pane — Recordings**
- Top strip: row of circular performer avatar tiles. Active tile = black bg, white initials.
- Clicking a tile sets the active recording and renders the appropriate embed below.
- If authenticated: "+ Add" icon button opens an inline form: performer name, year, media type toggle (YouTube / Spotify), URL input. Submit → POST `/api/recordings`.
- If authenticated: hover on a tile reveals a small ✕ delete button.

**Embed area (below performer tiles):**
- `media_type === "youtube"`: render `<iframe src="https://www.youtube.com/embed/[videoId]" ...>`. Extract video ID from stored URL with a helper.
- `media_type === "spotify"`: render `<iframe src="https://open.spotify.com/embed/track/[trackId]" ...>`. Extract track/album ID from stored URL. Spotify embeds support tracks, albums, and playlists — handle all three URL shapes.
- Embed fills remaining pane height. No border, no border-radius.

---

## 8. API Routes

```
POST   /api/composers              Create composer (auth required)
GET    /api/composers              List all with recording counts (public)

GET    /api/works?composer_id=     List works for a composer (public)
POST   /api/works                  Create work (auth required)
PATCH  /api/works/[id]             Update work (auth required)
DELETE /api/works/[id]             Delete work (auth required)

POST   /api/recordings             Add recording (auth required)
DELETE /api/recordings/[id]        Remove recording (auth required)

POST   /api/scores/upload          Upload PDF → Vercel Blob, save record (auth required)
DELETE /api/scores/[id]            Remove score record and blob (auth required)

POST   /api/auth/login             Verify credentials, set session cookie
POST   /api/auth/logout            Clear session cookie
```

---

## 9. Project Structure

```
/
├── app/
│   ├── page.tsx                    # Composer cloud
│   ├── composer/[id]/page.tsx      # Works list
│   ├── work/[id]/page.tsx          # Player page
│   ├── login/page.tsx              # Login form
│   ├── admin/
│   │   ├── page.tsx                # Composer list dashboard
│   │   ├── composer/[id]/page.tsx  # Edit composer / works
│   │   └── work/[id]/page.tsx      # Edit work / recordings / scores
│   └── api/
│       ├── composers/route.ts
│       ├── works/route.ts
│       ├── works/[id]/route.ts
│       ├── recordings/route.ts
│       ├── recordings/[id]/route.ts
│       ├── scores/upload/route.ts
│       ├── scores/[id]/route.ts
│       └── auth/
│           ├── login/route.ts
│           └── logout/route.ts
├── components/
│   ├── ComposerCloud.tsx
│   ├── WorksList.tsx
│   ├── GenreFilter.tsx
│   ├── ScoreViewer.tsx             # react-pdf wrapper + page controls
│   ├── DropUpload.tsx
│   ├── PerformerTiles.tsx
│   ├── MediaEmbed.tsx              # renders YouTube or Spotify embed by media_type
│   └── AddRecordingForm.tsx
├── lib/
│   ├── db.ts                       # Drizzle client + Neon connection
│   ├── schema.ts                   # Drizzle table definitions
│   ├── blob.ts                     # Vercel Blob upload/delete helpers
│   ├── session.ts                  # iron-session config and helpers
│   └── media.ts                    # URL parsers: extractYouTubeId, extractSpotifyId
├── scripts/
│   └── seed.ts                     # Sample data for local dev (npx tsx scripts/seed.ts)
├── proxy.ts                        # Protect /admin and mutating API routes
├── drizzle.config.ts
├── vitest.config.ts
└── vercel.json
```

Tests sit next to the code they test: `lib/media.ts` → `lib/media.test.ts`.

---

## 10. Implementation Order

Build a thin end-to-end slice first, then deepen each screen. Every milestone is test-driven: write a failing Vitest test, then make it pass. Each milestone ends with a manual check against `npm run dev`.

1. **Walking skeleton** — scaffold (`create-next-app@latest`, Tailwind v4, ESLint + Prettier, Vitest), design tokens + fonts, Neon + Drizzle schema + migration, sample-data seed, env-based auth + `proxy.ts`, `lib/media.ts`, and bare versions of all three screens wired to real data (plain composer list → works list → player with a working YouTube/Spotify embed and logged-in "+ Add" recording).
2. **Composer cloud** — seeded PRNG layout, collision nudge, 16–42px size scale, hover tooltip.
3. **Works list** — genre grouping, catalogue-number sorting, filter chips, recording dot, opacity states, "Edit" link.
4. **Player: recordings pane** — performer tiles, switching, delete on hover, full embed styling.
5. **Player: score pane** — Vercel Blob upload, drop zone, `react-pdf` viewer, page controls, score selector, IMSLP button.
6. **Admin** — remaining API routes and CRUD pages for composers, works, recordings, scores.
7. **Vercel deploy** — link Neon and Blob integrations, set env vars, `vercel --prod`.

---

## 11. Environment Variables

```
# Neon Postgres (auto-set by the Vercel Marketplace integration; copy into .env.local for dev)
DATABASE_URL=

# Vercel Blob (auto-set by Vercel integration)
BLOB_READ_WRITE_TOKEN=

# Iron Session
SESSION_SECRET=          # random 32+ char string

# Admin credentials (set at deploy time; password stored as bcrypt hash)
ADMIN_USERNAME=
ADMIN_PASSWORD_HASH=     # generate: node -e "console.log(require('bcryptjs').hashSync('pw',10))"
```

---

## 12. Future Enhancements (out of scope for v1)

- IMSLP API integration to auto-populate work metadata
- Keyboard shortcuts for score page navigation (J/K for pages, number keys for performers)
- Mobile layout (stack score and video vertically)
- Export / backup of the full catalogue as JSON
- Public read-only share links for individual works
- Support for Apple Music embed as a third media type
