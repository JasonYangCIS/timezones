/* data.ts — seed people, common timezone presets */

export type TzPreset = { city: string; region: string; tz: string };

export type Person = {
  id: string;
  name: string;
  city: string;
  tz: string;
  color: string;
  workStart: number;
  workEnd: number;
};

export const TZ_PRESETS: TzPreset[] = [
  { city: "San Francisco", region: "USA", tz: "America/Los_Angeles" },
  { city: "Seattle", region: "USA", tz: "America/Los_Angeles" },
  { city: "Denver", region: "USA", tz: "America/Denver" },
  { city: "Chicago", region: "USA", tz: "America/Chicago" },
  { city: "Austin", region: "USA", tz: "America/Chicago" },
  { city: "New York", region: "USA", tz: "America/New_York" },
  { city: "Toronto", region: "Canada", tz: "America/Toronto" },
  { city: "Mexico City", region: "Mexico", tz: "America/Mexico_City" },
  { city: "São Paulo", region: "Brazil", tz: "America/Sao_Paulo" },
  { city: "Buenos Aires", region: "Argentina", tz: "America/Argentina/Buenos_Aires" },
  { city: "London", region: "UK", tz: "Europe/London" },
  { city: "Dublin", region: "Ireland", tz: "Europe/Dublin" },
  { city: "Lisbon", region: "Portugal", tz: "Europe/Lisbon" },
  { city: "Paris", region: "France", tz: "Europe/Paris" },
  { city: "Berlin", region: "Germany", tz: "Europe/Berlin" },
  { city: "Amsterdam", region: "Netherlands", tz: "Europe/Amsterdam" },
  { city: "Madrid", region: "Spain", tz: "Europe/Madrid" },
  { city: "Stockholm", region: "Sweden", tz: "Europe/Stockholm" },
  { city: "Athens", region: "Greece", tz: "Europe/Athens" },
  { city: "Istanbul", region: "Turkey", tz: "Europe/Istanbul" },
  { city: "Cairo", region: "Egypt", tz: "Africa/Cairo" },
  { city: "Lagos", region: "Nigeria", tz: "Africa/Lagos" },
  { city: "Nairobi", region: "Kenya", tz: "Africa/Nairobi" },
  { city: "Johannesburg", region: "South Africa", tz: "Africa/Johannesburg" },
  { city: "Dubai", region: "UAE", tz: "Asia/Dubai" },
  { city: "Tel Aviv", region: "Israel", tz: "Asia/Jerusalem" },
  { city: "Mumbai", region: "India", tz: "Asia/Kolkata" },
  { city: "Bangalore", region: "India", tz: "Asia/Kolkata" },
  { city: "Delhi", region: "India", tz: "Asia/Kolkata" },
  { city: "Bangkok", region: "Thailand", tz: "Asia/Bangkok" },
  { city: "Singapore", region: "Singapore", tz: "Asia/Singapore" },
  { city: "Jakarta", region: "Indonesia", tz: "Asia/Jakarta" },
  { city: "Hong Kong", region: "Hong Kong", tz: "Asia/Hong_Kong" },
  { city: "Shanghai", region: "China", tz: "Asia/Shanghai" },
  { city: "Beijing", region: "China", tz: "Asia/Shanghai" },
  { city: "Seoul", region: "Korea", tz: "Asia/Seoul" },
  { city: "Tokyo", region: "Japan", tz: "Asia/Tokyo" },
  { city: "Sydney", region: "Australia", tz: "Australia/Sydney" },
  { city: "Melbourne", region: "Australia", tz: "Australia/Melbourne" },
  { city: "Perth", region: "Australia", tz: "Australia/Perth" },
  { city: "Auckland", region: "New Zealand", tz: "Pacific/Auckland" },
  { city: "Honolulu", region: "USA", tz: "Pacific/Honolulu" },
];

/**
 * Common timezone abbreviations mapped to IANA timezone identifiers.
 * Used to make search match queries like "PDT", "EST", "JST", etc.
 */
export const TZ_ABBREVIATIONS: Record<string, string[]> = {
  // North America
  pst: ["America/Los_Angeles"],
  pdt: ["America/Los_Angeles"],
  pt: ["America/Los_Angeles"],
  mst: ["America/Denver", "America/Phoenix"],
  mdt: ["America/Denver"],
  mt: ["America/Denver"],
  cst: ["America/Chicago", "Asia/Shanghai"],
  cdt: ["America/Chicago"],
  ct: ["America/Chicago"],
  est: ["America/New_York"],
  edt: ["America/New_York"],
  et: ["America/New_York"],
  akst: ["America/Anchorage"],
  akdt: ["America/Anchorage"],
  hst: ["Pacific/Honolulu"],
  // Europe / Africa
  gmt: ["Europe/London"],
  bst: ["Europe/London"],
  utc: ["Europe/London"],
  wet: ["Europe/Lisbon"],
  west: ["Europe/Lisbon"],
  cet: ["Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Amsterdam"],
  cest: ["Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Amsterdam"],
  eet: ["Europe/Athens", "Europe/Istanbul", "Africa/Cairo"],
  eest: ["Europe/Athens"],
  // Middle East / Asia
  gst: ["Asia/Dubai"],
  ist: ["Asia/Kolkata", "Asia/Jerusalem"],
  ict: ["Asia/Bangkok"],
  sgt: ["Asia/Singapore"],
  hkt: ["Asia/Hong_Kong"],
  jst: ["Asia/Tokyo"],
  kst: ["Asia/Seoul"],
  // Oceania
  aest: ["Australia/Sydney", "Australia/Melbourne"],
  aedt: ["Australia/Sydney", "Australia/Melbourne"],
  awst: ["Australia/Perth"],
  nzst: ["Pacific/Auckland"],
  nzdt: ["Pacific/Auckland"],
  // South America
  brt: ["America/Sao_Paulo"],
  art: ["America/Argentina/Buenos_Aires"],
};

export const AVATAR_PALETTE = [
  "#4f6d44",
  "#3f5a7c",
  "#825a2e",
  "#6b4a7a",
  "#365e5e",
  "#7a4848",
];

export function makePerson(opts: {
  name: string;
  city: string;
  tz: string;
  color: string;
  workStart?: number;
  workEnd?: number;
}): Person {
  return {
    id: Math.random().toString(36).slice(2, 9),
    name: opts.name,
    city: opts.city,
    tz: opts.tz,
    color: opts.color,
    workStart: opts.workStart ?? 9,
    workEnd: opts.workEnd ?? 17,
  };
}

export const SEED_PEOPLE: Person[] = [
  makePerson({ name: "Maya Chen", city: "San Francisco", tz: "America/Los_Angeles", color: AVATAR_PALETTE[0] }),
  makePerson({ name: "James Okafor", city: "New York", tz: "America/New_York", color: AVATAR_PALETTE[1] }),
  makePerson({ name: "Hannah Brooke", city: "London", tz: "Europe/London", color: AVATAR_PALETTE[2] }),
  makePerson({ name: "Ren Tanaka", city: "Tokyo", tz: "Asia/Tokyo", color: AVATAR_PALETTE[3] }),
];
