# Roadmap

Spec: [classical-catalog-proposal.md](classical-catalog-proposal.md). Every milestone is test-driven (Vitest) and ends with a manual verification checklist run against `npm run dev`.

## In Progress

### Milestone 5: Player — score pane
- [ ] `lib/blob.ts`; `POST /api/scores/upload`, `DELETE /api/scores/[id]`
- [ ] `DropUpload` drag-and-drop zone (logged in only)
- [ ] `ScoreViewer` with react-pdf, page controls pinned to bottom
- [ ] Score selector dropdown when multiple scores; IMSLP search button

## Planned

### Milestone 6: Admin
- [ ] `POST /api/composers`, `POST /api/works`, `PATCH`/`DELETE /api/works/[id]`
- [ ] `/admin` composer dashboard
- [ ] `/admin/composer/[id]` — edit composer, add/remove works
- [ ] `/admin/work/[id]` — edit work, manage recordings and scores

### Milestone 7: Vercel deploy
- [ ] Link Neon and Blob integrations, set env vars
- [ ] `vercel --prod` and production smoke test

## Completed

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
