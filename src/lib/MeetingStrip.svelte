<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Person } from "./data";
  import { partsInZone, offsetMinutes, formatHour, formatDateLong, formatDateShort } from "./tz";
  import { fitForRange, durationLabel } from "./sweetSpot";
  import Avatar from "./Avatar.svelte";
  import Chevron from "./icons/Chevron.svelte";

  export let people: Person[] = [];
  export let anchorDate: Date;
  export let selectedStartUTC = 0;
  export let durationH = 1;
  export let h24 = false;

  const dispatch = createEventDispatcher<{ shiftDate: number }>();

  let detailsOpen = false;

  $: anchor = people[0];
  $: selectionFit = fitForRange(people, anchorDate, selectedStartUTC, durationH);
  $: fitText =
    selectionFit >= 0.999
      ? "Everyone is in working hours"
      : selectionFit >= 0.5
        ? `${Math.round(selectionFit * 100)}% in working hours`
        : `Only ${Math.round(selectionFit * 100)}% in working hours`;
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

  $: stepperLabel = anchor
    ? formatDateLong(new Date(anchorDate.getTime() + selectedStartUTC * 3600000), anchor.tz)
    : "—";

  $: perPerson = anchor
    ? people.map((p) => {
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
          person: p,
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
      <span class={fitClass} title={fitText}></span>
      <span class="meeting-strip-time" data-tnum>{summary.time}</span>
      <span class="meeting-strip-sep">·</span>
      <span class="meeting-strip-day">{summary.day}</span>
      <span class="meeting-strip-sep">·</span>
      <span class="meeting-strip-anchor">{anchor ? anchor.city : ""}</span>
      <span class="meeting-strip-pill">{durationLabel(durationH)}</span>
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
      <button
        class="btn btn-ghost btn-sm"
        on:click={() => (detailsOpen = !detailsOpen)}
        aria-expanded={detailsOpen}
      >
        <Chevron dir={detailsOpen ? "up" : "down"} />
        {detailsOpen ? "Hide details" : "Per-person"}
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
        {#each perPerson as pp (pp.person.id)}
          <div
            class="meeting-detail-row"
            class:in-work={pp.startInWork}
            class:off-hours={!pp.startInWork}
          >
            <Avatar person={pp.person} size={24} />
            <div class="meeting-detail-name">{pp.person.city}</div>
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
