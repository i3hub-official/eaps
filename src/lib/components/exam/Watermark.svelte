<!-- src/lib/components/exam/Watermark.svelte -->
<script lang="ts">
  interface Props {
    text: string;   // e.g. "2021/CS/001 — John Doe"
  }
  let { text }: Props = $props();
</script>

<div class="watermark" aria-hidden="true">
  {#each Array(40) as _}
    <span>{text}</span>
  {/each}
</div>

<style>
  .watermark {
    position: fixed; inset: 0; z-index: 1;
    pointer-events: none; user-select: none;
    display: flex; flex-wrap: wrap; gap: 3rem;
    padding: 2rem;
    overflow: hidden;
    opacity: 0.04;
  }

  span {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-text);
    white-space: nowrap;
    transform: rotate(-30deg);
    display: inline-block;
  }
</style>
