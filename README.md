# CRS Scheduler

Schedule generator for UPD CRS — fetches class schedules via server proxy, finds non-overlapping combinations, and ranks them by `slotsLeft / demand`.

## Setup

```sh
pnpm install
pnpm dev      # starts dev server at http://localhost:5173
pnpm build    # production build
pnpm check    # type-check + lint
```

## Usage

### Add courses

Two ways to add courses:

1. **URL fetch (single course)** — Enter a course name and paste the CRS schedule page URL, then click **Fetch**. The URL takes full priority: only sections from that page are imported.
2. **Batch fetch (no URL)** — Enter one or more course names separated by commas (e.g. `Eng 13, Math 21, CS 133`) and leave the URL field empty. The app fetches CRS schedule pages by your course prefixes and matches sections automatically.

> Providing a URL overrides batch mode — even with multiple names, only the URL's page content is used. Leave the URL empty for multi-course batch import.

Courses are saved to your browser's IndexedDB and persist across sessions.

### Set priorities

Use the **P1↑–P5↓** dropdown on each course to rank importance. Higher-priority courses are weighted more heavily in schedule scoring.

### Customize

- **Avoid classes before** — penalizes schedules with early classes
- **Days off** — exclude specific days from generated schedules
- **Excluded instructors** — filter out sections by instructor name
- **Min gap between classes** — minimum minutes between consecutive classes
- **Refresh All** — re-fetch all courses for updated section data
- **Lock CRN** — pin a specific section to force it into all results

### Manage exclusions

Auto-excluded sections (full, reserved, restricted) appear in the **Excluded** sidebar. Click **Include** to bring them back, or **Exclude** on any schedule result card to remove a section.

To see all sections including excluded ones in results, toggle **Show excluded**.

### Generate and compare

Click **Generate Schedules** to find all non-overlapping combinations (top 50 by score). Check boxes on result cards and click **Compare** to view two schedules side-by-side.

Use the schedule filter to find results by instructor or course code.
