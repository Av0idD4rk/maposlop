import { k as writable } from "./server.js";
import "./index-server2.js";
//#region src/lib/stores.ts
var events = writable([]);
var eventsStatus = writable("loading");
var heatEvents = writable([]);
var mapMode = writable("events");
var heatMonths = writable(6);
/** Canonical (composite-merged) region id of the region currently open in the side panel. */
var selectedRegionId = writable(null);
/** Canonical region id -> display name, populated once the map SVG has been parsed. */
var regionNames = writable(/* @__PURE__ */ new Map());
var activeEvent = writable(null);
var suggestOpen = writable(false);
var catalogOpen = writable(false);
//#endregion
//#region src/lib/regions.ts
/** A restrained, coherent blue palette for the whole map. */
function colorForRegion(code) {
	const palette = [
		"#1f64b8",
		"#2373c5",
		"#287fce",
		"#2b8ad5",
		"#2a74c3",
		"#2486cf",
		"#316fc0",
		"#2793d9",
		"#347fc9"
	];
	return palette[Number(code) % palette.length];
}
var compositeRegions = [
	{
		id: "91",
		members: ["91", "92"],
		name: "Республика Крым и Севастополь"
	},
	{
		id: "50",
		members: ["50", "77"],
		name: "Москва и Московская область"
	},
	{
		id: "47",
		members: ["47", "78"],
		name: "Санкт-Петербург и Ленинградская область"
	}
];
var compositeByMember = new Map(compositeRegions.flatMap((group) => group.members.map((member) => [member, group])));
function canonicalRegionId(id) {
	return compositeByMember.get(id)?.id ?? id;
}
function regionMembers(id) {
	const canonical = canonicalRegionId(id);
	return compositeRegions.find((group) => group.id === canonical)?.members ?? [canonical];
}
function compositeName(id) {
	return compositeRegions.find((group) => group.id === canonicalRegionId(id))?.name;
}
//#endregion
export { activeEvent as a, eventsStatus as c, mapMode as d, regionNames as f, regionMembers as i, heatEvents as l, suggestOpen as m, colorForRegion as n, catalogOpen as o, selectedRegionId as p, compositeName as r, events as s, canonicalRegionId as t, heatMonths as u };
