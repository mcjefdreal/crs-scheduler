## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Add-ons**: prettier, eslint, tailwindcss, sveltekit-adapter, mcp

---

## Project: CRS Scheduler

SvelteKit web app that parses UPD CRS class schedule HTML (pasted by user), generates non-overlapping schedule combinations, and ranks them by `slotsLeft / demand`. Client-side only, data persisted in IndexedDB via Dexie.

User is BS CS / COE / Engg.

### Stack
Svelte 5 + Tailwind CSS 4 + TypeScript + Dexie (IndexedDB)

### Commands
```sh
pnpm dev      # dev server
pnpm check    # type-check + svelte-check
pnpm build    # production build
```

### Architecture

**Core library** (`src/lib/`):
- `types.ts` — `Section`, `Course`, `Schedule`, `Meeting` interfaces. `Section.excluded` drives auto-exclude. `Course.priority` (0-5, 0=no priority) weights schedule scoring — P1 is highest, P5 lowest.
- `parser.ts` — Parses CRS portal `<table>` HTML via `DOMParser`. Handles at least 2 table formats (differing column layouts). Dual time notation (`10-11:30AM` vs `11:30AM-1PM`). Reads cells[4] (Remarks) + cells[5] (Restrictions), merges restriction-relevant text, auto-sets `excluded` boolean. Hardcoded `ALLOWED_PROGRAMS = ['BS CS', 'Engg', 'COE']` — sections with `For:` clause naming these programs are auto-included.
- `scheduler.ts` — `generateSchedules()`, backtracking with MRV ordering (fewest sections first), overlap pruning via `doMeetingsOverlap()`, top 50 results by score descending. Filters `excluded` sections and `slotsLeft === 0` sections before backtracking. Course priority weights section scores: `score *= 1 + (6 - priority) * 0.5` — P1 effective weight 5 (3.5×), P5 weight 1 (1.5×).
- `db.ts` — Dexie `CRSDatabase` with `courses` table.
- `index.ts` — barrel exports.

**UI** (`src/routes/`):
- `+page.svelte` — Single-page app with 3-column layout (left: courses + excluded, middle: add-course form + preferences, right: schedule results). Course priority select (P1↑–P5↓) per course. Excluded sections sidebar with include toggles, exclude buttons on result cards. `showExcluded` and `earliestStartMin` persist in localStorage.
- `components/TimelineGrid.svelte` — Mon-Sat 7AM-9PM visual calendar grid.

### Key Decisions
- Auto-exclude is regex-based: `for\s*:|reserved|^D\b` on restrictions column, `for\s+.*only|reserved` on remarks. Program-aware override checks `For:` clause against `ALLOWED_PROGRAMS`.
- Remarks text only merges into `restrictions` display if it contains `for\s+|reserved` patterns. "Prerequisite: None" excluded.
- Existing IndexedDB data doesn't auto-update on parser changes — user must re-import HTML.
- Scheduler filters happen pre-backtracking (excluded + 0-slot), not during.
- Course priority is P1=highest, P5=lowest (1-5 scale). Internally mapped to `6 - priority` for scoring weights.
- Layout: 3-column grid (`1fr 1fr 2fr` on lg), 95vw max-width. Left sidebar has `min-w-0` to prevent column-width shifts from excluded section toggle.
- UI preferences (`showExcluded`, `earliestStartMin`) persist in localStorage.
- Svelte 5 `$state` proxies cannot be sent to IndexedDB (structured clone fails). Course objects from `courses.find()` must be deep-cloned via `JSON.parse(JSON.stringify(...))` before `db.courses.put()`.

### Known Issues
- 10 a11y warnings (dialog tabindex, click handlers) — harmless
- No multi-format auto-detection — fixed column indices assumed
- `ALLOWED_PROGRAMS` hardcoded, not configurable via UI

### Svelte MCP Tools
When writing Svelte code, use the Svelte MCP server tools: `list-sections` first, then `get-documentation` for relevant sections, and `svelte-autofixer` to validate before sending code.
