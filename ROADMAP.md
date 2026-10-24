# Roadmap

Spec: [classical-catalog-proposal.md](classical-catalog-proposal.md). Every milestone is test-driven (Vitest) and ends with a manual verification checklist run against `npm run dev`.

## Planned

### Milestone 1: Walking skeleton (target: 2026-10-25)
End-to-end slice on real data: composer list → works list → player with a working embed.
- [ ] Scaffold with `create-next-app@latest` (TypeScript, App Router, Tailwind v4, ESLint)
- [ ] Add Prettier + `eslint-config-prettier`, Vitest + Testing Library, `npm test` / `format` scripts
- [ ] Design tokens in `app/globals.css` `@theme`; Inter + IM Fell English via `next/font`
- [ ] `lib/schema.ts` (composers, works, recordings, scores), `lib/db.ts` (Neon serverless + Drizzle), `drizzle.config.ts`, first migration applied to Neon
- [ ] `scripts/seed.ts` — sample composers, works, and YouTube + Spotify recordings (run with tsx)
- [ ] `lib/media.ts` — `extractYouTubeId`, `extractSpotifyId` (track/album/playlist), test-first
- [ ] Auth: `lib/session.ts`, `POST /api/auth/login` (env-var check, test-first), `POST /api/auth/logout`, `/login` page
- [ ] `proxy.ts` — `/admin` redirects to `/login`, unauthenticated mutating API calls get 401
- [ ] `/` — plain list of composers linking to `/composer/[id]`
- [ ] `/composer/[id]` — plain list of works linking to `/work/[id]`
- [ ] `/work/[id]` — `MediaEmbed` for the selected recording; plain performer buttons to switch
- [ ] `POST /api/recordings` + `AddRecordingForm`, shown only when logged in
- [ ] Manual verification checklist handed over with the local dev server running

### Milestone 2: Composer cloud
- [ ] Seeded PRNG from composer UUID (deterministic, test-first)
- [ ] Font-size scale 16–42px from count of works with ≥1 recording (test-first)
- [ ] Collision-nudge loop, max 20 iterations per composer (test-first: no overlapping boxes)
- [ ] `ComposerCloud` render, underline on hover, tooltip "Name · Era · …"
- [ ] `GET /api/composers` with recording counts

### Milestone 3: Works list
- [ ] Catalogue-number natural sort (`K. 9` < `K. 550`, `Op. 10 No. 2`) — test-first
- [ ] Group by genre, genre header styling
- [ ] `GenreFilter` chips (active/inactive states)
- [ ] Recording dot; 35% opacity for works without recordings
- [ ] Header with serif name, era label, back arrow, "Edit" link when logged in
- [ ] `GET /api/works?composer_id=`

### Milestone 4: Player — recordings pane
- [ ] `PerformerTiles` — 40px circles with initials, active state
- [ ] Hover ✕ delete when logged in; `DELETE /api/recordings/[id]`
- [ ] Embed fills remaining pane height; two-column layout with 1px divider

### Milestone 5: Player — score pane
- [ ] `lib/blob.ts`; `POST /api/scores/upload`, `DELETE /api/scores/[id]`
- [ ] `DropUpload` drag-and-drop zone (logged in only)
- [ ] `ScoreViewer` with react-pdf, page controls pinned to bottom
- [ ] Score selector dropdown when multiple scores; IMSLP search button

### Milestone 6: Admin
- [ ] `POST /api/composers`, `POST /api/works`, `PATCH`/`DELETE /api/works/[id]`
- [ ] `/admin` composer dashboard
- [ ] `/admin/composer/[id]` — edit composer, add/remove works
- [ ] `/admin/work/[id]` — edit work, manage recordings and scores

### Milestone 7: Vercel deploy
- [ ] Link Neon and Blob integrations, set env vars
- [ ] `vercel --prod` and production smoke test

## Completed
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
