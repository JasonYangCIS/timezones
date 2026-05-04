<script lang="ts">
  export let size = 14;
  export let dir: "left" | "right" | "up" | "down" = "left";
  $: d =
    dir === "left"
      ? "M9.5 4L6 8l3.5 4"
      : dir === "right"
        ? "M6.5 4L10 8l-3.5 4"
        : dir === "up"
          ? "M4 9.5L8 6l4 3.5"
          : "M4 6.5L8 10l4-3.5";
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path {d} />
</svg>
