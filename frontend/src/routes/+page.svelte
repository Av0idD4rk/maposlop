<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import { reloadEvents } from '$lib/event-data';
  import Topbar from '$lib/components/Topbar.svelte';
  import RegionPanel from '$lib/components/RegionPanel.svelte';
  import EventModal from '$lib/components/EventModal.svelte';
  import EventCatalog from '$lib/components/EventCatalog.svelte';
  import SuggestModal from '$lib/components/SuggestModal.svelte';

  let MapComponent = $state<Component | null>(null);
  let mapModuleError = $state(false);

  async function loadMapModule() {
    mapModuleError = false;
    try {
      MapComponent = (await import('$lib/components/MapStage.svelte')).default;
    } catch {
      mapModuleError = true;
    }
  }

  onMount(() => {
    void reloadEvents();
    void loadMapModule();
  });
</script>

<a class="skip-link" href="#catalog-button">К списку событий</a>
<main class="map-shell">
  <Topbar />
  {#if MapComponent}
    <MapComponent />
  {:else if mapModuleError}
    <div class="map-module-state" role="alert">
      <span>Карта временно недоступна.</span>
      <button class="button button--ghost" type="button" onclick={loadMapModule}>Повторить</button>
    </div>
  {:else}
    <p class="map-module-state" role="status">Загружаем карту…</p>
  {/if}
  <RegionPanel />
</main>

<EventCatalog />
<EventModal />
<SuggestModal />

<style>
  .map-shell {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background:
      radial-gradient(ellipse at 50% 52%, rgba(28, 84, 195, 0.22), transparent 48%),
      radial-gradient(circle at 7% 90%, rgba(0, 218, 255, 0.09), transparent 25rem),
      linear-gradient(135deg, #070a20, #040716 72%);
  }

  .map-shell::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.09;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: linear-gradient(to bottom, black, transparent 80%);
  }

  .map-module-state {
    position: fixed;
    z-index: 6;
    left: 50%;
    top: 50%;
    display: flex;
    gap: 12px;
    align-items: center;
    margin: 0;
    padding: 10px 13px;
    color: #91a9ba;
    background: #071025;
    font: 500 11px ui-monospace, 'SFMono-Regular', Consolas, monospace;
    transform: translate(-50%, -50%);
  }
</style>
