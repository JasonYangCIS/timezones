<script lang="ts">
  import type { Zone } from "./data";
  export let zone: Zone;
  export let size = 32;
  $: initials = (zone.city || zone.name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
</script>

<div
  class="avatar"
  style="width: {size}px; height: {size}px; background: {zone.color}; font-size: {size * 0.4}px"
>
  {initials}
</div>
