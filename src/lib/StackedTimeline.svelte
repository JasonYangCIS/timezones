<script lang="ts" context="module">
  export type Band = "sleep" | "early" | "work" | "evening";

  export function bandFor(localHour: number, workStart: number, workEnd: number): Band {
    const earlyStart = (workStart - 2 + 24) % 24;
    const eveningEnd = (workEnd + 4) % 24;
    function inRange(h: number, a: number, b: number) {
      if (a === b) return false;
      if (a < b) return h >= a && h < b;
      return h >= a || h < b;
    }
    if (inRange(localHour, workStart, workEnd)) return "work";
    if (inRange(localHour, earlyStart, workStart)) return "early";
    if (inRange(localHour, workEnd, eveningEnd)) return "evening";
    return "sleep";
  }
</script>

<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import type { Person } from "./data";
  import {
    partsInZone,
    offsetMinutes,
    formatHour,
    formatDateLong,
    formatDateShort,
    offsetLabel,
  } from "./tz";
  import Avatar from "./Avatar.svelte";
  import BandGlyph from "./icons/BandGlyph.svelte";

  export let people: Person[] = [];
  export let anchorDate: Date;
  export let h24 = false;
  export let selectedStartUTC = 0;
  export let selectedDurationH = 1;

  const dispatch = createEventDispatcher<{
    seek: number;
    shiftDay: number;
  }>();

  const HOURS = 24;
  let hoverH: number | null = null;
  let now: Date = new Date();
  let nowTimer: ReturnType<typeof setInterval>;

  onMount(() => {
    nowTimer = setInterval(() => (now = new Date()), 60000);
  });
  onDestroy(() => clearInterval(nowTimer));

  $: anchor = people[0];
  $: anchorOffMin = anchor ? offsetMinutes(now, anchor.tz) : 0;
  $: hoursFromAnchor = anchorDate ? (now.getTime() - anchorDate.getTime()) / 3600000 : -1;
  $: showNow = hoursFromAnchor >= 0 && hoursFromAnchor <= HOURS;

  // Day strip — relative to anchor.tz around anchorDate
  $: dayStrip = (() => {
    if (!anchor) return [];
    const refDay = new Date(anchorDate.getTime() + 12 * 3600000);
    const arr = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(refDay.getTime() + i * 86400000);
      const local = partsInZone(d, anchor.tz);
      const isToday = i === 0;
      const isWeekend = local.weekday === "Sat" || local.weekday === "Sun";
      arr.push({ d, local, offset: i, isToday, isWeekend });
    }
    return arr;
  })();

  function pickHour(h: number) {
    const dur = Math.ceil(selectedDurationH);
    dispatch("seek", Math.max(0, Math.min(HOURS - dur, h)));
  }

  // Build per-row cell metadata
  function buildCells(p: Person) {
    const cells = [];
    let prevLocalDay: number | null = null;
    let prevBand: Band | null = null;
    for (let h = 0; h < HOURS; h++) {
      const d = new Date(anchorDate.getTime() + h * 3600000);
      const local = partsInZone(d, p.tz);
      const band = bandFor(local.hour, p.workStart, p.workEnd);
      const isDayChange = prevLocalDay !== null && local.day !== prevLocalDay;
      const isFirstCell = h === 0;
      const showDatePill = isDayChange || isFirstCell;
      const datePillText = formatDateShort(d, p.tz).toUpperCase();
      const bandChangeTo = h > 0 && band !== prevBand ? band : null;

      let main: string, sub: string;
      if (h24) {
        main = String(local.hour).padStart(2, "0");
        sub = String(local.minute).padStart(2, "0");
      } else {
        const h12 = local.hour % 12 || 12;
        main = String(h12);
        sub = local.hour < 12 ? "am" : "pm";
      }

      cells.push({ h, band, bandChangeTo, showDatePill, datePillText, main, sub });
      prevLocalDay = local.day;
      prevBand = band;
    }
    return cells;
  }

  function rowDelta(p: Person, isAnchor: boolean) {
    if (isAnchor) return "";
    const off = offsetMinutes(now, p.tz) - anchorOffMin;
    const sign = off > 0 ? "+" : off < 0 ? "−" : "";
    const ah = Math.abs(off) / 60;
    return sign + (ah % 1 === 0 ? ah : ah.toFixed(1));
  }

  // Selection drag
  let trackEl: HTMLDivElement | null = null;

  function startDragging(e: MouseEvent) {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const parent = target.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const startX = e.clientX;
    const startLeftPct = (selectedStartUTC / HOURS) * 100;

    function move(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      const dxPct = (dx / rect.width) * 100;
      let newPct = startLeftPct + dxPct;
      let newHour = (newPct / 100) * HOURS;
      newHour = Math.round(newHour);
      newHour = Math.max(0, Math.min(HOURS - selectedDurationH, newHour));
      dispatch("seek", newHour);
    }
    function up() {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  $: startInt = Math.floor(selectedStartUTC);
  $: endInt = Math.ceil(selectedStartUTC + selectedDurationH);
  $: selStartPct = (selectedStartUTC / HOURS) * 100;
  $: selWidthPct = (selectedDurationH / HOURS) * 100;
</script>

<div class="wtb-card">
  <div class="wtb-day-strip-row">
    <div class="wtb-info-spacer">Local time</div>
    <div class="day-strip">
      {#each dayStrip as { d, local, offset, isToday, isWeekend } (offset)}
        <button
          class="day-pill"
          class:is-today={isToday}
          class:is-weekend={isWeekend}
          on:click={() => dispatch("shiftDay", offset)}
          title={anchor ? formatDateLong(d, anchor.tz) : ""}
        >
          <span class="day-pill-dow">{local.weekday}</span>
          <span class="day-pill-num">{local.day}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="wtb-rows" style="position: relative">
    {#each people as p, i (p.id)}
      {@const isAnchor = i === 0}
      {@const cells = buildCells(p)}
      {@const nowLocal = partsInZone(now, p.tz)}
      {@const nowStr = formatHour(nowLocal.hour + nowLocal.minute / 60, h24)}
      {@const offMin = offsetMinutes(now, p.tz)}
      {@const deltaStr = rowDelta(p, isAnchor)}
      <div class="wtb-row" class:is-anchor={isAnchor}>
        <div class="wtb-row-info">
          <Avatar person={p} size={28} />
          <div class="wtb-row-info-meta">
            <div class="wtb-row-name">
              {#if !isAnchor && deltaStr}
                <span class="wtb-row-delta">{deltaStr}</span>
              {/if}
              <span class="wtb-row-city">{p.city}</span>
            </div>
            <div class="wtb-row-sub">
              <span class="wtb-row-now mono">{nowStr}</span>
              <span class="wtb-row-sep">·</span>
              <span class="wtb-row-gmt">{offsetLabel(offMin)}</span>
            </div>
          </div>
        </div>
        <div class="wtb-row-cells">
          {#each cells as c (c.h)}
            <button
              type="button"
              class={"wtb-cell band-" + c.band}
              class:is-selected-start={c.h === startInt}
              class:is-in-selection={c.h >= startInt && c.h < endInt}
              class:has-date-pill={c.showDatePill}
              class:has-band-glyph={!!c.bandChangeTo}
              on:click={() => pickHour(c.h)}
              on:mouseenter={() => (hoverH = c.h)}
              on:mouseleave={() => (hoverH = null)}
            >
              {#if c.showDatePill}
                <span class="wtb-cell-datepill" aria-hidden="true">{c.datePillText}</span>
              {/if}
              {#if c.bandChangeTo}
                <span class={"wtb-cell-glyph glyph-" + c.bandChangeTo} aria-hidden="true">
                  <BandGlyph band={c.bandChangeTo} />
                </span>
              {/if}
              <span class="wtb-cell-main">{c.main}</span>
              <span class="wtb-cell-sub">{c.sub}</span>
            </button>
          {/each}
        </div>
      </div>
    {/each}

    <div class="wtb-selection-layer">
      <div class="wtb-selection-spacer"></div>
      <div class="wtb-selection-track" bind:this={trackEl}>
        <div
          class="wtb-selection"
          style="left: {selStartPct}%; width: {selWidthPct}%"
          on:mousedown={startDragging}
          title="Drag to slide the selected window"
          role="slider"
          aria-valuemin="0"
          aria-valuemax="24"
          aria-valuenow={selectedStartUTC}
          tabindex="0"
        >
          <span class="wtb-selection-handle" aria-hidden="true">
            <span></span><span></span><span></span>
          </span>
        </div>
      </div>
    </div>

    {#if hoverH !== null}
      <div class="wtb-hover-layer">
        <div class="wtb-hover-spacer"></div>
        <div class="wtb-hover-track">
          <div
            class="wtb-hover-col"
            style="left: {(hoverH / HOURS) * 100}%; width: {(1 / HOURS) * 100}%"
          ></div>
        </div>
      </div>
    {/if}

    {#if showNow && anchor}
      <div class="wtb-now-layer">
        <div class="wtb-now-spacer"></div>
        <div class="wtb-now-track">
          <div
            class="wtb-now-line"
            style="left: {(hoursFromAnchor / HOURS) * 100}%"
            title={"Now · " +
              formatHour(
                partsInZone(now, anchor.tz).hour + partsInZone(now, anchor.tz).minute / 60,
                h24
              ) +
              " in " +
              anchor.city}
          >
            <span class="wtb-now-dot"></span>
            <span class="wtb-now-label">NOW</span>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
