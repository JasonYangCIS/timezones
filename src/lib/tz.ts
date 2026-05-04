/* tz.ts — pure helpers for time zone math */

export type Parts = {
  year: number;
  month: number;
  day: number;
  weekday: string;
  hour: number;
  minute: number;
};

export function partsInZone(date: Date, tz: string): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });
  const parts = fmt.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  let h = parseInt(parts.hour, 10);
  if (h === 24) h = 0;
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    weekday: parts.weekday,
    hour: h,
    minute: parseInt(parts.minute, 10),
  };
}

export function offsetMinutes(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  let h = parseInt(parts.hour, 10);
  if (h === 24) h = 0;
  const asUTC = Date.UTC(
    parseInt(parts.year, 10),
    parseInt(parts.month, 10) - 1,
    parseInt(parts.day, 10),
    h,
    parseInt(parts.minute, 10),
    parseInt(parts.second, 10)
  );
  return Math.round((asUTC - date.getTime()) / 60000);
}

export function formatHour(decimalHour: number, h24: boolean): string {
  const h = ((Math.floor(decimalHour) % 24) + 24) % 24;
  const m = Math.round((decimalHour - Math.floor(decimalHour)) * 60);
  if (h24) {
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }
  const ampm = h < 12 ? "am" : "pm";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return h12 + (m === 0 ? "" : ":" + String(m).padStart(2, "0")) + ampm;
}

export function formatDateLong(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateShort(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
  }).format(date);
}

export function offsetLabel(mins: number): string {
  const sign = mins >= 0 ? "+" : "−";
  const a = Math.abs(mins);
  const h = Math.floor(a / 60);
  const m = a % 60;
  return "GMT" + sign + String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}
