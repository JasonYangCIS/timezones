<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Person } from "./data";
  import { partsInZone, offsetMinutes, formatHour, offsetLabel } from "./tz";
  import Avatar from "./Avatar.svelte";
  import Settings from "./icons/Settings.svelte";
  import Trash from "./icons/Trash.svelte";

  export let person: Person;
  export let h24 = false;
  export let now: Date = new Date();

  const dispatch = createEventDispatcher<{
    remove: { id: string };
    update: { id: string; patch: Partial<Person> };
  }>();

  let editing = false;

  $: local = partsInZone(now, person.tz);
  $: offMin = offsetMinutes(now, person.tz);
  $: localTimeStr = formatHour(local.hour + local.minute / 60, h24);
</script>

<div class="people-card">
  <Avatar {person} size={30} />
  <div class="people-card-meta">
    <div class="people-card-name">{person.city}</div>
    <div class="people-card-zone">
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
          value={person.workStart}
          on:input={(e) =>
            dispatch("update", {
              id: person.id,
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
          value={person.workEnd}
          on:input={(e) =>
            dispatch("update", {
              id: person.id,
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
  <div class="people-card-actions">
    <button class="icon-btn" title="Working hours" on:click={() => (editing = !editing)}>
      <Settings />
    </button>
    <button class="icon-btn" title="Remove" on:click={() => dispatch("remove", { id: person.id })}>
      <Trash />
    </button>
  </div>
</div>
