<script lang="ts">
  import type { Person } from "./data";
  export let person: Person;
  export let size = 32;
  $: initials = (person.city || person.name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
</script>

<div
  class="avatar"
  style="width: {size}px; height: {size}px; background: {person.color}; font-size: {size * 0.4}px"
>
  {initials}
</div>
