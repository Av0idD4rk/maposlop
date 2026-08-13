<script lang="ts">
  import { tick } from 'svelte';
  import { Search } from '@lucide/svelte';

  import { filterEvents, type ParticipationFilter } from '$lib/catalog';
  import { reloadEvents } from '$lib/event-data';
  import { activeEvent, catalogOpen, events, eventsStatus } from '$lib/stores';
  import type { CtfEvent } from '$lib/types';
  import EventCard from './EventCard.svelte';
  import Modal from './Modal.svelte';

  let query = $state('');
  let participation = $state<ParticipationFilter>('all');
  let filtered = $derived(filterEvents($events, query, participation));

  async function openEvent(event: CtfEvent) {
    catalogOpen.set(false);
    await tick();
    activeEvent.set(event);
  }
</script>

<Modal open={$catalogOpen} labelledby="catalog-title" variant="modal--catalog" onclose={() => catalogOpen.set(false)}>
  <p class="eyebrow">БЛИЖАЙШИЕ СОРЕВНОВАНИЯ</p>
  <h2 id="catalog-title">Все события</h2>

  <div class="catalog-controls">
    <label class="catalog-search">
      <span class="sr-only">Поиск по названию, городу или региону</span>
      <Search size={17} aria-hidden="true" />
      <input bind:value={query} type="search" placeholder="Название, город или регион" />
    </label>
    <label>
      <span class="sr-only">Формат участия</span>
      <select bind:value={participation}>
        <option value="all">Все форматы</option>
        <option value="offline">Очно</option>
        <option value="online">Онлайн</option>
        <option value="hybrid">Гибрид</option>
      </select>
    </label>
  </div>

  {#if $eventsStatus === 'loading'}
    <p class="catalog-state" role="status">Загружаем события…</p>
  {:else if $eventsStatus === 'error'}
    <div class="catalog-state" role="alert">
      <p>Не удалось загрузить события.</p>
      <button class="button button--ghost" type="button" onclick={() => reloadEvents()}>Повторить</button>
    </div>
  {:else if filtered.length}
    <p class="catalog-count">Найдено: {filtered.length}</p>
    <div class="catalog-list">
      {#each filtered as event (event.id)}
        <EventCard {event} onselect={openEvent} />
      {/each}
    </div>
  {:else}
    <p class="catalog-state">Событий по выбранным условиям нет.</p>
  {/if}
</Modal>

<style>
  :global(.modal--catalog) {
    width: min(760px, calc(100vw - 28px));
  }

  .catalog-controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 170px;
    gap: 10px;
    margin-top: 26px;
  }

  .catalog-search {
    position: relative;
  }

  .catalog-search :global(svg) {
    position: absolute;
    left: 13px;
    top: 50%;
    color: #7891a7;
    transform: translateY(-50%);
    pointer-events: none;
  }

  input,
  select {
    width: 100%;
    min-height: 44px;
    border: 1px solid #304b60;
    border-radius: 4px;
    outline: none;
    color: #e4edf5;
    background: #071025;
  }

  input {
    padding: 0 13px 0 40px;
  }

  select {
    padding: 0 12px;
  }

  input:focus,
  select:focus {
    border-color: var(--cyan);
    box-shadow: 0 0 0 3px rgba(57, 231, 255, 0.08);
  }

  .catalog-count {
    margin: 22px 0 8px;
    color: #7891a7;
    font: 500 10px 'IBM Plex Mono', monospace;
    text-transform: uppercase;
  }

  .catalog-list {
    max-height: min(52vh, 480px);
    overflow: auto;
    border-top: 1px solid #263e51;
  }

  .catalog-state {
    margin: 24px 0 0;
    color: #91a9ba;
    line-height: 1.6;
  }

  .catalog-state p {
    margin: 0 0 14px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 600px) {
    .catalog-controls {
      grid-template-columns: 1fr;
    }

    .catalog-list {
      max-height: 48vh;
    }
  }
</style>
