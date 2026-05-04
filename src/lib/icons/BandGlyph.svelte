<script lang="ts">
  export let band: "early" | "work" | "evening" | "sleep";
</script>

{#if band === "early"}
  <svg viewBox="0 0 12 12" width="11" height="11">
    <line x1="1" y1="9" x2="11" y2="9" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
    <path d="M3 9 a3 3 0 0 1 6 0" fill="currentColor" opacity="0.85" />
    <line x1="6" y1="2" x2="6" y2="3.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
  </svg>
{:else if band === "work"}
  <svg viewBox="0 0 12 12" width="11" height="11">
    <circle cx="6" cy="6" r="2.4" fill="currentColor" />
    <g stroke="currentColor" stroke-width="1" stroke-linecap="round">
      <line x1="6" y1="0.8" x2="6" y2="2.2" />
      <line x1="6" y1="9.8" x2="6" y2="11.2" />
      <line x1="0.8" y1="6" x2="2.2" y2="6" />
      <line x1="9.8" y1="6" x2="11.2" y2="6" />
    </g>
  </svg>
{:else if band === "evening"}
  <svg viewBox="0 0 12 12" width="11" height="11">
    <line x1="1" y1="8" x2="11" y2="8" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
    <path d="M3 8 a3 3 0 0 1 6 0" fill="currentColor" opacity="0.85" />
  </svg>
{:else if band === "sleep"}
  <svg viewBox="0 0 12 12" width="11" height="11">
    <path d="M9 7.5 A4 4 0 1 1 4.5 3 a3 3 0 0 0 4.5 4.5z" fill="currentColor" />
  </svg>
{/if}
