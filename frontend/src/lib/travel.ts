import type { CtfEvent } from './types';

function mapsSearchUrl(event: CtfEvent, query: string): string {
  const params = new URLSearchParams({ mode: 'search', text: query });
  if (event.latitude !== null && event.longitude !== null) {
    params.set('ll', `${event.longitude},${event.latitude}`);
    params.set('z', '13');
  }
  return `https://yandex.ru/maps/?${params.toString()}`;
}

export function yandexHotelsUrl(event: CtfEvent): string {
  return mapsSearchUrl(event, `гостиницы и хостелы рядом, ${event.city}`);
}

export function yandexFoodUrl(event: CtfEvent): string {
  return mapsSearchUrl(event, `кафе и рестораны рядом, ${event.city}`);
}

export function yandexRouteUrl(event: CtfEvent): string {
  if (event.latitude !== null && event.longitude !== null) {
    const destination = encodeURIComponent(`${event.latitude},${event.longitude}`);
    return `https://yandex.ru/maps/?mode=routes&rtext=~${destination}&rtt=auto`;
  }
  return mapsSearchUrl(event, event.city);
}

export function canPlanTrip(event: CtfEvent): boolean {
  return event.participationMode !== 'online' && Boolean(event.city);
}
