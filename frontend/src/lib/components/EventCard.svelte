<script lang="ts">
  import type { CtfEvent } from '$lib/types';
  import { dateText, shortDateText } from '$lib/format';

  let { event, onselect }: { event: CtfEvent; onselect: (event: CtfEvent) => void } = $props();
</script>

<button class="event-card" type="button" onclick={() => onselect(event)}>
  <span class="event-card__date">{shortDateText(event.startsAt)}</span>
  <span>
    <strong>{event.title}</strong>
    <small>{event.city || event.format} · {dateText(event.startsAt)}</small>
  </span>
  <b>→</b>
</button>

<style>
  .event-card {
    display: grid;
    grid-template-columns: 48px 1fr auto;
    gap: 12px;
    align-items: center;
    width: 100%;
    padding: 15px 10px;
    border: 0;
    border-bottom: 1px solid #263e51;
    color: #eaf8ff;
    text-align: left;
    background: transparent;
    cursor: pointer;
    transition: color 0.12s ease, background 0.12s ease;
  }

  .event-card:hover {
    background: #0d1a33;
  }

  .event-card__date {
    display: grid;
    place-items: center;
    color: var(--cyan);
    font: 600 10px 'IBM Plex Mono';
    text-transform: uppercase;
  }

  .event-card strong {
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
    font-weight: 500;
  }

  .event-card small {
    display: block;
    color: #7891a7;
    font-size: 10px;
    font-family: 'IBM Plex Mono', monospace;
  }

  .event-card b {
    color: var(--cyan);
  }
</style>
