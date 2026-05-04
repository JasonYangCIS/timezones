<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { SEED_PEOPLE, type Person } from "./lib/data";
  import {
    computeFitGrid,
    findSweetWindows,
    findExtendedWindows,
    findBestPartial,
  } from "./lib/sweetSpot";
  import PersonCard from "./lib/PersonCard.svelte";
  import AddPerson from "./lib/AddPerson.svelte";
  import SweetSpotList from "./lib/SweetSpotList.svelte";
  import MeetingStrip from "./lib/MeetingStrip.svelte";
  import StackedTimeline from "./lib/StackedTimeline.svelte";

  type Tweaks = { h24: boolean; theme: "light" | "dark"; duration: number };
  let tweaks: Tweaks = { h24: false, theme: "light", duration: 1 };

  let people: Person[] = [...SEED_PEOPLE];
  let now: Date = new Date();
  let nowTimer: ReturnType<typeof setInterval>;

  function isoDate(d: Date) {
    return (
      d.getUTCFullYear() +
      "-" +
      String(d.getUTCMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getUTCDate()).padStart(2, "0")
    );
  }
  function getAnchorDate(dateString: string) {
    const [y, m, d] = dateString.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  }

  let dateStr = isoDate(new Date());
  let selectedStartUTC = 16;
  let tweaksOpen = false;

  $: anchorDate = getAnchorDate(dateStr);
  $: duration = tweaks.duration || 1;

  $: grid = computeFitGrid(people, anchorDate, 0.5, 24);
  $: sweetWindows = (() => {
    const full = findSweetWindows(grid, 0.5);
    if (full.length) return full;
    // No fully-shared working hours — try a "stretch" window where everyone is
    // at least within their early/evening band (e.g. a 9pm/9am bridge meeting).
    const extended = findExtendedWindows(grid, 0.5);
    if (extended.length) return extended.slice(0, 3);
    return findBestPartial(grid).slice(0, 3);
  })();

  // Apply theme to root
  $: if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = tweaks.theme === "dark" ? "dark" : "light";
  }

  // Auto-select longest sweet window when people/date change
  let lastAuto = "";
  $: {
    const sig = people.map((p) => p.id).join(",") + "|" + dateStr;
    if (lastAuto !== sig && sweetWindows.length) {
      lastAuto = sig;
      const w = sweetWindows[0];
      const center = w.startUTC + (w.durationHours - duration) / 2;
      selectedStartUTC = Math.max(
        0,
        Math.min(24 - duration, Math.round(center * 2) / 2)
      );
    }
  }

  onMount(() => {
    nowTimer = setInterval(() => (now = new Date()), 30000);
  });
  onDestroy(() => clearInterval(nowTimer));

  function addPerson(p: Person) {
    people = [...people, p];
  }
  function removePerson(id: string) {
    people = people.filter((p) => p.id !== id);
  }
  function updatePerson(id: string, patch: Partial<Person>) {
    people = people.map((p) => (p.id === id ? { ...p, ...patch } : p));
  }
  function shiftDate(days: number) {
    const d = new Date(anchorDate.getTime() + days * 86400000);
    dateStr = isoDate(d);
  }
  function pickWindow(t: number) {
    const w = sweetWindows.find((x) => Math.abs(x.startUTC - t) < 1e-3);
    if (w) {
      const center = w.startUTC + (w.durationHours - duration) / 2;
      selectedStartUTC = Math.max(
        0,
        Math.min(24 - duration, Math.round(center * 2) / 2)
      );
    } else {
      selectedStartUTC = t;
    }
  }
</script>

<div class="app">
  <div class="topbar">
    <div class="brand">
      <span class="brand-mark"></span>
      <span class="brand-name">easy-timezones</span>
    </div>
    <div class="topbar-actions">
      <span>Click any cell to set the meeting</span>
      <span style="margin: 0 8px; color: var(--text-4)">·</span>
      <span>Drag the highlight to slide it</span>
    </div>
  </div>

  <div class="workspace">
    <aside class="sidebar">
      <div>
        <div class="sidebar-section-title">Timezones · {people.length}</div>
        <div class="people-list">
          {#each people as p (p.id)}
            <PersonCard
              person={p}
              h24={tweaks.h24}
              {now}
              on:remove={(e) => removePerson(e.detail.id)}
              on:update={(e) => updatePerson(e.detail.id, e.detail.patch)}
            />
          {/each}
          <AddPerson on:add={(e) => addPerson(e.detail)} />
        </div>
      </div>

      <div>
        <div class="sidebar-section-title">Best windows</div>
        <SweetSpotList
          slots={sweetWindows}
          selected={selectedStartUTC}
          h24={tweaks.h24}
          on:pick={(e) => pickWindow(e.detail)}
        />
      </div>

      <div>
        <div class="sidebar-section-title">Legend</div>
        <div class="legend" style="flex-direction: column; align-items: flex-start; gap: 8px">
          <div class="legend-item"><span class="legend-swatch band-work"></span><span>Working hours</span></div>
          <div class="legend-item"><span class="legend-swatch band-early"></span><span>Early (2h before)</span></div>
          <div class="legend-item"><span class="legend-swatch band-evening"></span><span>Evening (4h after)</span></div>
          <div class="legend-item"><span class="legend-swatch band-sleep"></span><span>Off / sleep</span></div>
        </div>
      </div>
    </aside>

    <main class="canvas">
      <MeetingStrip
        {people}
        {anchorDate}
        {selectedStartUTC}
        durationH={duration}
        h24={tweaks.h24}
        on:shiftDate={(e) => shiftDate(e.detail)}
      />

      <StackedTimeline
        {people}
        {anchorDate}
        h24={tweaks.h24}
        {selectedStartUTC}
        selectedDurationH={duration}
        on:seek={(e) => (selectedStartUTC = e.detail)}
        on:shiftDay={(e) => shiftDate(e.detail)}
      />
    </main>
  </div>

  <div class="tweaks-fab">
    <button class="btn btn-sm" on:click={() => (tweaksOpen = !tweaksOpen)}>
      Tweaks
    </button>
    {#if tweaksOpen}
      <div class="tweaks-panel">
        <div class="tweaks-section">
          <div class="tweaks-label">Time format</div>
          <div class="tweaks-radio">
            <button
              class="btn btn-sm"
              class:btn-primary={!tweaks.h24}
              on:click={() => (tweaks = { ...tweaks, h24: false })}
            >12-hour</button>
            <button
              class="btn btn-sm"
              class:btn-primary={tweaks.h24}
              on:click={() => (tweaks = { ...tweaks, h24: true })}
            >24-hour</button>
          </div>
        </div>
        <div class="tweaks-section">
          <div class="tweaks-label">Theme</div>
          <div class="tweaks-radio">
            <button
              class="btn btn-sm"
              class:btn-primary={tweaks.theme === "light"}
              on:click={() => (tweaks = { ...tweaks, theme: "light" })}
            >Light</button>
            <button
              class="btn btn-sm"
              class:btn-primary={tweaks.theme === "dark"}
              on:click={() => (tweaks = { ...tweaks, theme: "dark" })}
            >Dark</button>
          </div>
        </div>
        <div class="tweaks-section">
          <div class="tweaks-label">Duration · {duration}h</div>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.5"
            value={tweaks.duration}
            on:input={(e) =>
              (tweaks = {
                ...tweaks,
                duration: parseFloat((e.currentTarget as HTMLInputElement).value),
              })}
          />
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .tweaks-fab {
    position: fixed;
    right: 22px;
    bottom: 22px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }
  .tweaks-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: var(--shadow-lg);
    padding: 14px 16px;
    width: 240px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .tweaks-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .tweaks-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3);
    font-weight: 600;
  }
  .tweaks-radio {
    display: flex;
    gap: 6px;
  }
  .tweaks-panel input[type="range"] {
    width: 100%;
  }
</style>
