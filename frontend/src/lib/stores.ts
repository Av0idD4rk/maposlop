import { writable } from 'svelte/store';
import type { CtfEvent } from './types';

export const events = writable<CtfEvent[]>([]);
export const eventsStatus = writable<'loading' | 'ready' | 'error'>('loading');
export const heatEvents = writable<CtfEvent[]>([]);
export const mapMode = writable<'events' | 'heat'>('events');
export const heatMonths = writable<number>(6);

/** Canonical (composite-merged) region id of the region currently open in the side panel. */
export const selectedRegionId = writable<string | null>(null);

/** Canonical region id -> display name, populated once the map SVG has been parsed. */
export const regionNames = writable<Map<string, string>>(new Map());

export const activeEvent = writable<CtfEvent | null>(null);
export const suggestOpen = writable<boolean>(false);
export const catalogOpen = writable<boolean>(false);
