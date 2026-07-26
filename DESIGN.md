---
name: CRS Scheduler
description: Schedule generator for UPD CRS — fetches class schedules, finds non-overlapping combinations, ranks by slotsLeft/demand.
colors:
  maroon: '#7B1113'
  maroon-hover: '#680E11'
  maroon-subtle: '#F1E5E5'
  paper: '#F5F6F7'
  surface: '#FFFFFF'
  ink: '#1C1A1A'
  ink-muted: '#5C5858'
  border: '#D9DBDD'
  border-hover: '#BFC1C3'
typography:
  display:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 600
    letterSpacing: '0.02em'
    textTransform: 'uppercase'
  mono:
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
    fontSize: '0.8125rem'
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: '6px'
  md: '8px'
  lg: '12px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
  '2xl': '32px'
components:
  button-primary:
    backgroundColor: '{colors.maroon}'
    textColor: '{colors.surface}'
    rounded: '{rounded.lg}'
    padding: '8px 20px'
    typography: '{typography.label}'
  button-primary-hover:
    backgroundColor: '{colors.maroon-hover}'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.ink-muted}'
    rounded: '{rounded.md}'
    padding: '6px 12px'
    typography: '{typography.label}'
  button-ghost-hover:
    backgroundColor: '{colors.maroon-subtle}'
    textColor: '{colors.maroon}'
  card:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.md}'
    padding: '{spacing.lg}'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.sm}'
    padding: '8px 12px'
  chip:
    backgroundColor: '{colors.maroon-subtle}'
    textColor: '{colors.maroon}'
    rounded: '{rounded.full}'
    padding: '2px 10px'
    typography: '{typography.label}'
  chip-selected:
    backgroundColor: '{colors.maroon}'
    textColor: '{colors.surface}'
---

# Design System: CRS Scheduler

## 1. Overview

**Creative North Star: "The Timetable"**

Grid-forward, data-dense but scannable. The schedule IS the interface — minimal chrome, maximum information. Like a train station departure board or an airline timetable: utilitarian beauty derived from clarity, not decoration. The tool gets out of the way so students can scan, compare, and decide in seconds.

This is a **product** surface through and through. Design serves the workflow: fetch courses, set constraints, generate schedules, compare results. Every pixel of ornamentation must earn its place by making schedules easier to parse. The personality is clean, fast, trustworthy — system-native in feel, predictable in behavior. No learning curve.

The system explicitly rejects SaaS marketing clichés: no gradient text, no glassmorphism, no hero sections, no side-stripe card borders, no eyebrow kickers above every section. It also rejects institutional clunk — no 2005-era university portal aesthetics, no government-table density, no beige. Apple Reminders/Calendar is the reference for platform-native familiarity: the tool should feel like it belongs, not like it was dropped in from a different universe.

**Key Characteristics:**

- Data-first hierarchy: schedule grids dominate; controls and chrome recede
- Restrained color: one accent (UPD maroon), used at ≤10% of any screen
- System-native type: Inter for UI, JetBrains Mono for precision data (CRNs, times, course codes)
- Flat at rest, subtle shadow on hover — depth as state response, not decoration
- Lightweight and breathable: generous padding, light borders, rounded corners. Cards feel like paper slips, not heavy containers.

## 2. Colors

The palette is cool-neutral with one committed accent: deep UPD maroon. The neutrals tilt faintly cool (away from warm-cream AI defaults) to contrast with the warm maroon. The accent is used sparingly — primary buttons, selected states, priority indicators — never as a background wash.

### Primary

- **Maroon** (`#7B1113`, canonical `oklch(36% 0.11 18)`): Primary buttons, selected chips, active nav states, priority badges. The only saturated color on the page. Its rarity is the point.
- **Maroon Subtle** (`#F1E5E5`, canonical `oklch(94% 0.015 18)`): Selected row backgrounds, ghost button hover, hover states on interactive rows. A near-white that carries the maroon hue just enough to feel connected.

### Neutral

- **Paper** (`#F5F6F7`, canonical `oklch(97% 0.002 240)`): Page background. Cool off-white — not cream, not sand, not warm-neutral. Chroma is nearly zero with a 240° cool tilt to contrast maroon's warmth.
- **Surface** (`#FFFFFF`): Cards, inputs, dropdowns, modals. Pure white provides maximum contrast for schedule data.
- **Ink** (`#1C1A1A`, canonical `oklch(18% 0.003 20)`): Body text, headings, primary labels. Near-black with a whisper of maroon warmth so it doesn't feel sterile.
- **Ink Muted** (`#5C5858`, canonical `oklch(45% 0.003 20)`): Secondary text, placeholders, captions, disabled states. Warm gray, not cool — tinted toward maroon, not away.
- **Border** (`#D9DBDD`, canonical `oklch(88% 0.002 240)`): Card borders, input strokes, dividers. Present but barely — enough to define edges, not enough to feel boxed-in.
- **Border Hover** (`#BFC1C3`, canonical `oklch(78% 0.002 240)`): Hovered borders on inputs and interactive cards. Slightly darker to signal interactivity.

### Named Rules

**The Ten Percent Rule.** The maroon accent occupies ≤10% of any visible surface. Never a full-width maroon banner, never a maroon background section. Its power comes from restraint — a single primary button, a selected chip, a priority dot. If maroon is the dominant color on screen, you've used too much.

**The No-Cream Rule.** The page background is cool off-white (`#F5F6F7`), not warm. No `bg-yellow-50`, `bg-warm-gray`, `bg-stone-50`, `bg-amber-50`, or any tint in the 40–100° hue range. Warmth comes from the maroon accent and imagery, not from the body background.

## 3. Typography

**Display/UI Font:** Inter (with system-ui, -apple-system fallback)
**Mono Font:** JetBrains Mono (with Fira Code, monospace fallback)

**Character:** Inter provides clean, neutral UI text optimized for screen reading at small sizes. Its tabular figures keep numbers aligned in schedule grids. JetBrains Mono brings precision to CRNs (5-digit codes), schedule times (`10-11:30AM`), and course codes — monospace where alignment and scanability matter. The pairing is pragmatic, not expressive: readable at a glance, invisible when it works.

### Hierarchy

- **Display** (Semibold 600, `1.25rem`/20px, 1.3): Course names in the sidebar, schedule section headers. Large enough to scan, small enough to fit in narrow columns.
- **Body** (Regular 400, `0.875rem`/14px, 1.5): Most UI text — section details, instructor names, schedule metadata. Max line length 65ch on prose; shorter in data-dense areas.
- **Label** (Semibold 600, `0.75rem`/12px, 0.02em letter-spacing, uppercase): Section headers in cards ("MEETINGS", "RESTRICTIONS"), column labels, priority badges, button text. Uppercase with tracked spacing for hierarchy without size.
- **Mono** (Medium 500, `0.8125rem`/13px, 1.4): CRNs, schedule times, course codes, slot counts. Used inline within body text and standalone in data displays. Tabular lining figures for grid alignment.

### Named Rules

**The Mono Precision Rule.** Any data that benefits from character-level alignment — CRNs, time ranges, course codes, numerical slot counts — must use JetBrains Mono. Never set CRNs in Inter. The mono voice is the signal of precision; mixing it with proportional text creates visual noise.

**The No-Kicker Rule.** Section headers use the Label style (uppercase, tracked, semibold) but never as a tiny eyebrow (`text-[10px] tracking-[0.15em]`) floating above body text. Labels are structural, not decorative. One per section, never stacked.

## 4. Elevation

Subtle shadows only, and only as a response to interaction. The system is flat at rest — cards, inputs, and surfaces are separated by color (Paper vs Surface) and light borders, not by shadows. On hover or focus, a `shadow-sm` (0 1px 2px rgba(0,0,0,0.06)) lifts the element just enough to signal interactivity without heaviness.

### Shadow Vocabulary

- **Rest** (`box-shadow: none`): Default state. No shadow on any surface.
- **Hover** (`box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)`): Cards, buttons, interactive rows on hover. Light, diffuse — a suggestion of depth, not a dramatic lift.
- **Focus** (`box-shadow: 0 0 0 2px #7B1113`): Focus ring on inputs and buttons. Maroon ring, 2px, offset 0. Never the browser default blue.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, focus, active). If a static card has a shadow, something is wrong — it should be a border or a background shift instead.

## 5. Components

### Buttons

- **Shape:** Rounded-lg (`12px`), height 36px (primary) or 32px (ghost).
- **Primary:** Maroon background (`#7B1113`), white text, semibold uppercase label (`0.75rem`, tracked). Padding 8px 20px. Hover darkens to `#680E11` with a subtle lift shadow. Focus ring: 2px maroon.
- **Ghost:** Transparent background, ink-muted text. Hover gets maroon-subtle background and maroon text. Used for secondary actions (Include, Exclude, Remove) and toolbar icons.
- **Disabled:** 50% opacity. No hover effects.

### Cards

- **Shape:** Rounded-md (`8px`), white surface, 1px border (`#D9DBDD`).
- **Padding:** 16px internal. Title in Display style, metadata in Body, section labels in Label style.
- **Hover:** Border shifts to `#BFC1C3`, subtle shadow lifts the card. Cursor becomes pointer if the card is interactive.
- **Selected:** Maroon left accent (3px border-left on the card — exception to the side-stripe ban, because this communicates state, not decoration). Maroon-subtle background tint.

### Inputs

- **Shape:** Rounded-sm (`6px`), white surface, 1px border (`#D9DBDD`), height 36px, padding 8px 12px.
- **Text:** Body style (14px, regular), ink color. Placeholder: ink-muted.
- **Focus:** Border shifts to maroon (`#7B1113`), 2px maroon focus ring. Smooth transition (150ms ease-out).
- **Error:** Border shifts to red (`#DC2626`). Error text below in 12px label style.

### Chips

- **Shape:** Rounded-full (`9999px`), padding 2px 10px, height 24px. Label typography (12px, semibold, uppercase tracked).
- **Default:** Maroon-subtle background, maroon text. Used for priority badges, instructor tags.
- **Selected:** Maroon background, white text. Used for active filter chips, selected day-off toggles.
- **Removable:** Include an × icon (12px) with 4px gap. Hover: icon area gets slightly darker tint.

### Navigation

The layout is a 3-column grid (`1fr 1fr 2fr` on desktop): left sidebar (courses + excluded sections), middle column (fetch form + preferences), right column (schedule results). No traditional nav bar — the grid IS the navigation.

- **Column headers:** Label style (uppercase, tracked), ink-muted, with a 1px bottom border.
- **Sidebar rows:** Body style, hover gets maroon-subtle background. Active row gets a 3px maroon left accent (functional, not decorative).
- **Collapsible sections:** Toggle chevron (12px), rotates 90° on expand. 150ms ease-out transition.

### Schedule Grid (Signature Component)

The `TimelineGrid` is the visual centerpiece — a Mon–Sat, 7AM–9PM calendar grid showing meeting blocks as colored spans.

- **Grid lines:** 1px border (`#D9DBDD`), light enough to see but not compete with meeting blocks.
- **Time labels:** Mono style (JetBrains Mono, 11px, ink-muted), left-aligned in a 48px gutter.
- **Meeting blocks:** Rounded-sm (`6px`), mono typography for time, body typography for location/instructor. Color-coded by course (auto-assigned from a fixed palette of 8 muted hues — never maroon, which is reserved for UI chrome).
- **Hover:** Block brightens slightly, shows full details in a tooltip.

## 6. Do's and Don'ts

### Do:

- **Do** use maroon only for UI chrome — buttons, selected states, focus rings, priority indicators. Never for data content.
- **Do** use JetBrains Mono for CRNs, course codes, schedule times, and slot counts. Character-aligned data demands monospace.
- **Do** keep cards flat at rest. Shadow only on hover. Static shadows are heavy.
- **Do** use the 3-column grid for all primary content. The layout IS the navigation — don't add a nav bar.
- **Do** use tonal layering (Paper → Surface) to separate content areas. The background shift does the work borders used to do.
- **Do** keep body text at 14px minimum. Schedule data is dense; small text punishes scanning.
- **Do** use the Label style (uppercase, tracked, semibold, 12px) for structural section headers. One per section, never stacked.

### Don't:

- **Don't** use SaaS marketing clichés — no gradient text, no glassmorphism, no hero sections, no eyebrow kickers above every section, no numbered section markers. From PRODUCT.md: "No SaaS marketing templates."
- **Don't** use side-stripe borders (`border-left` > 1px) as decoration. The one exception: a 3px maroon left accent on selected cards and active sidebar rows, because it communicates state, not decoration.
- **Don't** use warm-tinted backgrounds (`bg-yellow-50`, `bg-stone-50`, `bg-amber-50`, or any hue in the 40–100° range). The page background is cool off-white. Warmth comes from the maroon accent.
- **Don't** use maroon as a background wash or full-width banner. The Ten Percent Rule: maroon occupies ≤10% of any visible surface.
- **Don't** use dark backgrounds or dark mode. This is a scheduling tool used in classrooms, libraries, and outdoor benches — light mode only, high contrast for ambient-light readability.
- **Don't** set body text below 14px. Schedule data is inherently dense; shrinking text below 14px punishes scanning and violates the "fast to scan" principle.
- **Don't** animate layout properties (width, height, top, left). Use `transform` and `opacity` for transitions. Reduced motion: crossfade or instant.
- **Don't** gate content behind reveal animations. All content must be visible in the default state. Animations enhance, not deliver.
