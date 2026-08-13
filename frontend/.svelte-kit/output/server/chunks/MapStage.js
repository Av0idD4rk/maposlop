import { n as onDestroy } from "./index-server.js";
import "./internal.js";
import { E as escape_html, T as clsx, d as unsubscribe_stores, n as attr_style, o as ensure_array_like, t as attr_class, u as stringify, w as attr } from "./server.js";
import "./paths.js";
import "./regions.js";
import "three";
import "d3-geo";
import "three/addons/loaders/SVGLoader.js";
//#region src/lib/components/ZoomControls.svelte
function ZoomControls($$renderer, $$props) {
	let { onzoomin, onzoomout, onreset } = $$props;
	$$renderer.push(`<nav class="map-zoom svelte-185hpy7" aria-label="Масштаб карты"><button class="map-zoom__button svelte-185hpy7" type="button" aria-label="Увеличить">+</button> <button class="map-zoom__button svelte-185hpy7" type="button" aria-label="Сбросить масштаб">⌾</button> <button class="map-zoom__button svelte-185hpy7" type="button" aria-label="Уменьшить">−</button></nav>`);
}
//#endregion
//#region src/lib/components/MapHint.svelte
function MapHint($$renderer) {
	$$renderer.push(`<div class="map-hint svelte-179695r"><span aria-hidden="true" class="svelte-179695r">⌖</span> Перетаскивайте карту · колёсико меняет масштаб</div>`);
}
//#endregion
//#region src/lib/components/MapStage.svelte
function MapStage($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let mapAriaLabel = "Интерактивная карта регионов России. Выберите регион.";
		let markers = [];
		onDestroy(() => void 0);
		$$renderer.push(`<div class="map-stage svelte-18gr4w8" role="application" tabindex="0"${attr("aria-label", mapAriaLabel)}></div> `);
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<p class="map-status svelte-18gr4w8" role="status">Загружаем карту…</p>`);
		$$renderer.push(`<!--]--> <div class="event-markers svelte-18gr4w8" aria-label="Мероприятия на карте"><!--[-->`);
		const each_array = ensure_array_like(markers);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let marker = each_array[$$index];
			$$renderer.push(`<button${attr_class(clsx(marker.className), "svelte-18gr4w8")} type="button"${attr("aria-label", marker.ariaLabel)}${attr_style(`--flag-pulse-width:${stringify(marker.pulseWidth)};--flag-pulse-left:${stringify(marker.pulseLeft)};--flag-pulse-height:${stringify(marker.pulseHeight)};--flag-label-offset:${stringify(marker.labelOffset)}`)}><span class="event-marker__pulse svelte-18gr4w8"></span> <span class="event-marker__label svelte-18gr4w8">${escape_html(marker.label)}</span></button>`);
		}
		$$renderer.push(`<!--]--></div> `);
		ZoomControls($$renderer, {
			onzoomin: () => void 0,
			onzoomout: () => void 0,
			onreset: () => void 0
		});
		$$renderer.push(`<!----> `);
		MapHint($$renderer, {});
		$$renderer.push(`<!----> <p class="map-attribution svelte-18gr4w8"><span class="map-attribution__item svelte-18gr4w8">Границы: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer" class="svelte-18gr4w8">Natural Earth</a></span> <span class="map-attribution__separator svelte-18gr4w8">·</span> <span class="map-attribution__item svelte-18gr4w8">города: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" class="svelte-18gr4w8">© OpenStreetMap</a></span></p>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { MapStage as default };
