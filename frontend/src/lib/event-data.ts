import { fetchEvents } from './api';
import { events, eventsStatus } from './stores';

export async function reloadEvents(): Promise<void> {
  eventsStatus.set('loading');
  try {
    events.set(await fetchEvents());
    eventsStatus.set('ready');
  } catch {
    eventsStatus.set('error');
  }
}
