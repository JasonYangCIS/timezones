<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import {
    TZ_PRESETS,
    TZ_ABBREVIATIONS,
    AVATAR_PALETTE,
    makePerson,
    type Person,
    type TzPreset,
  } from "./data";
  import Plus from "./icons/Plus.svelte";

  const dispatch = createEventDispatcher<{ add: Person }>();

  let q = "";
  let open = false;
  let activeIdx = 0;
  let inputEl: HTMLInputElement | null = null;
  let wrapEl: HTMLDivElement | null = null;

  $: matches = (() => {
    if (!q.trim()) return TZ_PRESETS.slice(0, 8);
    const lower = q.trim().toLowerCase();
    // Match abbreviations like PDT/EST/JST against IANA tz ids.
    const abbrevTzs = new Set(TZ_ABBREVIATIONS[lower] ?? []);
    return TZ_PRESETS.filter(
      (p) =>
        p.city.toLowerCase().includes(lower) ||
        p.region.toLowerCase().includes(lower) ||
        p.tz.toLowerCase().includes(lower) ||
        abbrevTzs.has(p.tz)
    ).slice(0, 10);
  })();

  function pick(item: TzPreset) {
    const color = AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)];
    dispatch(
      "add",
      makePerson({ name: item.city, city: item.city, tz: item.tz, color })
    );
    q = "";
    open = false;
    inputEl?.blur();
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIdx = Math.min(matches.length - 1, activeIdx + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIdx = Math.max(0, activeIdx - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches[activeIdx]) pick(matches[activeIdx]);
    } else if (e.key === "Escape") {
      open = false;
      inputEl?.blur();
    }
  }

  function onDocMouseDown(e: MouseEvent) {
    if (wrapEl && !wrapEl.contains(e.target as Node)) open = false;
  }

  onMount(() => document.addEventListener("mousedown", onDocMouseDown));
  onDestroy(() => document.removeEventListener("mousedown", onDocMouseDown));
</script>

<div class="add-person" bind:this={wrapEl}>
  <span class="add-person-icon"><Plus size={14} /></span>
  <input
    bind:this={inputEl}
    class="add-person-input"
    placeholder="Add a city or timezone…"
    bind:value={q}
    on:input={() => {
      open = true;
      activeIdx = 0;
    }}
    on:focus={() => (open = true)}
    on:keydown={handleKey}
  />
  {#if open && matches.length > 0}
    <div class="add-person-suggest">
      {#each matches as m, i (m.tz + m.city)}
        <div
          class="suggest-item"
          class:active={i === activeIdx}
          on:mouseenter={() => (activeIdx = i)}
          on:mousedown={(e) => {
            e.preventDefault();
            pick(m);
          }}
          role="option"
          tabindex="-1"
          aria-selected={i === activeIdx}
        >
          <div>
            <div class="suggest-name">{m.city}</div>
            <div class="suggest-zone">{m.region} · {m.tz}</div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
