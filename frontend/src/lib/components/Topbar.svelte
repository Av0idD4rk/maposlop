<script lang="ts">
  import { List, Plus } from '@lucide/svelte';
  import { catalogOpen, events, eventsStatus, suggestOpen } from '$lib/stores';
  import { eventCountLabel } from '$lib/format';

  let statusText = $derived(
    $eventsStatus === 'loading'
      ? 'Загружаем события'
      : $eventsStatus === 'error'
        ? 'События временно недоступны'
        : eventCountLabel($events.length),
  );
</script>

<header class="topbar">
  <a class="brand" href="/" aria-label="CTF Карта — на главную">
    <span class="brand__mark" aria-hidden="true"></span>
    <span class="brand__name">Карта <strong>CTF</strong> России</span>
  </a>
  <div class="topbar__status"><span class="live-dot"></span><span>{statusText}</span></div>
  <div class="topbar__actions">
    <button
      id="catalog-button"
      class="button button--ghost"
      type="button"
      aria-label="События"
      onclick={() => catalogOpen.set(true)}
    >
      <List size={16} aria-hidden="true" />
      <span>События</span>
    </button>
    <button
      class="button button--primary"
      type="button"
      aria-label="Добавить событие"
      onclick={() => suggestOpen.set(true)}
    >
      <Plus size={16} aria-hidden="true" />
      <span>Добавить событие</span>
    </button>
  </div>
</header>

<style>
  .topbar {
    position: fixed;
    z-index: 8;
    top: 0;
    left: 0;
    right: 0;
    height: 64px;
    display: flex;
    align-items: center;
    padding-inline: clamp(18px, 3vw, 44px);
    border-bottom: 1px solid rgba(125, 177, 206, 0.27);
    background: #060b1d;
  }

  .brand {
    display: flex;
    gap: 11px;
    align-items: center;
    color: #fff;
    text-decoration: none;
    letter-spacing: 0.055em;
    font: 500 13px 'IBM Plex Mono', monospace;
  }

  .brand__mark {
    position: relative;
    display: block;
    width: 27px;
    height: 29px;
  }

  .brand__mark::before {
    content: '';
    position: absolute;
    left: 3px;
    top: 3px;
    width: 2px;
    height: 24px;
    background: #b8cbd4;
  }

  .brand__mark::after {
    content: '';
    position: absolute;
    left: 5px;
    top: 4px;
    width: 19px;
    height: 12px;
    background: #ff5a32;
    clip-path: polygon(0 0, 100% 0, 84% 50%, 100% 100%, 0 100%);
  }

  .brand__name {
    color: #dce8ee;
    letter-spacing: 0.035em;
  }

  .brand__name strong {
    color: #ff7048;
    font-weight: 600;
  }

  .topbar__status {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-left: auto;
    margin-right: 26px;
    color: #9ab1c8;
    font: 400 10px 'IBM Plex Mono';
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .live-dot {
    width: 5px;
    height: 5px;
    background: #49f3a5;
  }

  .topbar__actions {
    display: flex;
    gap: 8px;
  }

  .topbar__actions .button {
    gap: 9px;
  }

  @media (max-width: 760px) {
    .topbar {
      height: 58px;
      padding: 0 16px;
    }

    .topbar__status {
      display: none;
    }

    .brand {
      font-size: 12px;
    }

    .topbar__actions {
      margin-left: auto;
    }

    .topbar__actions .button {
      width: 44px;
      padding: 0;
    }

    .topbar__actions .button span {
      display: none;
    }
  }
</style>
