/* sweetSpot.ts — find overlapping working-hour windows across people */

import type { Person } from "./data";
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

export function computeFitGrid(
  people: Person[],
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
  }>;
  for (let s = 0; s < steps; s++) {
    const hourFloat = s * stepHours;
    const slotDate = new Date(anchorDate.getTime() + hourFloat * 3600000);
    let inCount = 0;
    people.forEach((p) => {
      const local = partsInZone(slotDate, p.tz);
      const lh = local.hour + local.minute / 60;
      if (lh >= p.workStart && lh < p.workEnd) inCount++;
    });
    grid.push({
      hourFloat,
      date: slotDate,
      inCount,
      fitFraction: people.length ? inCount / people.length : 0,
    });
  }
  return grid;
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
  people: Person[],
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
    people.forEach((p) => {
      const local = partsInZone(d, p.tz);
      const lh = local.hour + local.minute / 60;
      if (lh >= p.workStart && lh < p.workEnd) countIn++;
    });
    totalIn += countIn;
  }
  const totalSlots = steps * people.length;
  return totalSlots ? totalIn / totalSlots : 0;
}
