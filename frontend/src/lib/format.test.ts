import { describe, expect, it } from 'vitest';

import { eventCountLabel, eventTiming, eventWord, pulseClass } from './format';
import type { CtfEvent } from './types';

describe('Russian event plurals', () => {
  it.each([
    [1, 'ближайшее событие'],
    [2, 'ближайших события'],
    [5, 'ближайших событий'],
    [11, 'ближайших событий'],
    [21, 'ближайшее событие'],
    [24, 'ближайших события'],
    [25, 'ближайших событий'],
  ])('formats %i correctly', (count, expected) => {
    expect(eventWord(count)).toBe(expected);
  });

  it('uses a singular adjective for one CTF', () => {
    expect(eventCountLabel(1)).toBe('1 ближайший CTF');
    expect(eventCountLabel(5)).toBe('5 ближайших CTF');
  });
});

describe('event marker timing', () => {
  const event = (startsAt: string, endsAt: string) => ({ startsAt, endsAt } as CtfEvent);

  it('distinguishes an ongoing CTF from an approaching one', () => {
    const now = Date.now();
    const live = event(new Date(now - 3_600_000).toISOString(), new Date(now + 3_600_000).toISOString());
    const soon = event(new Date(now + 2 * 86_400_000).toISOString(), new Date(now + 3 * 86_400_000).toISOString());
    const calm = event(new Date(now + 30 * 86_400_000).toISOString(), new Date(now + 31 * 86_400_000).toISOString());

    expect(eventTiming(live)).toBe('live');
    expect(pulseClass(live)).toBe('marker--live');
    expect(eventTiming(soon)).toBe('soon');
    expect(eventTiming(calm)).toBe('calm');
  });
});
