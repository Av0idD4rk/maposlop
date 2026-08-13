<script lang="ts">
  import { heatMonths, mapMode } from '$lib/stores';
</script>

<section class="heat-controls" class:is-heat={$mapMode === 'heat'} aria-label="Режим карты">
  <div class="mode-switch" role="group" aria-label="Отображение карты">
    <button class:active={$mapMode === 'events'} type="button" onclick={() => mapMode.set('events')}>События</button>
    <button class:active={$mapMode === 'heat'} type="button" onclick={() => mapMode.set('heat')}>Heat map</button>
  </div>
  {#if $mapMode === 'heat'}
    <div class="heat-range">
      <div><span>Активность за период</span><strong>Последние {$heatMonths} мес.</strong></div>
      <input aria-label="Количество последних месяцев" type="range" min="1" max="24" step="1" bind:value={$heatMonths} />
      <div class="heat-legend" aria-hidden="true"><span>Меньше</span><i></i><span>Больше</span></div>
    </div>
  {/if}
</section>

<style>
  .heat-controls { position: fixed; z-index: 6; top: 82px; left: 22px; display: grid; gap: 10px; width: 286px; }
  .mode-switch { display: grid; grid-template-columns: 1fr 1fr; padding: 3px; border: 1px solid #28465d; border-radius: 8px; background: rgba(6,12,29,.9); backdrop-filter: blur(12px); }
  .mode-switch button { min-height: 40px; border: 0; border-radius: 5px; color: #819bae; background: transparent; cursor: pointer; font: 700 10px 'IBM Plex Mono'; letter-spacing: .05em; text-transform: uppercase; }
  .mode-switch button.active { color: #07101d; background: var(--cyan); }
  .heat-range { padding: 15px; border: 1px solid rgba(255,124,55,.38); border-radius: 9px; background: rgba(19,9,20,.92); box-shadow: 8px 8px 0 rgba(0,0,0,.2); backdrop-filter: blur(14px); animation: reveal 280ms ease-out; }
  .heat-range > div:first-child { display: flex; justify-content: space-between; gap: 12px; color: #9a8990; font: 600 9px 'IBM Plex Mono'; text-transform: uppercase; }
  .heat-range strong { color: #ffb15f; }
  input[type='range'] { width: 100%; margin: 17px 0 10px; accent-color: #ff5a32; cursor: pointer; }
  .heat-legend { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; color: #8b7780; font: 500 8px 'IBM Plex Mono'; text-transform: uppercase; }
  .heat-legend i { height: 6px; background: linear-gradient(90deg, #17235c 0%, #ffd23f 50%, #ff241f 100%); }
  @keyframes reveal { from { opacity: 0; transform: translateY(-6px); } }
  @media (max-width:760px) { .heat-controls { top: 70px; left: 10px; width: min(260px, calc(100vw - 20px)); } }
  @media (prefers-reduced-motion:reduce) { .heat-range { animation: none; } }
</style>
