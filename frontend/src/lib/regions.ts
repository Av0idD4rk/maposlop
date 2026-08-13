/** A restrained, coherent blue palette for the whole map. */
export function colorForRegion(code: string): string {
  const palette = [
    '#1f64b8', '#2373c5', '#287fce', '#2b8ad5', '#2a74c3',
    '#2486cf', '#316fc0', '#2793d9', '#347fc9',
  ];
  return palette[Number(code) % palette.length];
}

type CompositeRegion = { id: string; members: string[]; name: string };

export const compositeRegions: CompositeRegion[] = [
  { id: '91', members: ['91', '92'], name: 'Республика Крым и Севастополь' },
  { id: '50', members: ['50', '77'], name: 'Москва и Московская область' },
  { id: '47', members: ['47', '78'], name: 'Санкт-Петербург и Ленинградская область' },
];

const compositeByMember = new Map(
  compositeRegions.flatMap((group) => group.members.map((member) => [member, group] as const)),
);

export function canonicalRegionId(id: string): string {
  return compositeByMember.get(id)?.id ?? id;
}

export function regionMembers(id: string): string[] {
  const canonical = canonicalRegionId(id);
  return compositeRegions.find((group) => group.id === canonical)?.members ?? [canonical];
}

export function compositeName(id: string): string | undefined {
  return compositeRegions.find((group) => group.id === canonicalRegionId(id))?.name;
}
