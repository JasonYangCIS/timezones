<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { SweetWindow } from "./sweetSpot";
  import { formatHour } from "./tz";

  export let slots: SweetWindow[] = [];
  export let selected = 0;
  export let h24 = false;

  const dispatch = createEventDispatcher<{ pick: number }>();
</script>

{#if !slots.length}
  <div style="font-size: 12px; color: var(--text-3); padding: 8px 4px">
    No fully-overlapping window today. Try the next day.
  </div>
{:else}
  <div class="sweet-summary">
    {#each slots.slice(0, 5) as s, i (i)}
      {@const isSel = Math.abs(s.startUTC - selected) < 1e-3}
      <button
        class="sweet-pill"
        class:active={isSel}
        on:click={() => dispatch("pick", s.startUTC)}
      >
        <span class="sweet-pill-time">
          {formatHour(s.startUTC % 24, h24)} – {formatHour(s.endUTC % 24, h24)} UTC
        </span>
        <span class="sweet-pill-fit">
          <span class="fit-dot"></span>
          {s.fitLabel}
        </span>
      </button>
    {/each}
  </div>
{/if}
