<script lang="ts">
  import { events, selectedRegionId, regionNames, activeEvent, suggestOpen } from '$lib/stores';
  import { canonicalRegionId } from '$lib/regions';
  import { eventWord } from '$lib/format';
  import EventCard from './EventCard.svelte';
  import type { CtfEvent } from '$lib/types';

  let canonical = $derived($selectedRegionId);
  let isOpen = $derived(canonical !== null);
  let title = $derived(canonical ? ($regionNames.get(canonical) ?? `Регион ${canonical}`) : 'Где играем?');
  let items = $derived(
    canonical ? $events.filter((event) => canonicalRegionId(event.regionCode) === canonical) : [],
  );

  function openEvent(event: CtfEvent) {
    activeEvent.set(event);
  }

  function openSuggest() {
    suggestOpen.set(true);
  }
</script>

<aside class="side-panel" class:is-open={isOpen} id="region-panel" aria-live="polite" aria-labelledby="panel-title">
  <button
    class="icon-button side-panel__close"
    type="button"
    aria-label="Закрыть"
    onclick={() => selectedRegionId.set(null)}
  >
    ×
  </button>
  <p class="eyebrow">{canonical ? 'ВЫБРАННЫЙ РЕГИОН' : 'ВЫБЕРИТЕ РЕГИОН'}</p>
  <h2 id="panel-title">{title}</h2>
  <div class="panel-content">
    {#if !canonical}
      <p class="empty-copy">Нажмите на регион карты, чтобы увидеть ближайшие CTF.</p>
    {:else if items.length}
      <p class="panel-count">{items.length} {eventWord(items.length)}</p>
      <div class="event-list">
        {#each items as event (event.id)}
          <EventCard {event} onselect={openEvent} />
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <span>⚑</span>
        <h3>Пока тихо</h3>
        <p>В этом регионе нет опубликованных CTF. Знаете о событии?</p>
        <button class="button button--ghost" type="button" onclick={openSuggest}>Предложить CTF</button>
      </div>
    {/if}
  </div>
</aside>

<style>
  .side-panel {
    position: fixed;
    z-index: 10;
    top: 82px;
    right: 18px;
    bottom: 18px;
    width: min(390px, calc(100vw - 32px));
    padding: 42px 24px 24px;
    overflow: auto;
    border: 1px solid #35536a;
    border-top: 3px solid var(--cyan);
    background: #081127;
    box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.28);
    transform: translateX(calc(100% + 50px));
    transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    pointer-events: none;
  }

  .side-panel.is-open {
    transform: translateX(0);
    pointer-events: auto;
  }

  .side-panel h2 {
    margin: 0;
    color: #fff;
    font-family: 'IBM Plex Sans', Arial, sans-serif;
    font-size: clamp(25px, 3vw, 38px);
    font-weight: 500;
    line-height: 1.08;
    letter-spacing: -0.025em;
  }

  .icon-button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: 1px solid #35536a;
    border-radius: 50%;
    color: #8eabbc;
    background: transparent;
    cursor: pointer;
    font: 400 20px 'IBM Plex Mono', monospace;
  }

  .icon-button:hover {
    border-color: var(--cyan);
    color: #06101b;
    background: var(--cyan);
  }

  .side-panel__close {
    position: absolute;
    z-index: 2;
    top: 15px;
    right: 15px;
  }

  .panel-count {
    margin: 24px 0 0;
    color: #708aa1;
    font: 500 10px 'IBM Plex Mono';
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .event-list {
    display: grid;
    gap: 0;
    margin-top: 12px;
    border-top: 1px solid #263e51;
  }

  .empty-copy {
    margin-top: 28px;
    color: #829aae;
    line-height: 1.7;
  }

  .empty-state {
    display: grid;
    place-items: center;
    margin-top: 30px;
    padding: 38px 18px;
    border: 1px dashed var(--line);
    border-radius: 12px;
    text-align: center;
  }

  .empty-state > span {
    color: var(--cyan);
    font-size: 30px;
  }

  .empty-state h3 {
    margin: 15px 0 6px;
    font-weight: 500;
  }

  .empty-state p {
    max-width: 250px;
    margin: 0 0 20px;
    color: #7891a7;
    font-size: 13px;
    line-height: 1.6;
  }

  @media (max-width: 760px) {
    .side-panel {
      top: auto;
      right: 6px;
      bottom: 6px;
      left: 6px;
      width: auto;
      max-height: 58vh;
      transform: translateY(calc(100% + 30px));
    }

    .side-panel.is-open {
      transform: translateY(0);
    }
  }
</style>
