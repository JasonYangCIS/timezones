<script lang="ts" context="module">
  export type Band = "deep-night" | "sleep" | "early" | "work" | "evening";

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
    // "Deep night" is the chunk of sleep centered on midnight (0–6am local).
    // We surface this as a separate, much darker band so a 2am tile reads as
    // obviously wrong vs. an 8pm late-evening one — the previous palette was
    // too polite about bad hours.
    if (localHour >= 0 && localHour < 6) return "deep-night";
    return "sleep";
  }

  // True when this localHour is also a half/quarter-hour offset zone tile
  // (we still snap the grid to the hour, but flag the offset on the badge).
  export function offsetMinuteBadge(minute: number): string | null {
    if (minute === 30) return "+30";
    if (minute === 45) return "+45";
    if (minute === 15) return "+15";
    return null;
  }
</script>

<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import type { Zone } from "./data";
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

  export let zones: Zone[] = [];
  export let anchorDate: Date;
  export let h24 = false;
  export let selectedStartUTC = 0;
  export let selectedDurationH = 1;

  const dispatch = createEventDispatcher<{
    seek: number;
    shiftDay: number;
    resize: number;
  }>();

  const HOURS = 24;
  let hoverH: number | null = null;
  let now: Date = new Date();
  let nowTimer: ReturnType<typeof setInterval>;

  onMount(() => {
    nowTimer = setInterval(() => (now = new Date()), 60000);
  });
  onDestroy(() => clearInterval(nowTimer));

  $: anchor = zones[0];
  $: anchorOffMin = anchor ? offsetMinutes(now, anchor.tz) : 0;
  $: hoursFromAnchor = anchorDate ? (now.getTime() - anchorDate.getTime()) / 3600000 : -1;
  $: showNow = hoursFromAnchor >= 0 && hoursFromAnchor <= HOURS;

  // Detect DST shifts across all zones for a given day vs the previous day.
  // Returns the list of zones whose UTC offset changes from yesterday → today.
  function dstChangesForDay(day: Date) {
    const yesterdayNoon = new Date(day.getTime() - 12 * 3600000);
    const todayNoon = new Date(day.getTime() + 12 * 3600000);
    const changes: { zone: Zone; from: number; to: number }[] = [];
    for (const z of zones) {
      const a = offsetMinutes(yesterdayNoon, z.tz);
      const b = offsetMinutes(todayNoon, z.tz);
      if (a !== b) changes.push({ zone: z, from: a, to: b });
    }
    return changes;
  }

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
      const dstChanges = dstChangesForDay(new Date(anchorDate.getTime() + i * 86400000));
      const dstTitle = dstChanges.length
        ? "Clocks change today: " +
          dstChanges
            .map(
              (c) =>
                c.zone.city +
                " shifts " +
                ((c.to - c.from) / 60 > 0 ? "+" : "") +
                ((c.to - c.from) / 60).toFixed(1) +
                "h"
            )
            .join(", ")
        : "";
      arr.push({ d, local, offset: i, isToday, isWeekend, dst: dstChanges.length > 0, dstTitle });
    }
    return arr;
  })();

  function pickHour(h: number) {
    const dur = Math.ceil(selectedDurationH);
    dispatch("seek", Math.max(0, Math.min(HOURS - dur, h)));
  }

  // Build per-row cell metadata.
  // For zones whose local time is offset by a non-integer number of hours
  // (Mumbai +5:30, Kathmandu +5:45, Newfoundland −3:30, etc.) we shift the
  // cells so each one starts on a *local* hour boundary. The whole row is
  // then visually offset to the right by that fraction of an hour, so the
  // local "6am" tile sits where 6am actually occurs in real time.
  function buildCells(p: Zone, anchor: Date, use24: boolean) {
    const cells = [];
    let prevLocalDay: number | null = null;
    let prevBand: Band | null = null;
    let prevWeekday: string | null = null;

    // Local minute at the row's left edge (UTC anchor). 0 for whole-hour
    // zones, 30 for +5:30, 45 for +5:45, 15 for the ones at +/-h:15.
    const initialLocal = partsInZone(anchor, p.tz);
    const minute0 = initialLocal.minute;
    const startOffsetHours = minute0 === 0 ? 0 : (60 - minute0) / 60;
    // Each cell is 1h wide. Cap so we don't render past the 24h window.
    const cellCount = Math.max(0, Math.floor(HOURS - startOffsetHours + 1e-6));

    for (let i = 0; i < cellCount; i++) {
      const hOff = startOffsetHours + i;
      const d = new Date(anchor.getTime() + hOff * 3600000);
      const local = partsInZone(d, p.tz);
      const band = bandFor(local.hour, p.workStart, p.workEnd);
      const isDayChange = prevLocalDay !== null && local.day !== prevLocalDay;
      const isFirstCell = i === 0;
      const showDatePill = isDayChange || isFirstCell;
      const datePillText = formatDateShort(d, p.tz).toUpperCase();
      const bandChangeTo = i > 0 && band !== prevBand ? band : null;
      const isWeekend = local.weekday === "Sat" || local.weekday === "Sun";
      // The minute badge is no longer needed for shifted rows — the cell
      // itself is now aligned to local hours. Keep it only in the rare case
      // we still see a non-zero minute (defensive).
      const minuteBadge = offsetMinuteBadge(local.minute);

      let main: string, sub: string;
      if (use24) {
        main = String(local.hour).padStart(2, "0");
        sub = String(local.minute).padStart(2, "0");
      } else {
        const h12 = local.hour % 12 || 12;
        main = String(h12);
        sub = local.hour < 12 ? "am" : "pm";
      }

      cells.push({
        h: hOff,
        band,
        bandChangeTo,
        showDatePill,
        datePillText,
        main,
        sub,
        isWeekend,
        minuteBadge,
      });
      prevLocalDay = local.day;
      prevBand = band;
      prevWeekday = local.weekday;
    }
    // 96-col grid (15-min resolution) — first cell positioned via grid-column-start.
    const startCol = Math.round(startOffsetHours * 4) + 1;
    return { cells, startCol, startOffsetHours };
  }

  function rowDelta(p: Zone, isAnchor: boolean) {
    if (isAnchor) return "";
    const off = offsetMinutes(now, p.tz) - anchorOffMin;
    const sign = off > 0 ? "+" : off < 0 ? "−" : "";
    const ah = Math.abs(off) / 60;
    return sign + (ah % 1 === 0 ? ah : ah.toFixed(1));
  }

  function rowDeltaTitle(p: Zone, isAnchor: boolean) {
    if (isAnchor || !anchor) return "";
    const off = offsetMinutes(now, p.tz) - anchorOffMin;
    const ah = off / 60;
    if (ah === 0) return p.city + " is the same time as " + anchor.city;
    const abs = Math.abs(ah);
    const hourWord = abs === 1 ? "hour" : "hours";
    const dir = ah > 0 ? "ahead of" : "behind";
    const pretty = abs % 1 === 0 ? abs : abs.toFixed(1);
    return p.city + " is " + pretty + " " + hourWord + " " + dir + " " + anchor.city;
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
      newHour = Math.round(newHour * 2) / 2;
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

  // Resize selection by dragging the left or right edge handle.
  function startResize(side: "left" | "right", e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const handleEl = e.currentTarget as HTMLElement;
    const trackParent = handleEl.closest(".wtb-selection-track") as HTMLElement | null;
    if (!trackParent) return;
    const rect = trackParent.getBoundingClientRect();
    const startX = e.clientX;
    const startStart = selectedStartUTC;
    const startDur = selectedDurationH;

    function move(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      const dHours = (dx / rect.width) * HOURS;
      // Snap to 30-minute increments
      const snap = (n: number) => Math.round(n * 2) / 2;
      if (side === "left") {
        let newStart = snap(startStart + dHours);
        // Clamp so width stays >= 0.5h and within bounds
        newStart = Math.max(0, Math.min(startStart + startDur - 0.5, newStart));
        const newDur = startDur - (newStart - startStart);
        dispatch("seek", newStart);
        dispatch("resize", newDur);
      } else {
        let newDur = snap(startDur + dHours);
        newDur = Math.max(0.5, Math.min(HOURS - startStart, newDur));
        dispatch("resize", newDur);
      }
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
      {#each dayStrip as { d, local, offset, isToday, isWeekend, dst, dstTitle } (offset)}
        <button
          class="day-pill"
          class:is-today={isToday}
          class:is-weekend={isWeekend}
          class:has-dst={dst}
          on:click={() => dispatch("shiftDay", offset)}
          title={dst ? dstTitle : anchor ? formatDateLong(d, anchor.tz) : ""}
        >
          <span class="day-pill-dow">{local.weekday}</span>
          <span class="day-pill-num">{local.day}</span>
          {#if dst}
            <span class="day-pill-dst" aria-label="DST change">DST</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <div class="wtb-rows" style="position: relative">
    {#each zones as p, i (p.id)}
      {@const isAnchor = i === 0}
      {@const built = buildCells(p, anchorDate, h24)}
      {@const cells = built.cells}
      {@const rowStartCol = built.startCol}
      {@const nowLocal = partsInZone(now, p.tz)}
      {@const nowStr = formatHour(nowLocal.hour + nowLocal.minute / 60, h24)}
      {@const offMin = offsetMinutes(now, p.tz)}
      {@const deltaStr = rowDelta(p, isAnchor)}
      <div class="wtb-row" class:is-anchor={isAnchor}>
        <div class="wtb-row-info">
          <Avatar zone={p} size={28} />
          <div class="wtb-row-info-meta">
            <div class="wtb-row-name">
              {#if !isAnchor && deltaStr}
                <span class="wtb-row-delta" title={rowDeltaTitle(p, isAnchor)}>{deltaStr}</span>
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
          {#each cells as c, ci (c.h)}
            <button
              type="button"
              class={"wtb-cell band-" + c.band}
              class:is-selected-start={Math.floor(c.h) === startInt}
              class:is-in-selection={c.h + 1 > selectedStartUTC && c.h < selectedStartUTC + selectedDurationH}
              class:has-date-pill={c.showDatePill}
              class:has-band-glyph={!!c.bandChangeTo}
              class:is-weekend={c.isWeekend}
              style={ci === 0 && rowStartCol > 1 ? `grid-column-start: ${rowStartCol}` : undefined}
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
              {#if c.minuteBadge}
                <span class="wtb-cell-minute-badge" title="Half/quarter-hour offset zone">{c.minuteBadge}</span>
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
          title="Drag to slide · grab edges to resize"
          role="slider"
          aria-valuemin="0"
          aria-valuemax="24"
          aria-valuenow={selectedStartUTC}
          tabindex="0"
        >
          <span
            class="wtb-selection-resize wtb-selection-resize-left"
            on:mousedown={(e) => startResize("left", e)}
            title="Drag to change start"
            aria-hidden="true"
          ></span>
          <span
            class="wtb-selection-resize wtb-selection-resize-right"
            on:mousedown={(e) => startResize("right", e)}
            title="Drag to change end"
            aria-hidden="true"
          ></span>
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
      <div class="wtb-now-layer is-fullheight">
        <div class="wtb-now-spacer"></div>
        <div class="wtb-now-track is-fullheight">
          <div
            class="wtb-now-line is-fullheight"
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
