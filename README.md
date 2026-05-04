# Time Zones

A meeting planner that finds the best overlap across multiple time zones.

Built with **Svelte 5**, **TypeScript**, and **Vite**.

[https://jasonyangcis.github.io/timezones](https://jasonyangcis.github.io/timezones)

## Features

- Add/remove time zones with custom working hours and colors
- Stacked timeline visualization with a draggable meeting strip
- Auto-detected "sweet spot" windows where everyone overlaps
- Falls back to extended (early/evening) windows when no full overlap exists
- 12/24-hour format, light/dark theme, adjustable meeting duration
- Shareable URLs — zone config is encoded in query params

## Scripts

```bash
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview build
npm run check    # type-check
```

## Project Structure

- `src/App.svelte` — main app shell and state
- `src/lib/sweetSpot.ts` — overlap/window computation
- `src/lib/data.ts` — seed zones and types
- `src/lib/` — UI components (timeline, zone cards, meeting strip, etc.)
