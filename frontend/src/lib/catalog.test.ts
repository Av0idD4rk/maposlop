import { describe, expect, it } from 'vitest';

import { filterEvents } from './catalog';
import type { CtfEvent } from './types';

function event(overrides: Partial<CtfEvent>): CtfEvent {
  return {
    id: 1,
    title: 'Ural CTF',
    regionCode: '66',
    regionName: 'Свердловская область',
    city: 'Екатеринбург',
    venue: '',
    startsAt: '2026-08-25T01:13:00+03:00',
    endsAt: '2026-08-25T09:13:00+03:00',
    format: 'Очно',
    participationMode: 'offline',
    description: '',
    website: '',
    organizer: 'Ural Team',
    latitude: 56.838011,
    longitude: 60.597465,
    locationPrecision: 'city',
    geodataSource: '',
    geodataSourceUrl: '',
    ...overrides,
  };
}

const source = [
  event({ id: 1 }),
  event({ id: 2, title: 'Online Cup', city: '', regionName: 'Онлайн', participationMode: 'online' }),
  event({ id: 3, title: 'Siberia CTF', city: 'Новосибирск', regionCode: '54' }),
];

describe('event catalog filters', () => {
  it('searches by city, region, title and organizer without case sensitivity', () => {
    expect(filterEvents(source, 'ЕКАТЕРИНБУРГ', 'all').map(({ id }) => id)).toEqual([1]);
    expect(filterEvents(source, 'ural team', 'all').map(({ id }) => id)).toEqual([1, 2, 3]);
    expect(filterEvents(source, 'сибир', 'all').map(({ id }) => id)).toEqual([3]);
  });

  it('filters participation mode independently from search', () => {
    expect(filterEvents(source, '', 'online').map(({ id }) => id)).toEqual([2]);
    expect(filterEvents(source, 'ctf', 'offline').map(({ id }) => id)).toEqual([1, 3]);
  });
});
