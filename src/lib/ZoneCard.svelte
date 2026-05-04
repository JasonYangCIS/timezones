<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Zone } from "./data";
  import { partsInZone, offsetMinutes, formatHour, offsetLabel } from "./tz";
  import Avatar from "./Avatar.svelte";
  import Settings from "./icons/Settings.svelte";
  import Trash from "./icons/Trash.svelte";

  export let zone: Zone;
  export let h24 = false;
  export let now: Date = new Date();

  const dispatch = createEventDispatcher<{
    remove: { id: string };
    update: { id: string; patch: Partial<Zone> };
  }>();

  let editing = false;

  $: local = partsInZone(now, zone.tz);
  $: offMin = offsetMinutes(now, zone.tz);
  $: localTimeStr = formatHour(local.hour + local.minute / 60, h24);
</script>

<div class="zone-card">
  <Avatar {zone} size={30} />
  <div class="zone-card-meta">
    <div class="zone-card-city">{zone.city}</div>
    <div class="zone-card-time">
      <span class="mono">{localTimeStr}</span>
      <span style="color: var(--text-4)">·</span>
      <span>{offsetLabel(offMin)}</span>
    </div>
    {#if editing}
      <div class="work-hours">
        <span>Hours</span>
        <input
          type="number"
          min="0"
          max="23"
          value={zone.workStart}
          on:input={(e) =>
            dispatch("update", {
              id: zone.id,
              patch: {
                workStart: Math.max(
                  0,
                  Math.min(23, parseInt((e.currentTarget as HTMLInputElement).value || "0", 10))
                ),
              },
            })}
        />
        <span>–</span>
        <input
          type="number"
          min="0"
          max="24"
          value={zone.workEnd}
          on:input={(e) =>
            dispatch("update", {
              id: zone.id,
              patch: {
                workEnd: Math.max(
                  1,
                  Math.min(24, parseInt((e.currentTarget as HTMLInputElement).value || "24", 10))
                ),
              },
            })}
        />
      </div>
    {/if}
  </div>
  <div class="zone-card-actions">
    <button class="icon-btn" title="Working hours" on:click={() => (editing = !editing)}>
      <Settings />
    </button>
    <button class="icon-btn" title="Remove" on:click={() => dispatch("remove", { id: zone.id })}>
      <Trash />
    </button>
  </div>
</div>
