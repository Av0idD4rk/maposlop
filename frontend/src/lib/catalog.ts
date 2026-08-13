import type { CtfEvent } from './types';

export type ParticipationFilter = 'all' | CtfEvent['participationMode'];

export function filterEvents(
  events: CtfEvent[],
  query: string,
  participation: ParticipationFilter,
): CtfEvent[] {
  const needle = query.trim().toLocaleLowerCase('ru');
  return events.filter((event) => {
    if (participation !== 'all' && event.participationMode !== participation) return false;
    if (!needle) return true;
    return [event.title, event.city, event.regionName, event.organizer]
      .join(' ')
      .toLocaleLowerCase('ru')
      .includes(needle);
  });
}
