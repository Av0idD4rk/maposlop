import { r as tick } from "../../chunks/index-server.js";
import { E as escape_html, T as clsx, a as element, c as spread_props, d as unsubscribe_stores, g as getContext, i as derived, l as store_get, o as ensure_array_like, r as attributes, t as attr_class, u as stringify, w as attr } from "../../chunks/server.js";
import { a as activeEvent, c as eventsStatus, d as mapMode, f as regionNames, l as heatEvents, m as suggestOpen, o as catalogOpen, p as selectedRegionId, s as events, t as canonicalRegionId, u as heatMonths } from "../../chunks/regions.js";
//#endregion
//#region node_modules/@lucide/svelte/dist/defaultAttributes.js
/**
* @file
* @license @lucide/svelte v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var defaultAttributes = {
	xmlns: "http://www.w3.org/2000/svg",
	width: 24,
	height: 24,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	"stroke-width": 2,
	"stroke-linecap": "round",
	"stroke-linejoin": "round"
};
//#endregion
//#region node_modules/@lucide/svelte/dist/utils/hasA11yProp.js
/**
* @file
* @license @lucide/svelte v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
/**
* Check if a component has an accessibility prop
*
* @param {object} props
* @returns {boolean} Whether the component has an accessibility prop
*/
var hasA11yProp = (props) => {
	for (const prop in props) if (prop.startsWith("aria-") || prop === "role" || prop === "title") return true;
	return false;
};
//#endregion
//#region node_modules/@lucide/svelte/dist/context.js
/**
* @file
* @license @lucide/svelte v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var LucideContext = Symbol("lucide-context");
var getLucideContext = () => getContext(LucideContext);
//#endregion
//#region node_modules/@lucide/svelte/dist/Icon.svelte
function Icon($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const globalProps = getLucideContext() ?? {};
		const { name, color = globalProps.color ?? "currentColor", size = globalProps.size ?? 24, strokeWidth = globalProps.strokeWidth ?? 2, absoluteStrokeWidth = globalProps.absoluteStrokeWidth ?? false, iconNode = [], children, $$slots, $$events, ...props } = $$props;
		const calculatedStrokeWidth = derived(() => absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth);
		$$renderer.push(`<svg${attributes({
			...defaultAttributes,
			...!children && !hasA11yProp(props) && { "aria-hidden": "true" },
			...props,
			width: size,
			height: size,
			stroke: color,
			"stroke-width": calculatedStrokeWidth(),
			class: clsx([
				"lucide-icon lucide",
				globalProps.class,
				name && `lucide-${name}`,
				props.class
			])
		}, void 0, void 0, void 0, 3)}><!--[-->`);
		const each_array = ensure_array_like(iconNode);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let [tag, attrs] = each_array[$$index];
			element($$renderer, tag, () => {
				$$renderer.push(`${attributes({ ...attrs }, void 0, void 0, void 0, 3)}`);
			});
		}
		$$renderer.push(`<!--]-->`);
		children?.($$renderer);
		$$renderer.push(`<!----></svg>`);
	});
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/list.svelte
function List($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "list" },
		props,
		{ iconNode: [
			["path", { "d": "M3 5h.01" }],
			["path", { "d": "M3 12h.01" }],
			["path", { "d": "M3 19h.01" }],
			["path", { "d": "M8 5h13" }],
			["path", { "d": "M8 12h13" }],
			["path", { "d": "M8 19h13" }]
		] }
	]));
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/plus.svelte
function Plus($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "plus" },
		props,
		{ iconNode: [["path", { "d": "M5 12h14" }], ["path", { "d": "M12 5v14" }]] }
	]));
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/search.svelte
function Search($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "search" },
		props,
		{ iconNode: [["path", { "d": "m21 21-4.34-4.34" }], ["circle", {
			"cx": "11",
			"cy": "11",
			"r": "8"
		}]] }
	]));
}
//#endregion
//#region src/lib/format.ts
function dateText(date) {
	return new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "long",
		hour: "2-digit",
		minute: "2-digit"
	}).format(new Date(date));
}
function shortDateText(date) {
	return new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		month: "short"
	}).format(new Date(date));
}
function eventCountLabel(count) {
	return count ? `${count} ${count === 1 ? "ближайший" : "ближайших"} CTF` : "Добавьте первый CTF";
}
function eventWord(count) {
	const modulo100 = Math.abs(count) % 100;
	const modulo10 = modulo100 % 10;
	if (modulo10 === 1 && modulo100 !== 11) return "ближайшее событие";
	if (modulo10 >= 2 && modulo10 <= 4 && (modulo100 < 12 || modulo100 > 14)) return "ближайших события";
	return "ближайших событий";
}
//#endregion
//#region src/lib/components/Topbar.svelte
function Topbar($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let statusText = derived(() => store_get($$store_subs ??= {}, "$eventsStatus", eventsStatus) === "loading" ? "Загружаем события" : store_get($$store_subs ??= {}, "$eventsStatus", eventsStatus) === "error" ? "События временно недоступны" : eventCountLabel(store_get($$store_subs ??= {}, "$events", events).length));
		$$renderer.push(`<header class="topbar svelte-h6bux4"><a class="brand svelte-h6bux4" href="/" aria-label="CTF Карта — на главную"><span class="brand__mark svelte-h6bux4" aria-hidden="true"></span> <span class="brand__name svelte-h6bux4">Карта <strong class="svelte-h6bux4">CTF</strong> России</span></a> <div class="topbar__status svelte-h6bux4"><span class="live-dot svelte-h6bux4"></span><span>${escape_html(statusText())}</span></div> <div class="topbar__actions svelte-h6bux4"><button id="catalog-button" class="button button--ghost svelte-h6bux4" type="button" aria-label="События">`);
		List($$renderer, {
			size: 16,
			"aria-hidden": "true"
		});
		$$renderer.push(`<!----> <span class="svelte-h6bux4">События</span></button> <button class="button button--primary svelte-h6bux4" type="button" aria-label="Добавить событие">`);
		Plus($$renderer, {
			size: 16,
			"aria-hidden": "true"
		});
		$$renderer.push(`<!----> <span class="svelte-h6bux4">Добавить событие</span></button></div></header>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/EventCard.svelte
function EventCard($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { event, onselect } = $$props;
		$$renderer.push(`<button class="event-card svelte-14fxf3u" type="button"><span class="event-card__date svelte-14fxf3u">${escape_html(shortDateText(event.startsAt))}</span> <span><strong class="svelte-14fxf3u">${escape_html(event.title)}</strong> <small class="svelte-14fxf3u">${escape_html(event.city || event.format)} · ${escape_html(dateText(event.startsAt))}</small></span> <b class="svelte-14fxf3u">→</b></button>`);
	});
}
//#endregion
//#region src/lib/components/RegionPanel.svelte
function RegionPanel($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let canonical = derived(() => store_get($$store_subs ??= {}, "$selectedRegionId", selectedRegionId));
		let isOpen = derived(() => canonical() !== null);
		let title = derived(() => canonical() ? store_get($$store_subs ??= {}, "$regionNames", regionNames).get(canonical()) ?? `Регион ${canonical()}` : "Где играем?");
		let items = derived(() => {
			if (!canonical()) return [];
			if (store_get($$store_subs ??= {}, "$mapMode", mapMode) === "events") return store_get($$store_subs ??= {}, "$events", events).filter((event) => canonicalRegionId(event.regionCode) === canonical());
			const now = Date.now();
			const cutoff = now - store_get($$store_subs ??= {}, "$heatMonths", heatMonths) * 31 * 864e5;
			return store_get($$store_subs ??= {}, "$heatEvents", heatEvents).filter((event) => {
				const started = new Date(event.startsAt).getTime();
				return canonicalRegionId(event.regionCode) === canonical() && started >= cutoff && started <= now;
			}).sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
		});
		function openEvent(event) {
			activeEvent.set(event);
		}
		$$renderer.push(`<aside${attr_class("side-panel svelte-1d2c71a", void 0, { "is-open": isOpen() })} id="region-panel" aria-live="polite" aria-labelledby="panel-title"><button class="icon-button side-panel__close svelte-1d2c71a" type="button" aria-label="Закрыть">×</button> <p class="eyebrow">${escape_html(canonical() ? store_get($$store_subs ??= {}, "$mapMode", mapMode) === "heat" ? "ИСТОРИЯ РЕГИОНА" : "ВЫБРАННЫЙ РЕГИОН" : "ВЫБЕРИТЕ РЕГИОН")}</p> <h2 id="panel-title" class="svelte-1d2c71a">${escape_html(title())}</h2> <div class="panel-content">`);
		if (!canonical()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<p class="empty-copy svelte-1d2c71a">Нажмите на регион карты, чтобы увидеть ближайшие CTF.</p>`);
		} else if (items().length) {
			$$renderer.push("<!--[1-->");
			$$renderer.push(`<p class="panel-count svelte-1d2c71a">${escape_html(items().length)} ${escape_html(eventWord(items().length))}${escape_html(store_get($$store_subs ??= {}, "$mapMode", mapMode) === "heat" ? ` · за ${store_get($$store_subs ??= {}, "$heatMonths", heatMonths)} мес.` : "")}</p> <div class="event-list svelte-1d2c71a"><!--[-->`);
			const each_array = ensure_array_like(items());
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let event = each_array[$$index];
				EventCard($$renderer, {
					event,
					onselect: openEvent
				});
			}
			$$renderer.push(`<!--]--></div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="empty-state svelte-1d2c71a"><span class="svelte-1d2c71a">⚑</span> <h3 class="svelte-1d2c71a">${escape_html(store_get($$store_subs ??= {}, "$mapMode", mapMode) === "heat" ? "Нет истории" : "Пока тихо")}</h3> <p class="svelte-1d2c71a">${escape_html(store_get($$store_subs ??= {}, "$mapMode", mapMode) === "heat" ? `За последние ${store_get($$store_subs ??= {}, "$heatMonths", heatMonths)} мес. прошедших CTF не найдено.` : "В этом регионе нет опубликованных CTF. Знаете о событии?")}</p> `);
			if (store_get($$store_subs ??= {}, "$mapMode", mapMode) === "events") {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<button class="button button--ghost" type="button">Предложить CTF</button>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div>`);
		}
		$$renderer.push(`<!--]--></div></aside>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/Modal.svelte
function Modal($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open, labelledby, variant = "", onclose, children } = $$props;
		$$renderer.push(`<dialog${attr_class(`modal ${stringify(variant)}`, "svelte-ta60gp")}${attr("aria-labelledby", labelledby)}><button class="icon-button modal__close svelte-ta60gp" type="button" aria-label="Закрыть">×</button> `);
		children($$renderer);
		$$renderer.push(`<!----></dialog>`);
	});
}
//#endregion
//#region src/lib/travel.ts
function mapsSearchUrl(event, query) {
	const params = new URLSearchParams({
		mode: "search",
		text: query
	});
	if (event.latitude !== null && event.longitude !== null) {
		params.set("ll", `${event.longitude},${event.latitude}`);
		params.set("z", "13");
	}
	return `https://yandex.ru/maps/?${params.toString()}`;
}
function yandexHotelsUrl(event) {
	return mapsSearchUrl(event, `гостиницы и хостелы рядом, ${event.city}`);
}
function yandexFoodUrl(event) {
	return mapsSearchUrl(event, `кафе и рестораны рядом, ${event.city}`);
}
function yandexRouteUrl(event) {
	if (event.latitude !== null && event.longitude !== null) return `https://yandex.ru/maps/?mode=routes&rtext=~${encodeURIComponent(`${event.latitude},${event.longitude}`)}&rtt=auto`;
	return mapsSearchUrl(event, event.city);
}
function canPlanTrip(event) {
	return event.participationMode !== "online" && Boolean(event.city);
}
//#endregion
//#region src/lib/components/EventModal.svelte
function EventModal($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let event = derived(() => store_get($$store_subs ??= {}, "$activeEvent", activeEvent));
		Modal($$renderer, {
			open: event() !== null,
			labelledby: "event-modal-title",
			onclose: () => activeEvent.set(null),
			children: ($$renderer) => {
				if (event()) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<p class="eyebrow">${escape_html(event().regionName)} · ${escape_html(event().format)}</p> <h2 id="event-modal-title">${escape_html(event().title)}</h2> <div class="event-meta svelte-18033iz"><div class="svelte-18033iz"><span class="svelte-18033iz">СТАРТ</span><strong class="svelte-18033iz">${escape_html(dateText(event().startsAt))}</strong></div> <div class="svelte-18033iz"><span class="svelte-18033iz">МЕСТО</span> <strong class="svelte-18033iz">${escape_html([event().city, event().venue].filter(Boolean).join(", ") || "Онлайн")}</strong> `);
					if (event().city && event().locationPrecision === "region") {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<small class="svelte-18033iz">Точная точка города пока не проверена</small>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--></div></div> <p class="event-description svelte-18033iz">${escape_html(event().description)}</p> `);
					if (event().organizer) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<p class="organizer svelte-18033iz">Организатор: ${escape_html(event().organizer)}</p>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> `);
					if (event().geodataSource && event().geodataSourceUrl) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<p class="geodata-source svelte-18033iz">Координаты: <a${attr("href", event().geodataSourceUrl)} target="_blank" rel="noopener noreferrer" class="svelte-18033iz">${escape_html(event().geodataSource)}</a></p>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> `);
					if (canPlanTrip(event())) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<section class="trip-tools svelte-18033iz" aria-labelledby="trip-tools-title"><div><p class="trip-tools__eyebrow svelte-18033iz">ОЧНАЯ ПОЕЗДКА</p> <h3 id="trip-tools-title" class="svelte-18033iz">Спланировать поездку</h3></div> <div class="trip-tools__actions svelte-18033iz"><a${attr("href", yandexHotelsUrl(event()))} target="_blank" rel="noopener noreferrer" class="svelte-18033iz">Отели</a> <a${attr("href", yandexRouteUrl(event()))} target="_blank" rel="noopener noreferrer" class="svelte-18033iz">Маршрут</a> <a${attr("href", yandexFoodUrl(event()))} target="_blank" rel="noopener noreferrer" class="svelte-18033iz">Еда рядом</a></div> <p class="svelte-18033iz">Цены, наличие и маршруты определяет Яндекс. Ссылки открываются только по вашему действию.</p></section>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> `);
					if (event().website) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<a class="button button--primary button--wide registration-link svelte-18033iz"${attr("href", event().website)} target="_blank" rel="noopener noreferrer">Перейти к регистрации <span>↗</span></a>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]-->`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]-->`);
			},
			$$slots: { default: true }
		});
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/catalog.ts
function filterEvents(events, query, participation) {
	const needle = query.trim().toLocaleLowerCase("ru");
	return events.filter((event) => {
		if (participation !== "all" && event.participationMode !== participation) return false;
		if (!needle) return true;
		return [
			event.title,
			event.city,
			event.regionName,
			event.organizer
		].join(" ").toLocaleLowerCase("ru").includes(needle);
	});
}
//#endregion
//#region src/lib/components/EventCatalog.svelte
function EventCatalog($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let query = "";
		let participation = "all";
		let filtered = derived(() => filterEvents(store_get($$store_subs ??= {}, "$events", events), query, participation));
		async function openEvent(event) {
			catalogOpen.set(false);
			await tick();
			activeEvent.set(event);
		}
		Modal($$renderer, {
			open: store_get($$store_subs ??= {}, "$catalogOpen", catalogOpen),
			labelledby: "catalog-title",
			variant: "modal--catalog",
			onclose: () => catalogOpen.set(false),
			children: ($$renderer) => {
				$$renderer.push(`<p class="eyebrow">БЛИЖАЙШИЕ СОРЕВНОВАНИЯ</p> <h2 id="catalog-title">Все события</h2> <div class="catalog-controls svelte-83abeh"><label class="catalog-search svelte-83abeh"><span class="sr-only svelte-83abeh">Поиск по названию, городу или региону</span> `);
				Search($$renderer, {
					size: 17,
					"aria-hidden": "true"
				});
				$$renderer.push(`<!----> <input${attr("value", query)} type="search" placeholder="Название, город или регион" class="svelte-83abeh"/></label> <label><span class="sr-only svelte-83abeh">Формат участия</span> `);
				$$renderer.select({
					value: participation,
					class: ""
				}, ($$renderer) => {
					$$renderer.option({ value: "all" }, ($$renderer) => {
						$$renderer.push(`Все форматы`);
					});
					$$renderer.option({ value: "offline" }, ($$renderer) => {
						$$renderer.push(`Очно`);
					});
					$$renderer.option({ value: "online" }, ($$renderer) => {
						$$renderer.push(`Онлайн`);
					});
					$$renderer.option({ value: "hybrid" }, ($$renderer) => {
						$$renderer.push(`Гибрид`);
					});
				}, "svelte-83abeh");
				$$renderer.push(`</label></div> `);
				if (store_get($$store_subs ??= {}, "$eventsStatus", eventsStatus) === "loading") {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<p class="catalog-state svelte-83abeh" role="status">Загружаем события…</p>`);
				} else if (store_get($$store_subs ??= {}, "$eventsStatus", eventsStatus) === "error") {
					$$renderer.push("<!--[1-->");
					$$renderer.push(`<div class="catalog-state svelte-83abeh" role="alert"><p class="svelte-83abeh">Не удалось загрузить события.</p> <button class="button button--ghost" type="button">Повторить</button></div>`);
				} else if (filtered().length) {
					$$renderer.push("<!--[2-->");
					$$renderer.push(`<p class="catalog-count svelte-83abeh">Найдено: ${escape_html(filtered().length)}</p> <div class="catalog-list svelte-83abeh"><!--[-->`);
					const each_array = ensure_array_like(filtered());
					for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
						let event = each_array[$$index];
						EventCard($$renderer, {
							event,
							onselect: openEvent
						});
					}
					$$renderer.push(`<!--]--></div>`);
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`<p class="catalog-state svelte-83abeh">Событий по выбранным условиям нет.</p>`);
				}
				$$renderer.push(`<!--]-->`);
			},
			$$slots: { default: true }
		});
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/SuggestModal.svelte
function SuggestModal($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let title = "";
		let regionCode = "";
		let city = "";
		let startsAt = "";
		let endsAt = "";
		let website = "";
		let details = "";
		let contactName = "";
		let contactEmail = "";
		let company = "";
		let submitting = false;
		let status = "";
		let regionOptions = derived(() => [...store_get($$store_subs ??= {}, "$regionNames", regionNames)].sort((a, b) => a[1].localeCompare(b[1], "ru")));
		Modal($$renderer, {
			open: store_get($$store_subs ??= {}, "$suggestOpen", suggestOpen),
			labelledby: "suggest-title",
			variant: "modal--form",
			onclose: () => suggestOpen.set(false),
			children: ($$renderer) => {
				$$renderer.push(`<p class="eyebrow">ПОМОГИТЕ КАРТЕ СТАТЬ ПОЛНЕЕ</p> <h2 id="suggest-title">Предложить CTF</h2> <p class="modal__lead">Пришлите основные данные. Администратор проверит их перед публикацией.</p> <form class="suggest-form svelte-6wg50t"><label class="form-honeypot svelte-6wg50t" aria-hidden="true"><span class="svelte-6wg50t">Компания</span> <input${attr("value", company)} tabindex="-1" autocomplete="off" class="svelte-6wg50t"/></label> <label class="svelte-6wg50t"><span class="svelte-6wg50t">Название *</span> <input${attr("value", title)} maxlength="160" required="" placeholder="Например, ByteTheFlag 2026" class="svelte-6wg50t"/></label> <label class="svelte-6wg50t"><span class="svelte-6wg50t">Регион *</span> `);
				$$renderer.select({
					value: regionCode,
					required: true,
					class: ""
				}, ($$renderer) => {
					$$renderer.option({ value: "" }, ($$renderer) => {
						$$renderer.push(`Выберите регион`);
					});
					$$renderer.push(`<!--[-->`);
					const each_array = ensure_array_like(regionOptions());
					for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
						let [id, name] = each_array[$$index];
						$$renderer.option({ value: id }, ($$renderer) => {
							$$renderer.push(`${escape_html(name)}`);
						});
					}
					$$renderer.push(`<!--]-->`);
				}, "svelte-6wg50t");
				$$renderer.push(`</label> <label class="svelte-6wg50t"><span class="svelte-6wg50t">Город</span><input${attr("value", city)} maxlength="120" placeholder="Москва" class="svelte-6wg50t"/></label> <fieldset class="participation-mode svelte-6wg50t"><legend class="svelte-6wg50t">Формат участия *</legend> <label class="svelte-6wg50t"><input type="radio"${attr("checked", true, true)} value="offline" class="svelte-6wg50t"/><span class="svelte-6wg50t">Очно</span></label> <label class="svelte-6wg50t"><input type="radio"${attr("checked", false, true)} value="hybrid" class="svelte-6wg50t"/><span class="svelte-6wg50t">Гибрид</span></label> <label class="svelte-6wg50t"><input type="radio"${attr("checked", false, true)} value="online" class="svelte-6wg50t"/><span class="svelte-6wg50t">Удалённо</span></label></fieldset> <div class="form-row svelte-6wg50t"><label class="svelte-6wg50t"><span class="svelte-6wg50t">Начало *</span><input type="datetime-local"${attr("value", startsAt)} required="" class="svelte-6wg50t"/></label> <label class="svelte-6wg50t"><span class="svelte-6wg50t">Окончание</span><input type="datetime-local"${attr("value", endsAt)} class="svelte-6wg50t"/></label></div> <label class="svelte-6wg50t"><span class="svelte-6wg50t">Ссылка</span><input type="url"${attr("value", website)} placeholder="https://…" class="svelte-6wg50t"/></label> <label class="svelte-6wg50t"><span class="svelte-6wg50t">Что важно знать *</span> <textarea rows="4" required="" placeholder="Формат, участники, регистрация…" class="svelte-6wg50t">`);
				const $$body = escape_html(details);
				if ($$body) $$renderer.push(`${$$body}`);
				$$renderer.push(`</textarea></label> <div class="form-row svelte-6wg50t"><label class="svelte-6wg50t"><span class="svelte-6wg50t">Ваше имя *</span><input${attr("value", contactName)} maxlength="120" required="" class="svelte-6wg50t"/></label> <label class="svelte-6wg50t"><span class="svelte-6wg50t">Email *</span><input type="email"${attr("value", contactEmail)} required="" class="svelte-6wg50t"/></label></div> <p${attr_class("form-status svelte-6wg50t", void 0, {
					"is-success": false,
					"is-error": false
				})} role="status">${escape_html(status)}</p> <button class="button button--primary button--wide" type="submit"${attr("disabled", submitting, true)}>Отправить на проверку <span>→</span></button></form>`);
			},
			$$slots: { default: true }
		});
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/HeatMapControls.svelte
function HeatMapControls($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		$$renderer.push(`<section${attr_class("heat-controls svelte-yxd43e", void 0, { "is-heat": store_get($$store_subs ??= {}, "$mapMode", mapMode) === "heat" })} aria-label="Режим карты"><div class="mode-switch svelte-yxd43e" role="group" aria-label="Отображение карты"><button type="button"${attr_class("svelte-yxd43e", void 0, { "active": store_get($$store_subs ??= {}, "$mapMode", mapMode) === "events" })}>События</button> <button type="button"${attr_class("svelte-yxd43e", void 0, { "active": store_get($$store_subs ??= {}, "$mapMode", mapMode) === "heat" })}>Heat map</button></div> `);
		if (store_get($$store_subs ??= {}, "$mapMode", mapMode) === "heat") {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="heat-range svelte-yxd43e"><div class="svelte-yxd43e"><span>Активность за период</span><strong class="svelte-yxd43e">Последние ${escape_html(store_get($$store_subs ??= {}, "$heatMonths", heatMonths))} мес.</strong></div> <input aria-label="Количество последних месяцев" type="range" min="1" max="24" step="1"${attr("value", store_get($$store_subs ??= {}, "$heatMonths", heatMonths))} class="svelte-yxd43e"/> <div class="heat-legend svelte-yxd43e" aria-hidden="true"><span>Меньше</span><i class="svelte-yxd43e"></i><span>Больше</span></div></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></section>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/routes/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		$$renderer.push(`<a class="skip-link" href="#catalog-button">К списку событий</a> <main${attr_class("map-shell svelte-1uha8ag", void 0, { "is-heat": store_get($$store_subs ??= {}, "$mapMode", mapMode) === "heat" })}>`);
		Topbar($$renderer, {});
		$$renderer.push(`<!----> `);
		HeatMapControls($$renderer, {});
		$$renderer.push(`<!----> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<p class="map-module-state svelte-1uha8ag" role="status">Загружаем карту…</p>`);
		$$renderer.push(`<!--]--> `);
		RegionPanel($$renderer, {});
		$$renderer.push(`<!----></main> `);
		EventCatalog($$renderer, {});
		$$renderer.push(`<!----> `);
		EventModal($$renderer, {});
		$$renderer.push(`<!----> `);
		SuggestModal($$renderer, {});
		$$renderer.push(`<!---->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _page as default };
