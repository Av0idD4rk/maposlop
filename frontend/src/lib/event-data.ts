import { fetchEvents, fetchHeatEvents } from './api';
import { events, eventsStatus, heatEvents } from './stores';

export async function reloadEvents(): Promise<void> {
  eventsStatus.set('loading');
  try {
    events.set(await fetchEvents());
    eventsStatus.set('ready');
  } catch {
    eventsStatus.set('error');
  }
}

export async function loadHeatEvents(): Promise<void> {
  heatEvents.set(await fetchHeatEvents(24));
}
