import { describe, expect, it } from 'vitest';

import { eventCountLabel, eventWord } from './format';

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
