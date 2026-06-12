<!-- src/lib/components/exam/Watermark.svelte -->
<script lang="ts">
  interface Props {
    text: string;
  }
  let { text }: Props = $props();

  // Generate deterministic positions so watermark tiles consistently
  const tiles = Array.from({ length: 48 }, (_, i) => ({
    id: i,
    x: (i % 6) * 16.66 + 8.33,
    y: Math.floor(i / 6) * 14.28 + 7.14,
    rotation: -25 + (i % 5) * 3,
    opacity: 0.025 + (i % 3) * 0.008,
  }));
</script>

<div class="watermark-layer" aria-hidden="true">
  {#each tiles as tile}
    <span
      class="watermark-tile"
      style="left: {tile.x}%; top: {tile.y}%; transform: rotate({tile.rotation}deg); opacity: {tile.opacity}"
    >
      {text}
    </span>
  {/each}
</div>

<style>
  .watermark-layer {
    position: fixed;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    user-select: none;
    overflow: hidden;
    isolation: isolate;
  }

  .watermark-tile {
    position: absolute;
    font-size: 0.75rem;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-family: 'JetBrains Mono', monospace;
    mix-blend-mode: overlay;
  }
</style>