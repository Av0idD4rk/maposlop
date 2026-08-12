<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchEvents } from '$lib/api';
  import { events, eventsStatus } from '$lib/stores';
  import Topbar from '$lib/components/Topbar.svelte';
  import MapStage from '$lib/components/MapStage.svelte';
  import RegionPanel from '$lib/components/RegionPanel.svelte';
  import EventModal from '$lib/components/EventModal.svelte';
  import SuggestModal from '$lib/components/SuggestModal.svelte';

  onMount(() => {
    fetchEvents()
      .then((data) => {
        events.set(data);
        eventsStatus.set('ready');
      })
      .catch(() => eventsStatus.set('error'));
  });
</script>

<a class="skip-link" href="#region-panel">К информации о регионе</a>
<main class="map-shell">
  <Topbar />
  <MapStage />
  <RegionPanel />
</main>

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
</style>
