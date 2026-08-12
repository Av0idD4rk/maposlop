<script lang="ts">
  import Modal from './Modal.svelte';
  import { activeEvent } from '$lib/stores';
  import { dateText } from '$lib/format';

  let event = $derived($activeEvent);
</script>

<Modal open={event !== null} labelledby="event-modal-title" onclose={() => activeEvent.set(null)}>
  {#if event}
    <p class="eyebrow">{event.regionName} · {event.format}</p>
    <h2 id="event-modal-title">{event.title}</h2>
    <div class="event-meta">
      <div><span>СТАРТ</span><strong>{dateText(event.startsAt)}</strong></div>
      <div><span>МЕСТО</span><strong>{[event.city, event.venue].filter(Boolean).join(', ') || 'Онлайн'}</strong></div>
    </div>
    <p class="event-description">{event.description}</p>
    {#if event.organizer}
      <p class="organizer">Организатор: {event.organizer}</p>
    {/if}
    {#if event.website}
      <a class="button button--primary button--wide" href={event.website} target="_blank" rel="noopener">
        Перейти к регистрации <span>↗</span>
      </a>
    {/if}
  {/if}
</Modal>

<style>
  .event-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    overflow: hidden;
    margin: 30px 0 24px;
    border: 1px solid #2d485d;
    border-radius: 10px;
  }

  .event-meta div {
    padding: 16px;
    border-right: 1px solid #2d485d;
  }

  .event-meta div:last-child {
    border-right: 0;
  }

  .event-meta span {
    display: block;
    margin-bottom: 8px;
    color: #688399;
    font: 600 9px 'IBM Plex Mono';
  }

  .event-meta strong {
    font-size: 13px;
    font-weight: 500;
  }

  .event-description {
    margin: 0;
    color: #b0c4d4;
    font-size: 14px;
    line-height: 1.75;
    white-space: pre-line;
  }

  .organizer {
    margin: 18px 0 0;
    color: #6f879b;
    font-size: 12px;
  }

  @media (max-width: 760px) {
    .event-meta {
      grid-template-columns: 1fr;
    }
  }
</style>
