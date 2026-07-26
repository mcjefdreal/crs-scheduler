# Product

## Register

product

## Users

UPD students (BS CS, COE, Engg) planning semester schedules. Time-pressed, often on mobile between classes, making rapid enrollment decisions. They need to evaluate dozens of schedule combinations quickly, compare overlap, and prioritize high-demand sections. The official CRS portal shows sections one-by-one with zero visualization — this tool bridges that gap.

## Product Purpose

Fetch UPD CRS class schedules via server proxy, generate all non-overlapping schedule combinations, and rank them by `slotsLeft / demand` ratio. Students add courses, set priorities, apply constraints (earliest start, days off, excluded instructors, locked CRNs), and get a scored, filterable list of viable schedules — all in the browser, persisted locally.

## Brand Personality

Clean, fast, trustworthy. System-native familiarity — the tool should feel like it belongs on the platform (Apple Reminders / Calendar). Predictable patterns, no learning curve, gets out of the way so the schedule data takes center stage. Voice is direct and utilitarian; no marketing fluff, no personality injection.

## Anti-references

- **No SaaS marketing templates**: no gradient text, glassmorphism, hero sections, side-stripe card borders, tiny uppercase tracked eyebrows, or numbered section markers.
- **No academia-clunky**: no 2005-era university portals, government-table aesthetics, institutional beige, or dense unreadable data grids.
- **No over-designed**: no excessive animations, dark patterns, or flash that distracts from the scheduling task.

## Design Principles

1. **System-native feel** — Predictable patterns, no surprises. The tool should feel like a built-in utility, not a website. Leverage platform conventions.
2. **Data-first** — The schedule IS the interface. Chrome, decoration, and branding recede so the data stands out. Every pixel of ornamentation must earn its place by making schedules easier to parse.
3. **Fast to scan** — Students make quick decisions. Information hierarchy must support rapid visual comparison across schedules. Density where it matters (schedule grids), breathing room where it doesn't (controls, filters).
4. **Self-effacing** — The tool disappears. Low cognitive load. No feature discovery needed. Familiar patterns, clear labels, obvious affordances.
5. **Trustworthy** — Accurate, clear, nothing hidden. Students are making enrollment decisions — ambiguity is unacceptable. Show status clearly, handle errors gracefully, never misrepresent data.

## Accessibility & Inclusion

Follow accessibility best practices (sufficient contrast, keyboard navigation, reduced-motion support, screen-reader-friendly markup). No formal WCAG compliance target yet — add if user need arises.
