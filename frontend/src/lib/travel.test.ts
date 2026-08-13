import { describe, expect, it } from 'vitest';

import { canPlanTrip, yandexFoodUrl, yandexHotelsUrl, yandexRouteUrl } from './travel';
import type { CtfEvent } from './types';

const event: CtfEvent = {
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
  organizer: '',
  latitude: 56.838011,
  longitude: 60.597465,
  locationPrecision: 'city',
  geodataSource: 'OpenStreetMap contributors / Nominatim',
  geodataSourceUrl: 'https://www.openstreetmap.org/relation/79374',
};

describe('Yandex travel links', () => {
  it('centers hotel and food searches on the event city coordinates', () => {
    const hotels = new URL(yandexHotelsUrl(event));
    const food = new URL(yandexFoodUrl(event));

    expect(hotels.origin).toBe('https://yandex.ru');
    expect(hotels.pathname).toBe('/maps/');
    expect(hotels.searchParams.get('mode')).toBe('search');
    expect(hotels.searchParams.get('text')).toContain('Екатеринбург');
    expect(hotels.searchParams.get('ll')).toBe('60.597465,56.838011');
    expect(hotels.searchParams.get('z')).toBe('13');
    expect(food.searchParams.get('text')).toContain('кафе и рестораны');
    expect(food.searchParams.get('ll')).toBe('60.597465,56.838011');
  });

  it('builds a route with latitude and longitude in Yandex rtext order', () => {
    const route = new URL(yandexRouteUrl(event));

    expect(route.searchParams.get('mode')).toBe('routes');
    expect(route.searchParams.get('rtext')).toBe('~56.838011,60.597465');
    expect(route.searchParams.get('rtt')).toBe('auto');
  });

  it('falls back to a city search when exact coordinates are unavailable', () => {
    const approximate = { ...event, latitude: null, longitude: null, locationPrecision: 'region' as const };
    const route = new URL(yandexRouteUrl(approximate));

    expect(route.searchParams.get('mode')).toBe('search');
    expect(route.searchParams.get('text')).toBe('Екатеринбург');
    expect(route.searchParams.has('ll')).toBe(false);
  });
});

describe('trip availability', () => {
  it('is enabled for onsite and hybrid events with a city', () => {
    expect(canPlanTrip(event)).toBe(true);
    expect(canPlanTrip({ ...event, participationMode: 'hybrid' })).toBe(true);
  });

  it('is disabled for online events and events without a city', () => {
    expect(canPlanTrip({ ...event, participationMode: 'online' })).toBe(false);
    expect(canPlanTrip({ ...event, city: '' })).toBe(false);
  });
});
