# Critique: src/routes/+page.svelte

## Method: dual-agent (A: oracle · B: explorer)

## Design Health Score

| #         | Heuristic                      | Score     | Key Issue                                                                                      |
| --------- | ------------------------------ | --------- | ---------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status    | 3         | Spinner on Generate, fetchProgress/refreshProgress, but no ETA/count/cancel                    |
| 2         | Match System / Real World      | 3         | Domain-native terms (CRN/slots/demand), but "Chance" and "P1↑–P5↓" unexplained                 |
| 3         | User Control and Freedom       | 2         | No undo anywhere; removeCourse/toggleSectionExclusion destructive, no confirm                  |
| 4         | Consistency and Standards      | 2         | Three button radii, focus rings ring-4 vs spec's 2px, maroon used for data content             |
| 5         | Error Prevention               | 3         | Empty course name validated, locked conflict detected, but no warning before removing courses  |
| 6         | Recognition Rather Than Recall | 3         | Instructions modal present, but priority/Chance/day-off meanings require docs                  |
| 7         | Flexibility and Efficiency     | 3         | Batch fetch, search/filter, Compare, Enter-to-add; no Generate shortcut, no quick-lock         |
| 8         | Aesthetic and Minimalist       | 2         | Cluttered middle column, redundant Chance label+bar+% , 12px text everywhere                   |
| 9         | Error Recognition and Recovery | 3         | Locked-conflict copy is specific and actionable, but "No matching schedules" gives no recovery |
| 10        | Help and Documentation         | 3         | 5-step modal decent, but header+footer duplicate "How to use", no inline tooltips              |
| **Total** |                                | **25/40** | **Acceptable — significant improvements needed**                                               |

## Anti-Patterns Verdict

**LLM assessment**: Mostly clean, but reads "AI-converted-from-Tailwind" rather than "AI-made-from-scratch." No gradient text, no hero, no marketing eyebrows. The token migration landed the palette but preserved old structural sins.

- **Side-stripe borders** — `border-l-4 border-maroon` on locked sections (L788, L883, L968, L1389). DESIGN.md allows this only for selected/active state. Used for locked state across 4 contexts — exception stretched.
- **Glassmorphism** — `backdrop-blur-sm` on instructions modal scrim (L1506). DESIGN.md bans glassmorphism outright.
- **Text overflow** — `truncate` on `meetingSummary` (L797), `restrictions` (L892, L980). Hiding the schedule and restrictions in a schedule tool is the cardinal sin — inverts the product's north star.
- **Hero-metric template** — "Chance" label + maroon progress bar + percentage on every card (L1354–1363). Bar + % is redundant; "Chance" adds a third redundant signal. Borderline SaaS tell.
- **Eyebrow kickers** — Section headers at 14px `uppercase`; spec says Label = 12px. Spec drift.
- **Numbered section markers** — `#{idx + 1}` on cards (L1352). Functional ranking, not marketing — passes.
- **Identical card grids** — Schedule cards are template-identical. Acceptable: schedules ARE the data.

**Deterministic scan**: 1 antipattern found — `overused-font` (Inter) at `layout.css:50`. Inter is a deliberate choice per PRODUCT.md (Apple Reminders/Calendar reference). No browser-dependent checks (contrast, spacing rhythm, visual layout) available — systemic to static-only analysis. 0 false positives.

**Visual overlays**: Not available — no browser automation tools exposed. Fallback signal used.

## Overall Impression

The token migration succeeded at the paint level but stopped short of the structure. The palette is correct, but the type scale, radius scale, focus-ring spec, and "maroon-for-chrome-only" rule are not yet enforced in the markup. Three P0 bugs (token swap, double empty state, dead-end copy) are immediate. The deeper issue: the conversion preserved a 12px, truncate-everything, maroon-for-data density that contradicts the spec the tokens were meant to serve.

## What's Working

1. **Three-column grid matches the spec and the workflow.** `lg:grid-cols-[1fr_1fr_2fr]` with `gap-8` gives the data-first layout DESIGN.md asks for. `TimelineGrid` on every result card enables rapid visual comparison.
2. **Locked-conflict error is specific and actionable** (L1263–1270): names the cause, tells the user what to do. Best error copy in the file.
3. **Progressive disclosure is consistent where applied**: collapsible course sections, show/hide on excluded/zero-slot, expandable schedule details, search/filter on every list.

## Priority Issues

### P0 — Critical

- **Token semantic bug: `zeroslot` vs `zerocourse` swapped.** `zeroslot` (green `#047857`) used for success/available (fetchSuccess L1064, "slots left > 0" L1448). `zerocourse` (purple `#6d28d9`) used for the Zero Slots sidebar (L933–980). Names invert usage. Fix names or fix usage — both cannot stand.
- **Double empty state stacks.** When `filteredSchedules.length === 0` AND `minGapMinutes > 0`, both `{#if}` blocks at L1326 and L1332 render — two "no results" messages stacked. Logic bug.
- **Empty-state copy references nonexistent button.** "click Add Course" (L665) — no such button; it's "Fetch" (L1050). First-time users hit a dead end.
- **Wrong variable in courses-list empty state.** L838 renders `No sections match "{excludedSearch}"` inside the courses `{#each}` — should reference `sectionSearch`. Cross-variable bug.

### P1 — High

- **Maroon used for data content, violating spec.** Probability bar `bg-maroon` (L1357), section score `text-maroon` (L1419). DESIGN.md §2: "Never use maroon for data content." Combined with maroon buttons, selected day-off chips, logo box, the Ten Percent Rule is strained with 3+ excluded sections or 2+ selected days.
- **Text below 14px floor.** Pervasive `text-xs` (12px) for body content: instructor names (L795), meeting times (L797), slot counts (L800), schedule metadata (L1435–1453). `text-[10px]` on Exclude button (L1428). DESIGN.md: "Don't set body text below 14px."
- **Truncated core data.** `truncate` on `meetingSummary` (L797) hides meeting days/times. `truncate` on `restrictions` (L892, L980) hides safety-critical enrollment restrictions. Replace with wrap or multi-line.

### P2 — Medium

- **Focus ring inconsistent with spec.** Inputs use `ring-maroon/20 focus:ring-4` (L1032, L1045, L1084, L1109, L1144, L1322). Spec §4: "2px maroon, offset 0."
- **Button radius inconsistent.** Generate = `rounded-md` (L1236) but spec says primary = `rounded-lg`. Day-off chips = `rounded-md` (L1121) but spec says `rounded-full`. Include = `rounded-sm` (L919).
- **Modal a11y + glassmorphism.** Instructions modal (L1504–1545): `backdrop-blur-sm` (banned), no Escape handler, no focus trap.
- **No undo for destructive actions.** `removeCourse` (L237), `toggleSectionExclusion` (L580), `clearLocks` (L205) — all instant, irreversible.
- **Generate button far from its outcome.** Action in middle column (L1233), results in right column (L1262). No sticky generate, no keyboard shortcut.

### P3 — Low

- **"Chance" label ambiguous** — chance of what? No tooltip.
- **"P1↑–P5↓" notation unclear** — arrow direction ambiguous, no inline explanation.
- **Day-off "T" vs "TH"** — both start with T. Use "Tu"/"Th".
- **Footer duplicates header** — "How to use" at L622 and L1479.
- **Width mismatch** — header/footer `max-w-3xl` (L603, L1476) vs content `max-w-[95vw]` (L631).
- **`fetchSuccess` persists** — no auto-dismiss.
- **Priority as plain `<select>`** — DESIGN.md §5 calls for priority badges/chips.

## Persona Red Flags

**Jordan First-Timer**

- Empty state says "click Add Course" (L665) — no such button. First dead end.
- "Chance" (L1354) unlabeled — 73% of what? Anxiety at the decision moment.
- "P1↑" (L731) unexplained inline — must open a modal to learn the notation.
- Three columns all visible at once — no guided onboarding, no nudge pointing to Fetch input.

**Sam Accessibility**

- 12px and 10px text below the 14px floor — low-vision strain across entire UI.
- Modal has no Escape handler, no focus trap (L1504) — keyboard users stranded.
- Many SVGs lack `aria-hidden="true"` — screen-reader noise.
- Three sidebars distinguished only by amber/green/purple — colorblind users get no redundant text cue.
- `truncate` hides data visually; SR reads full text, but sighted low-vision users with magnification lose the truncated tail.

**Riley Stress Tester**

- `removeCourse` (L237) — no confirm. One misclick destroys a course + all schedules.
- `toggleSectionExclusion` (L580) — wipes schedules on every toggle. No undo.
- Generate has no cancel (L1235) — long runs trap the user.
- Double empty state (P0) — two stacked "no results" messages confuse under stress.
- "No matching schedules" (L1336) gives no recovery direction.

## Minor Observations

- `findCourseForSection` (L572) is O(n·m), called per locked CRN in a loop (L1204) — minor perf at scale.
- `slotsLeft` (L568) is a one-line wrapper of `section.slotsLeft` — redundant function.
- Two day-label systems: `['Mon','Tue','Wed','Thu','Fri','Sat']` (L559) vs `['M','T','W','H','F','S']` (L1440). Inconsistent — 'Thu' vs 'H'.
- `sectionScore` (L1419) shown to 2 decimals (`toFixed(2)`) — false precision.
- `bg-maroon-subtle` on refresh progress message (L656) — maroon-subtle is spec'd for selected/hover, not info messages.
- Priority `select` uses `value={course.priority ?? 0}` (L721) with `value={0}` for "—" (L730) — unset and explicit-0 conflated.
- `zeroslot` green used for fetchSuccess (L1064) — success state borrowing a data token. No neutral success token exists in the palette — gap.

## Questions to Consider

1. "Chance" of what? The label sits on every card next to a percentage and a bar, but nowhere does the UI say what the probability refers to. Either label it precisely or remove it.
2. If the schedule grid IS the interface, why is Generate buried in the middle column? The action that produces results is separated from the results by a column boundary and a scroll.
3. Three sidebars, three colors, three names — and two of the names are backwards. If a new contributor opens layout.css tomorrow, can they tell what `zeroslot` means?
4. The page is 80% 12px text in a tool whose product principle is "fast to scan." Did the token conversion repaint the palette but preserve the old type scale?
5. No undo anywhere. For a tool used to make enrollment decisions, why is there no safety net?
