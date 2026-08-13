import type { CtfEvent } from './types';

export function daysUntil(date: string): number {
  return Math.max(0, (new Date(date).getTime() - Date.now()) / 86400000);
}

export function dateText(date: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function shortDateText(date: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(new Date(date));
}

export function pulseClass(event: CtfEvent): string {
  if (eventTiming(event) === 'live') return 'marker--live';
  const days = daysUntil(event.startsAt);
  return days <= 3 ? 'marker--hot' : days <= 14 ? 'marker--soon' : 'marker--calm';
}

export function eventTiming(event: CtfEvent): 'live' | 'soon' | 'calm' {
  const now = Date.now();
  const start = new Date(event.startsAt).getTime();
  const end = new Date(event.endsAt).getTime();
  if (start <= now && end >= now) return 'live';
  return start > now && start - now <= 14 * 86_400_000 ? 'soon' : 'calm';
}

export function nearestLabel(event: CtfEvent): string {
  if (eventTiming(event) === 'live') return 'Идёт сейчас';
  const days = Math.ceil(daysUntil(event.startsAt));
  return days <= 0 ? 'Сегодня' : days === 1 ? 'Завтра' : `через ${days} дн.`;
}

export function eventCountLabel(count: number): string {
  return count ? `${count} ${count === 1 ? 'ближайший' : 'ближайших'} CTF` : 'Добавьте первый CTF';
}

export function eventWord(count: number): string {
  const modulo100 = Math.abs(count) % 100;
  const modulo10 = modulo100 % 10;
  if (modulo10 === 1 && modulo100 !== 11) return 'ближайшее событие';
  if (modulo10 >= 2 && modulo10 <= 4 && (modulo100 < 12 || modulo100 > 14)) {
    return 'ближайших события';
  }
  return 'ближайших событий';
}
