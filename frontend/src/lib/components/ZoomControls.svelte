<script lang="ts">
  let {
    onzoomin,
    onzoomout,
    onreset,
  }: { onzoomin: () => void; onzoomout: () => void; onreset: () => void } = $props();
</script>

<nav class="map-zoom" aria-label="Масштаб карты">
  <button class="map-zoom__button" type="button" aria-label="Увеличить" onclick={onzoomin}>+</button>
  <button class="map-zoom__button" type="button" aria-label="Сбросить масштаб" onclick={onreset}>⌾</button>
  <button class="map-zoom__button" type="button" aria-label="Уменьшить" onclick={onzoomout}>−</button>
</nav>

<style>
  .map-zoom {
    position: fixed;
    z-index: 6;
    right: clamp(16px, 2vw, 32px);
    bottom: clamp(20px, 3vw, 42px);
    display: grid;
    overflow: hidden;
    border: 1px solid #365268;
    background: #081127;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.24);
  }

  .map-zoom__button {
    width: 40px;
    height: 38px;
    border: 0;
    border-bottom: 1px solid #293f52;
    color: #a9c6d5;
    background: transparent;
    cursor: pointer;
    font: 400 18px 'IBM Plex Mono', monospace;
  }

  .map-zoom__button:last-child {
    border-bottom: 0;
  }

  .map-zoom__button:hover,
  .map-zoom__button:focus-visible {
    color: #07101d;
    background: var(--cyan);
    outline: 0;
  }

  @media (max-width: 760px) {
    .map-zoom {
      bottom: 18px;
    }
  }
</style>
