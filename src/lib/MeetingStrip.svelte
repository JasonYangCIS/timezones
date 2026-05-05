<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Zone } from "./data";
  import { partsInZone, offsetMinutes, formatHour, formatDateLong, formatDateShort } from "./tz";
  import { fitForRange, durationLabel } from "./sweetSpot";
  import Avatar from "./Avatar.svelte";
  import Chevron from "./icons/Chevron.svelte";

  export let zones: Zone[] = [];
  export let anchorDate: Date;
  export let selectedStartUTC = 0;
  export let durationH = 1;
  export let h24 = false;

  const dispatch = createEventDispatcher<{ shiftDate: number }>();

  let detailsOpen = false;

  $: anchor = zones[0];
  $: selectionFit = fitForRange(zones, anchorDate, selectedStartUTC, durationH);

  // Build a per-zone "is asleep / in working hours / late" label for the summary.
  function bandFor(localHour: number, workStart: number, workEnd: number) {
    const earlyStart = (workStart - 2 + 24) % 24;
    const eveningEnd = (workEnd + 4) % 24;
    const inRange = (h: number, a: number, b: number) =>
      a === b ? false : a < b ? h >= a && h < b : h >= a || h < b;
    if (inRange(localHour, workStart, workEnd)) return "work";
    if (inRange(localHour, earlyStart, workStart)) return "early";
    if (inRange(localHour, workEnd, eveningEnd)) return "evening";
    if (localHour >= 0 && localHour < 6) return "deep-night";
    return "sleep";
  }

  // Per-zone start info for the headline chips.
  $: headlineChips = anchor
    ? zones.map((p) => {
        const start = new Date(anchorDate.getTime() + selectedStartUTC * 3600000);
        const sLocal = partsInZone(start, p.tz);
        const startHour = sLocal.hour + sLocal.minute / 60;
        const band = bandFor(startHour, p.workStart, p.workEnd);
        const inWork = band === "work";
        const initials = (p.city || "?")
          .split(/\s+/)
          .slice(0, 3)
          .map((s) => s[0])
          .join("")
          .toUpperCase();
        // Render the chip time in the user's preferred 12h/24h format, but
        // always zero-pad the hour AND always show minutes so every chip is
        // the same width — keeps the strip from reflowing when you drag the
        // selection.
        const mm = String(sLocal.minute).padStart(2, "0");
        let padded: string;
        if (h24) {
          padded = String(sLocal.hour).padStart(2, "0") + ":" + mm;
        } else {
          const ampm = sLocal.hour < 12 ? "am" : "pm";
          const h12 = sLocal.hour % 12 || 12;
          padded = String(h12).padStart(2, "0") + ":" + mm + ampm;
        }
        return {
          zone: p,
          timeStr: padded,
          // Keep the loose localized form for tooltips / accessibility.
          timeStrLocalized: formatHour(startHour, h24),
          short: initials,
          band,
          inWork,
        };
      })
    : [];

  $: inWorkCount = headlineChips.filter((c) => c.inWork).length;
  $: asleepZones = headlineChips.filter(
    (c) => c.band === "sleep" || c.band === "deep-night"
  );

  $: fitText = (() => {
    if (!headlineChips.length) return "";
    const total = headlineChips.length;
    const parts: string[] = [];
    parts.push(`${inWorkCount} of ${total} in working hours`);
    if (asleepZones.length) {
      const names = asleepZones.map((c) => c.zone.city).join(", ");
      parts.push(`${names} ${asleepZones.length === 1 ? "asleep" : "asleep"}`);
    }
    return parts.join(" · ");
  })();

  $: fitTooltip = `Fit % = share of meeting half-hours where everyone is inside their personal working-hours window. ${Math.round(
    selectionFit * 100
  )}% right now.`;

  $: fitClass =
    selectionFit >= 0.999 ? "fit-dot" : selectionFit >= 0.5 ? "fit-dot warn" : "fit-dot bad";

  $: summary = (() => {
    if (!anchor) return { time: "—", day: "" };
    const start = new Date(anchorDate.getTime() + selectedStartUTC * 3600000);
    const end = new Date(anchorDate.getTime() + (selectedStartUTC + durationH) * 3600000);
    const sLocal = partsInZone(start, anchor.tz);
    const eLocal = partsInZone(end, anchor.tz);
    return {
      time:
        formatHour(sLocal.hour + sLocal.minute / 60, h24) +
        " – " +
        formatHour(eLocal.hour + eLocal.minute / 60, h24),
      day: formatDateLong(start, anchor.tz),
    };
  })();

  // .ics download for the currently-selected meeting
  function pad(n: number) {
    return String(n).padStart(2, "0");
  }
  function toUtcStamp(d: Date) {
    return (
      d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      "T" +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      "00Z"
    );
  }
  function exportIcs() {
    if (!anchor) return;
    const start = new Date(anchorDate.getTime() + selectedStartUTC * 3600000);
    const end = new Date(start.getTime() + durationH * 3600000);
    const stamp = toUtcStamp(new Date());
    const summaryTxt = `Meeting · ${zones.map((z) => z.city).join(" / ")}`;
    const desc = headlineChips
      .map((c) => `${c.zone.city}: ${c.timeStr}${c.inWork ? "" : " (off-hours)"}`)
      .join("\\n");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Time Zones//EN",
      "BEGIN:VEVENT",
      "UID:" + stamp + "-" + Math.random().toString(36).slice(2, 8) + "@timezones",
      "DTSTAMP:" + stamp,
      "DTSTART:" + toUtcStamp(start),
      "DTEND:" + toUtcStamp(end),
      "SUMMARY:" + summaryTxt,
      "DESCRIPTION:" + desc,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meeting.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  $: stepperLabel = anchor
    ? formatDateLong(new Date(anchorDate.getTime() + selectedStartUTC * 3600000), anchor.tz)
    : "—";

  $: perZone = anchor
    ? zones.map((p) => {
        const start = new Date(anchorDate.getTime() + selectedStartUTC * 3600000);
        const end = new Date(start.getTime() + durationH * 3600000);
        const sLocal = partsInZone(start, p.tz);
        const eLocal = partsInZone(end, p.tz);
        const sStr = formatHour(sLocal.hour + sLocal.minute / 60, h24);
        const eStr = formatHour(eLocal.hour + eLocal.minute / 60, h24);
        const dayStr = formatDateShort(start, p.tz);
        const anchorStart = partsInZone(start, anchor.tz);
        const dayDelta =
          sLocal.day !== anchorStart.day
            ? Math.sign(
                start.getTime() +
                  offsetMinutes(start, p.tz) * 60000 -
                  (start.getTime() + offsetMinutes(start, anchor.tz) * 60000)
              )
            : 0;
        const inWork = (h: number) => {
          const a = p.workStart,
            b = p.workEnd;
          if (a < b) return h >= a && h < b;
          return h >= a || h < b;
        };
        const startHour = sLocal.hour + sLocal.minute / 60;
        return {
          zone: p,
          startStr: sStr,
          endStr: eStr,
          dayStr,
          dayDelta,
          startInWork: inWork(startHour),
        };
      })
    : [];
</script>

<div class="meeting-strip" class:is-open={detailsOpen}>
  <div class="meeting-strip-row">
    <div class="meeting-strip-main">
      <div class="meeting-strip-chips" data-tnum>
        {#each headlineChips as c, i (c.zone.id)}
          {#if i > 0}
            <span class="meeting-strip-chip-sep">·</span>
          {/if}
          <span
            class={"meeting-strip-chip band-" + c.band}
            class:is-anchor={i === 0}
            class:in-work={c.inWork}
            title={c.zone.city + " · " + c.timeStrLocalized}
          >
            <span class="meeting-strip-chip-time">{c.timeStr}</span>
            <span class="meeting-strip-chip-city">{c.short}</span>
          </span>
        {/each}
      </div>
      <div class="meeting-strip-meta">
        <span class="meeting-strip-day">{summary.day}</span>
        <span class="meeting-strip-sep">·</span>
        <span class="meeting-strip-pill">{durationLabel(durationH)}</span>
        <span class="meeting-strip-sep">·</span>
        <span class={fitClass} title={fitTooltip}></span>
        <span class="meeting-strip-fit" title={fitTooltip}>{fitText}</span>
      </div>
    </div>
    <div class="meeting-strip-actions">
      <div class="date-stepper">
        <button
          class="date-stepper-btn"
          on:click={() => dispatch("shiftDate", -1)}
          aria-label="Previous day"
        >
          <Chevron dir="left" />
        </button>
        <span class="date-stepper-text">{stepperLabel}</span>
        <button
          class="date-stepper-btn"
          on:click={() => dispatch("shiftDate", 1)}
          aria-label="Next day"
        >
          <Chevron dir="right" />
        </button>
      </div>
      <button class="btn btn-ghost btn-sm" on:click={exportIcs} title="Download .ics for this slot">
        Export
      </button>
      <button
        class="btn btn-ghost btn-sm"
        on:click={() => (detailsOpen = !detailsOpen)}
        aria-expanded={detailsOpen}
      >
        <Chevron dir={detailsOpen ? "up" : "down"} />
        {detailsOpen ? "Hide details" : "Time zones"}
      </button>
    </div>
  </div>
  {#if detailsOpen}
    <div class="meeting-strip-details">
      <div class="meeting-fit-line">
        <span class={fitClass}></span>
        <span>{fitText}</span>
      </div>
      <div class="meeting-detail-grid">
        {#each perZone as pp (pp.zone.id)}
          <div
            class="meeting-detail-row"
            class:in-work={pp.startInWork}
            class:off-hours={!pp.startInWork}
          >
            <Avatar zone={pp.zone} size={24} />
            <div class="meeting-detail-name">{pp.zone.city}</div>
            <div class="meeting-detail-time" data-tnum>
              {pp.startStr} – {pp.endStr}
              {#if pp.dayDelta !== 0}
                <span class="meeting-detail-daytag">
                  {pp.dayDelta > 0 ? "next day" : "prev day"}
                </span>
              {/if}
            </div>
            <div class={"meeting-detail-status " + (pp.startInWork ? "ok" : "warn")}>
              {pp.startInWork ? "in working hours" : "outside working hours"}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
