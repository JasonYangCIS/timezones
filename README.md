# Time Zones

A meeting planner that tells you what a meeting feels like for everyone in it.

Built with **Svelte 5**, **TypeScript**, and **Vite**.

[https://jasonyangcis.github.io/timezones](https://jasonyangcis.github.io/timezones)

## Features

### Headline summary

- Per-zone time chips at the top of the canvas — one per timezone, color-coded
  by band (work / early / evening / sleep / deep night) so the slot's quality
  is visible at a glance.
- Fixed-width `HH:MM` (or `HH:MMam` in 12-hour mode) so the header doesn't
  reflow as you drag the selection.
- Fit summary explains the slot in plain English ("3 of 4 in working hours ·
  Tokyo asleep") and defines the fit % on hover.
- Date is annotated with the anchor zone ("Tue, May 5 in San Francisco").

### Timeline grid

- Stacked rows, one per timezone, 24 cells across the day.
- Five band colors form a continuous day-cycle gradient:
  - **deep night** (0–6am, dark plum)
  - **sleep** (dusk purple)
  - **early** (2h before work, pale wheat)
  - **work** (daylight yellow)
  - **evening** (4h after work, dusk mauve)
- Half/quarter-hour offset zones (Mumbai +5:30, Kathmandu +5:45,
  Newfoundland −3:30) fold the minute into the cell label (e.g. `5:30am`).
- Weekend cells get a subtle diagonal hatch.
- Day strip shows ±3 days; cells with **DST** transitions get a marker badge.
- Per-zone offset chips (`+3`, `−5`) include a tooltip explaining "X hours
  ahead of the anchor".

### Selection scrubber

- Coral pinned-card design with rails, top + bottom flag tabs, and a soft
  drop shadow — distinct from every band color.
- Drag the body to slide; grab the left/right edges to resize. Snaps to
  30-min increments.
- Click any cell to jump the selection there.
- A full-height NOW line spans every row.

### Sidebar

- Add zones from a curated list, all country capitals, IANA tz IDs, or
  abbreviations like `PST` / `JST` / `IST`.
- Each zone card has an inline editor for that person's working hours.
- Best-windows pills snap the selection to the longest overlap, with a
  fallback "stretch" window when no clean overlap exists.
- Legend documents the band palette.

### Export

- **`.ics`** download for Apple Calendar / Outlook / etc.
- **Google Calendar** deep link that opens a pre-filled event in a new tab.

### Shareable URLs

- Zone config is encoded in `?tz=...` query params (one per zone,
  `name~city~iana~color~workStart~workEnd`).
- Single-pass URL encoding — no more `%2520` artifacts.

### Theme

- Cohesive "twilight" palette: warm parchment surfaces, dusk-plum accent,
  golden fit indicator. Mirrored in a deep-aubergine dark theme.

## Scripts

```bash
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview build
npm run check    # type-check
```

## Project Structure

- `src/App.svelte` — app shell, URL encoding, state
- `src/lib/MeetingStrip.svelte` — top summary + .ics / Google Calendar export
- `src/lib/StackedTimeline.svelte` — main grid, day strip, selection, NOW
- `src/lib/ZoneCard.svelte` — per-zone sidebar card with working-hours editor
- `src/lib/AddZone.svelte` — typeahead with capitals + abbreviations
- `src/lib/SweetSpotList.svelte` — best-window pills
- `src/lib/sweetSpot.ts` — overlap / extended-window / partial-fit search
- `src/lib/tz.ts` — pure timezone math helpers (parts, offsets, formatting)
- `src/lib/data.ts` — seed zones, presets, abbreviation map
- `src/app.css` — design tokens + component styles
