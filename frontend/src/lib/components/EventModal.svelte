<script lang="ts">
  import Modal from './Modal.svelte';
  import { activeEvent } from '$lib/stores';
  import { dateText } from '$lib/format';
  import { canPlanTrip, yandexFoodUrl, yandexHotelsUrl, yandexRouteUrl } from '$lib/travel';

  let event = $derived($activeEvent);
</script>

<Modal open={event !== null} labelledby="event-modal-title" onclose={() => activeEvent.set(null)}>
  {#if event}
    <p class="eyebrow">{event.regionName} · {event.format}</p>
    <h2 id="event-modal-title">{event.title}</h2>
    <div class="event-meta">
      <div><span>СТАРТ</span><strong>{dateText(event.startsAt)}</strong></div>
      <div>
        <span>МЕСТО</span>
        <strong>{[event.city, event.venue].filter(Boolean).join(', ') || 'Онлайн'}</strong>
        {#if event.city && event.locationPrecision === 'region'}
          <small>Точная точка города пока не проверена</small>
        {/if}
      </div>
    </div>
    <p class="event-description">{event.description}</p>
    {#if event.organizer}
      <p class="organizer">Организатор: {event.organizer}</p>
    {/if}
    {#if event.geodataSource && event.geodataSourceUrl}
      <p class="geodata-source">
        Координаты: <a href={event.geodataSourceUrl} target="_blank" rel="noopener noreferrer">{event.geodataSource}</a>
      </p>
    {/if}
    {#if canPlanTrip(event)}
      <section class="trip-tools" aria-labelledby="trip-tools-title">
        <div>
          <p class="trip-tools__eyebrow">ОЧНАЯ ПОЕЗДКА</p>
          <h3 id="trip-tools-title">Спланировать поездку</h3>
        </div>
        <div class="trip-tools__actions">
          <a href={yandexHotelsUrl(event)} target="_blank" rel="noopener noreferrer">Отели</a>
          <a href={yandexRouteUrl(event)} target="_blank" rel="noopener noreferrer">Маршрут</a>
          <a href={yandexFoodUrl(event)} target="_blank" rel="noopener noreferrer">Еда рядом</a>
        </div>
        <p>Цены, наличие и маршруты определяет Яндекс. Ссылки открываются только по вашему действию.</p>
      </section>
    {/if}
    {#if event.website}
      <a class="button button--primary button--wide registration-link" href={event.website} target="_blank" rel="noopener noreferrer">
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
    display: block;
    font-size: 13px;
    font-weight: 500;
  }

  .event-meta small {
    display: block;
    margin-top: 7px;
    color: #ffb08f;
    font-size: 10px;
    line-height: 1.4;
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

  .geodata-source {
    margin: 8px 0 0;
    color: #6f879b;
    font-size: 10px;
  }

  .geodata-source a {
    color: #91c5d2;
  }

  .trip-tools {
    margin-top: 24px;
    padding: 18px 0;
    border-top: 1px solid #2d485d;
    border-bottom: 1px solid #2d485d;
  }

  .trip-tools__eyebrow {
    margin: 0 0 5px;
    color: var(--cyan);
    font: 600 9px 'IBM Plex Mono', monospace;
    letter-spacing: 0.08em;
  }

  .trip-tools h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
  }

  .trip-tools__actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 15px;
  }

  .trip-tools__actions a {
    display: grid;
    min-height: 44px;
    place-items: center;
    padding: 8px;
    border: 1px solid #365268;
    color: #dffbff;
    text-align: center;
    text-decoration: none;
    font: 500 10px 'IBM Plex Mono', monospace;
  }

  .trip-tools__actions a:hover,
  .trip-tools__actions a:focus-visible {
    border-color: var(--cyan);
    color: #031018;
    background: var(--cyan);
    outline: none;
  }

  .trip-tools > p:last-child {
    margin: 12px 0 0;
    color: #688399;
    font-size: 10px;
    line-height: 1.5;
  }

  .registration-link {
    margin-top: 24px;
  }

  @media (max-width: 760px) {
    .event-meta {
      grid-template-columns: 1fr;
    }

    .trip-tools__actions {
      grid-template-columns: 1fr;
    }
  }
</style>
