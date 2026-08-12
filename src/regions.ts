export type Region = {
  id: string;
  name: string;
  fragments: number;
  color: string;
};

/** A restrained, coherent blue palette for the whole map. */
export function colorForRegion(code: string): string {
  const palette = [
    '#1f64b8', '#2373c5', '#287fce', '#2b8ad5', '#2a74c3',
    '#2486cf', '#316fc0', '#2793d9', '#347fc9',
  ];
  return palette[Number(code) % palette.length];
}
