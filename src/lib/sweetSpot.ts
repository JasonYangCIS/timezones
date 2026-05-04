/* sweetSpot.ts — find overlapping working-hour windows across time zones */

import type { Zone } from "./data";
import { partsInZone } from "./tz";

export type SweetWindow = {
  startUTC: number;
  endUTC: number;
  durationHours: number;
  fitLabel: string;
};

export function durationLabel(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return m + "m";
  if (m === 0) return h + "h";
  return h + "h " + m + "m";
}

// True if `h` falls inside the (possibly wrapping) local range [workStart-2, workEnd+4):
// the union of "early", "work", and "evening" bands — i.e. acceptable meeting hours.
function inExtendedRange(h: number, workStart: number, workEnd: number): boolean {
  const a = (workStart - 2 + 24) % 24;
  const b = (workEnd + 4) % 24;
  if (a === b) return false;
  if (a < b) return h >= a && h < b;
  return h >= a || h < b;
}

export function computeFitGrid(
  zones: Zone[],
  anchorDate: Date,
  stepHours = 0.5,
  hours = 24
) {
  const steps = Math.round(hours / stepHours);
  const grid = [] as Array<{
    hourFloat: number;
    date: Date;
    inCount: number;
    fitFraction: number;
    extendedCount: number;
    extendedFraction: number;
  }>;
  for (let s = 0; s < steps; s++) {
    const hourFloat = s * stepHours;
    const slotDate = new Date(anchorDate.getTime() + hourFloat * 3600000);
    let inCount = 0;
    let extendedCount = 0;
    zones.forEach((p) => {
      const local = partsInZone(slotDate, p.tz);
      const lh = local.hour + local.minute / 60;
      if (lh >= p.workStart && lh < p.workEnd) inCount++;
      if (inExtendedRange(lh, p.workStart, p.workEnd)) extendedCount++;
    });
    grid.push({
      hourFloat,
      date: slotDate,
      inCount,
      fitFraction: zones.length ? inCount / zones.length : 0,
      extendedCount,
      extendedFraction: zones.length ? extendedCount / zones.length : 0,
    });
  }
  return grid;
}

// Find windows where ALL zones are within their extended (early/work/evening) hours,
// even if not all are in their strict working hours. Useful when there's no clean
// overlap of working hours — a 9pm/9am bridge meeting, for example.
export function findExtendedWindows(
  grid: ReturnType<typeof computeFitGrid>,
  minLengthHours = 0.5
): SweetWindow[] {
  const windows: { startHour: number; endHour: number }[] = [];
  let cur: { startHour: number; endHour: number } | null = null;
  for (const g of grid) {
    if (g.extendedFraction === 1) {
      if (!cur) cur = { startHour: g.hourFloat, endHour: g.hourFloat };
      cur.endHour = g.hourFloat;
    } else if (cur) {
      windows.push({ startHour: cur.startHour, endHour: g.hourFloat });
      cur = null;
    }
  }
  if (cur) windows.push({ startHour: cur.startHour, endHour: cur.endHour + 0.5 });
  return windows
    .filter((w) => w.endHour - w.startHour >= minLengthHours)
    .map((w) => {
      const dur = w.endHour - w.startHour;
      return {
        startUTC: w.startHour,
        endUTC: w.endHour,
        durationHours: dur,
        fitLabel: durationLabel(dur) + " · stretch",
      };
    })
    .sort((a, b) => b.durationHours - a.durationHours);
}

export function findSweetWindows(
  grid: ReturnType<typeof computeFitGrid>,
  minLengthHours = 0.5
): SweetWindow[] {
  const windows: { startHour: number; endHour: number }[] = [];
  let cur: { startHour: number; endHour: number } | null = null;
  for (const g of grid) {
    if (g.fitFraction === 1) {
      if (!cur) cur = { startHour: g.hourFloat, endHour: g.hourFloat };
      cur.endHour = g.hourFloat;
    } else if (cur) {
      windows.push({ startHour: cur.startHour, endHour: g.hourFloat });
      cur = null;
    }
  }
  if (cur) windows.push({ startHour: cur.startHour, endHour: cur.endHour + 0.5 });
  return windows
    .filter((w) => w.endHour - w.startHour >= minLengthHours)
    .map((w) => {
      const dur = w.endHour - w.startHour;
      return {
        startUTC: w.startHour,
        endUTC: w.endHour,
        durationHours: dur,
        fitLabel: durationLabel(dur),
      };
    })
    .sort((a, b) => b.durationHours - a.durationHours);
}

export function findBestPartial(
  grid: ReturnType<typeof computeFitGrid>
): SweetWindow[] {
  let maxFit = 0;
  grid.forEach((g) => {
    if (g.fitFraction > maxFit) maxFit = g.fitFraction;
  });
  if (maxFit === 0) return [];
  const windows: { startHour: number; endHour: number }[] = [];
  let cur: { startHour: number; endHour: number } | null = null;
  for (const g of grid) {
    if (g.fitFraction === maxFit) {
      if (!cur) cur = { startHour: g.hourFloat, endHour: g.hourFloat };
      cur.endHour = g.hourFloat;
    } else if (cur) {
      windows.push({ startHour: cur.startHour, endHour: g.hourFloat });
      cur = null;
    }
  }
  if (cur) windows.push({ startHour: cur.startHour, endHour: cur.endHour + 0.5 });
  return windows.map((w) => ({
    startUTC: w.startHour,
    endUTC: w.endHour,
    durationHours: w.endHour - w.startHour,
    fitLabel: Math.round(maxFit * 100) + "% fit",
  }));
}

export function fitForRange(
  zones: Zone[],
  anchorDate: Date,
  startHourUTC: number,
  durationHours = 1
): number {
  let totalIn = 0;
  const steps = Math.max(1, Math.round(durationHours * 2));
  for (let s = 0; s < steps; s++) {
    const hf = startHourUTC + s * 0.5;
    const d = new Date(anchorDate.getTime() + hf * 3600000);
    let countIn = 0;
    zones.forEach((p) => {
      const local = partsInZone(d, p.tz);
      const lh = local.hour + local.minute / 60;
      if (lh >= p.workStart && lh < p.workEnd) countIn++;
    });
    totalIn += countIn;
  }
  const totalSlots = steps * zones.length;
  return totalSlots ? totalIn / totalSlots : 0;
}
