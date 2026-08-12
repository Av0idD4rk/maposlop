import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { colorForRegion } from './regions';
import type { Region } from './regions';
import './style.css';

type RegionMesh = THREE.Mesh<THREE.ExtrudeGeometry, THREE.MeshStandardMaterial> & {
  userData: {
    region: Region;
    targetLift: number;
    outline?: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  };
};

function requireElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (!element) throw new Error(`Map markup is incomplete: ${selector}`);
  return element;
}

const mapStage = requireElement<HTMLElement>('#map-stage');
const zoomInButton = requireElement<HTMLButtonElement>('#zoom-in');
const zoomOutButton = requireElement<HTMLButtonElement>('#zoom-out');
const zoomResetButton = requireElement<HTMLButtonElement>('#zoom-reset');
const adminPanel = requireElement<HTMLElement>('#admin-panel');
const adminToggle = requireElement<HTMLButtonElement>('#admin-toggle');
const adminClose = requireElement<HTMLButtonElement>('#admin-close');
const eventPanel = requireElement<HTMLElement>('#event-panel');
const eventClose = requireElement<HTMLButtonElement>('#event-close');
const eventRegion = requireElement<HTMLElement>('#event-region');
const eventList = requireElement<HTMLElement>('#event-list');
const form = requireElement<HTMLFormElement>('#ctf-form');
const regionSelect = requireElement<HTMLSelectElement>('#ctf-region');
const cityInput = requireElement<HTMLInputElement>('#ctf-city');
const nameInput = requireElement<HTMLInputElement>('#ctf-name');
const startInput = requireElement<HTMLInputElement>('#ctf-start');
const endInput = requireElement<HTMLInputElement>('#ctf-end');
const formError = requireElement<HTMLElement>('#form-error');
const toast = requireElement<HTMLElement>('#toast');
const demoCount = requireElement<HTMLInputElement>('#demo-count');
const demoGenerate = requireElement<HTMLButtonElement>('#demo-generate');
const mapStats = requireElement<HTMLOutputElement>('#map-stats');

type CtfEvent = { id: string; regionId: string; city: string; name: string; start: string; end: string };
const STORAGE_KEY = 'ctf-map-events-v1';
let ctfEvents: CtfEvent[] = loadEvents();
const flags = new Map<string, THREE.Group>();

function loadEvents(): CtfEvent[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter((item): item is CtfEvent => Boolean(item && typeof item === 'object' && 'regionId' in item)) : [];
  } catch { return []; }
}

function setPanel(panel: HTMLElement, open: boolean): void {
  panel.classList.toggle('is-open', open);
  panel.setAttribute('aria-hidden', String(!open));
  if (panel === adminPanel) adminToggle.setAttribute('aria-expanded', String(open));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function eventStatus(event: CtfEvent): { label: string; className: string } {
  const now = Date.now();
  if (new Date(event.start).getTime() <= now && new Date(event.end).getTime() >= now) return { label: 'Идёт сейчас', className: 'is-live' };
  if (new Date(event.end).getTime() < now) return { label: 'Завершён', className: 'is-past' };
  return { label: 'Скоро', className: 'is-upcoming' };
}

function showRegionEvents(id: string): void {
  const now = Date.now();
  const events = ctfEvents.filter((event) => event.regionId === id).sort((a, b) => {
    const rank = (item: CtfEvent) => new Date(item.end).getTime() < now ? 2 : new Date(item.start).getTime() <= now ? 0 : 1;
    const rankDiff = rank(a) - rank(b);
    if (rankDiff) return rankDiff;
    return rank(a) === 2
      ? new Date(b.start).getTime() - new Date(a.start).getTime()
      : new Date(a.start).getTime() - new Date(b.start).getTime();
  });
  eventRegion.textContent = getRegion(id).name;
  eventList.replaceChildren();
  if (!events.length) {
    const empty = document.createElement('p'); empty.className = 'event-empty'; empty.textContent = 'В этом регионе пока нет CTF.'; eventList.append(empty);
  }
  events.forEach((event) => {
    const status = eventStatus(event);
    const card = document.createElement('article'); card.className = 'event-card';
    const meta = document.createElement('div'); meta.className = 'event-card__meta';
    const badge = document.createElement('span'); badge.className = `status ${status.className}`; badge.textContent = status.label;
    const city = document.createElement('span'); city.textContent = event.city;
    const title = document.createElement('h3'); title.textContent = event.name;
    const dates = document.createElement('p'); dates.textContent = `${formatDate(event.start)} — ${formatDate(event.end)}`;
    meta.append(badge, city); card.append(meta, title, dates); eventList.append(card);
  });
  setPanel(adminPanel, false); setPanel(eventPanel, true);
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
camera.position.set(0, -5.7, 30);
camera.lookAt(0, 0, -0.35);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.className = 'map-stage__canvas';
mapStage.append(renderer.domElement);
mapStage.tabIndex = 0;

const mapGroup = new THREE.Group();
const mapViewport = new THREE.Group();
// Keep north-up geography legible; the small frontal tilt exposes the lower edges.
mapGroup.rotation.set(-0.065, 0, 0);
scene.add(mapViewport);
mapViewport.add(mapGroup);

scene.add(new THREE.HemisphereLight(0xd6efff, 0x061035, 2.45));

const keyLight = new THREE.DirectionalLight(0xe9f8ff, 4.6);
keyLight.position.set(-8, -7, 15);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 45;
keyLight.shadow.camera.left = -18;
keyLight.shadow.camera.right = 18;
keyLight.shadow.camera.top = 12;
keyLight.shadow.camera.bottom = -12;
keyLight.shadow.bias = -0.0007;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x607cff, 2.2);
rimLight.position.set(12, 4, 10);
scene.add(rimLight);

const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(29, 17),
  new THREE.ShadowMaterial({ color: 0x00071d, opacity: 0.44 }),
);
shadowPlane.position.set(0, 0, -0.74);
shadowPlane.receiveShadow = true;
mapViewport.add(shadowPlane);

const silhouetteMaterial = new THREE.MeshStandardMaterial({
  color: 0x11265d,
  roughness: 0.78,
  metalness: 0,
  transparent: true,
  opacity: 0.72,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const meshes: RegionMesh[] = [];
const meshById = new Map<string, RegionMesh[]>();
const regionsById = new Map<string, Region>();
const flagAnchorById = new Map<string, { point: THREE.Vector2; area: number }>();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const mapPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const targetViewportPosition = new THREE.Vector3();
const normalizedMapSize = new THREE.Vector2(22.5, 11);
let selectedId: string | null = null;
let hoveredId: string | null = null;
let mapReady = false;
let zoom = 1;
let targetZoom = 1;
let pointerDown = false;
let panning = false;
let pointerStart = new THREE.Vector2();
let panAnchor: THREE.Vector3 | null = null;

function setZoom(nextZoom: number, anchor: THREE.Vector3 | null = null): void {
  const next = THREE.MathUtils.clamp(nextZoom, 0.72, 3.2);
  if (anchor) {
    const localAnchor = anchor.clone().sub(targetViewportPosition).multiplyScalar(1 / targetZoom);
    targetViewportPosition.copy(anchor).addScaledVector(localAnchor, -next);
  }
  targetZoom = next;
  clampViewport();
  const percent = Math.round(targetZoom * 100);
  zoomResetButton.setAttribute('aria-label', `Сбросить масштаб. Текущий масштаб ${percent} процентов`);
}

function getVisibleHalfExtents(): THREE.Vector2 {
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.position.z;
  return new THREE.Vector2(halfHeight * camera.aspect, halfHeight);
}

/** Keep a useful part of Russia inside the viewport at every zoom level. */
function clampViewport(): void {
  const visible = getVisibleHalfExtents();
  const scaledHalfWidth = normalizedMapSize.x * targetZoom * 0.5;
  const scaledHalfHeight = normalizedMapSize.y * targetZoom * 0.5;
  const maxX = Math.max(0, scaledHalfWidth - visible.x * 0.48);
  const maxY = Math.max(0, scaledHalfHeight - visible.y * 0.48);
  targetViewportPosition.x = THREE.MathUtils.clamp(targetViewportPosition.x, -maxX, maxX);
  targetViewportPosition.y = THREE.MathUtils.clamp(targetViewportPosition.y, -maxY, maxY);
}

function resetViewport(): void {
  targetZoom = 1;
  targetViewportPosition.set(0, 0, 0);
  zoomResetButton.setAttribute('aria-label', 'Сбросить масштаб. Текущий масштаб 100 процентов');
}

function updateLoadingState(loading: boolean): void {
  mapStage.classList.toggle('map-stage--loading', loading);
  mapStage.setAttribute('aria-busy', String(loading));
}

function getRegion(id: string): Region {
  const region = regionsById.get(id);
  if (!region) throw new Error(`Unknown map region: ${id}`);
  return region;
}

function announceRegion(region: Region | null): void {
  mapStage.setAttribute(
    'aria-label',
    region
      ? `Интерактивная карта регионов России. Выбран регион: ${region.name}.`
      : 'Интерактивная карта регионов России. Наведите курсор на регион или выберите его.',
  );
}

function renderSelection(): void {
  meshes.forEach((mesh) => {
    const { region } = mesh.userData;
    const selected = region.id === selectedId;
    const hovered = region.id === hoveredId;
    mesh.userData.targetLift = hovered ? 0.82 : selected ? 0.34 : 0;
    const base = new THREE.Color(region.color);
    const outline = mesh.userData.outline;

    mesh.material.color.copy(base);
    mesh.material.emissive.copy(base).multiplyScalar(0.026);
    if (selected) {
      mesh.material.color.lerp(new THREE.Color(0xd7f8ff), 0.62);
      mesh.material.emissive.set(0x6ee7ff).multiplyScalar(0.42);
    }
    if (hovered) {
      mesh.material.color.lerp(new THREE.Color(0x02ddff), 0.74);
      mesh.material.emissive.set(0x00d8ff).multiplyScalar(0.78);
    }

    if (outline) {
      outline.material.color.set(hovered ? 0xe7feff : selected ? 0xbff6ff : 0x86c4ec);
      outline.material.opacity = hovered ? 1 : selected ? 0.98 : 0.52;
    }
  });
}

function selectRegion(id: string): void {
  selectedId = id;
  announceRegion(getRegion(id));
  renderSelection();
  showRegionEvents(id);
}

function syncFlags(): void {
  flags.forEach((flag) => { mapGroup.remove(flag); flag.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); (object.material as THREE.Material).dispose(); } }); });
  flags.clear();
  const eventsByRegion = new Map<string, CtfEvent[]>();
  ctfEvents.forEach((event) => eventsByRegion.set(event.regionId, [...(eventsByRegion.get(event.regionId) ?? []), event]));
  eventsByRegion.forEach((events, id) => {
    const regionMeshes = meshById.get(id); if (!regionMeshes?.length) return;
    const anchor = flagAnchorById.get(id);
    if (!anchor) return;
    const regionFlags = new THREE.Group(); regionFlags.position.set(anchor.point.x, anchor.point.y, 1.35);
    events.sort((a, b) => {
      const priority = (item: CtfEvent) => eventStatus(item).className === 'is-live' ? 0 : eventStatus(item).className === 'is-upcoming' ? 1 : 2;
      return priority(a) - priority(b) || new Date(a.start).getTime() - new Date(b.start).getTime();
    }).forEach((event, index) => {
      const status = eventStatus(event);
      const total = events.length;
      const columns = Math.min(total, 5);
      const row = Math.floor(index / columns);
      const itemsInRow = Math.min(columns, total - row * columns);
      const column = index % columns - (itemsInRow - 1) / 2;
      const flag = new THREE.Group();
      flag.position.set(column * 17, row * 15 + Math.abs(column) * 1.8, index * 0.35);
      const singleScale = status.className === 'is-live' ? 0.135 : status.className === 'is-upcoming' ? 0.12 : 0.1;
      flag.scale.setScalar(total === 1 ? singleScale : singleScale * (index === 0 ? 0.86 : 0.72));
      const red = status.className === 'is-past' ? 0x9f2732 : status.className === 'is-live' ? 0xff2438 : 0xe21f32;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 1.05, 36, 10), new THREE.MeshStandardMaterial({ color: 0xf3f7ff, metalness: 0.78, roughness: 0.22 }));
      pole.rotation.x = Math.PI / 2; pole.position.z = 17;
      pole.castShadow = true;
      const clothGeometry = new THREE.BufferGeometry();
      clothGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, 24,0,1.6, 22,0,-11, 0,0,-10], 3));
      clothGeometry.setIndex([0,1,2, 0,2,3]); clothGeometry.computeVertexNormals();
      const cloth = new THREE.Mesh(clothGeometry, new THREE.MeshStandardMaterial({ color: red, emissive: red, emissiveIntensity: status.className === 'is-live' ? 0.42 : 0.2, roughness: 0.48, side: THREE.DoubleSide, depthTest: false }));
      cloth.position.set(0, 0, 30); cloth.renderOrder = 12; cloth.castShadow = true;
      const finial = new THREE.Mesh(new THREE.SphereGeometry(1.65, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffd56a, emissive: 0x8e4b00, emissiveIntensity: 0.22, metalness: 0.65, roughness: 0.25 }));
      finial.position.z = 35.5; finial.renderOrder = 13;
      const beacon = new THREE.Mesh(new THREE.RingGeometry(5.8, 9, 28), new THREE.MeshBasicMaterial({ color: red, transparent: true, opacity: status.className === 'is-past' ? 0.24 : 0.6, side: THREE.DoubleSide, depthTest: false }));
      beacon.position.z = 1; beacon.renderOrder = 11;
      flag.add(pole, cloth, finial, beacon); regionFlags.add(flag);
    });
    mapGroup.add(regionFlags); flags.set(id, regionFlags);
  });
  mapStats.value = `${ctfEvents.length} флагов`;
  mapStats.dataset.flagCount = String(ctfEvents.length);
}

function getViewportCenter(): THREE.Vector3 | null {
  const bounds = renderer.domElement.getBoundingClientRect();
  return getWorldPointFromClient(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
}

function focusRegion(id: string): void {
  const regionMeshes = meshById.get(id);
  const viewportCenter = getViewportCenter();
  if (!regionMeshes?.length || !viewportCenter) return;

  mapViewport.updateWorldMatrix(true, false);
  const viewportInverse = mapViewport.matrixWorld.clone().invert();
  const bounds = new THREE.Box3();
  regionMeshes.forEach((mesh) => {
    mesh.geometry.computeBoundingBox();
    if (mesh.geometry.boundingBox) {
      bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(viewportInverse));
    }
  });
  if (bounds.isEmpty()) return;

  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const extent = Math.max(size.x, size.y);
  const regionZoom = THREE.MathUtils.clamp(5.4 / extent, 1.3, 1.85);
  targetZoom = regionZoom;
  targetViewportPosition.copy(viewportCenter).addScaledVector(center, -regionZoom);
  clampViewport();
  zoomResetButton.setAttribute('aria-label', `Сбросить масштаб. Текущий масштаб ${Math.round(regionZoom * 100)} процентов`);
}

function normalizeMap(): void {
  const bounds = new THREE.Box3().setFromObject(mapGroup);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  // Fill the viewport while retaining a thin safety margin for the outer islands.
  const scale = 22.5 / Math.max(size.x, size.y);
  // SVG has a downward Y axis; flip it once here to preserve north-up geography.
  mapGroup.scale.set(scale, -scale, scale);
  mapGroup.position.set(-center.x * scale, center.y * scale - 0.02, 0);
  normalizedMapSize.set(size.x * scale, size.y * scale);
}

function addRegionGroup(id: string, name: string, paths: THREE.ShapePath[]): void {
  // Treat Saint Petersburg's inner contour as part of Leningrad Oblast on this CTF map.
  if (id === '78') { id = '47'; name = 'Ленинградская область и Санкт-Петербург'; }
  const existingRegion = regionsById.get(id);
  const region: Region = existingRegion ?? { id, name, fragments: 0, color: colorForRegion(id) };
  region.fragments += paths.length;
  if (id === '47') region.name = 'Ленинградская область и Санкт-Петербург';
  regionsById.set(id, region);
  const material = new THREE.MeshStandardMaterial({
    color: region.color,
    roughness: 0.58,
    metalness: 0.08,
    emissive: new THREE.Color(region.color).multiplyScalar(0.035),
    side: THREE.DoubleSide,
  });
  const regionMeshes: RegionMesh[] = [...(meshById.get(id) ?? [])];

  paths.forEach((path) => {
    const shapes = SVGLoader.createShapes(path);
    shapes.forEach((shape) => {
      updateFlagAnchor(id, shape);
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 16,
        bevelEnabled: true,
        bevelSegments: 1,
        bevelSize: 0.32,
        bevelThickness: 0.38,
        curveSegments: 1,
      });
      geometry.translate(0, 0, -16);
      const mesh = new THREE.Mesh(geometry, material.clone()) as RegionMesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { region, targetLift: 0 };
      mapGroup.add(mesh);

      const outlinePoints = shape.getPoints(1).map((point) => new THREE.Vector3(point.x, point.y, 0.012));
      if (outlinePoints.length > 2) {
        outlinePoints.push(outlinePoints[0].clone());
        const outline = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(outlinePoints),
          new THREE.LineBasicMaterial({ color: 0x86c4ec, transparent: true, opacity: 0.52 }),
        );
        outline.renderOrder = 2;
        mesh.add(outline);
        mesh.userData.outline = outline;
      }
      meshes.push(mesh);
      regionMeshes.push(mesh);
    });
  });
  if (regionMeshes.length) meshById.set(id, regionMeshes);
}

/** Pick the centre of the largest triangulated patch: unlike a bounding-box centre, it is always on the region. */
function updateFlagAnchor(id: string, shape: THREE.Shape): void {
  const contour = shape.getPoints(2);
  const holes = shape.holes.map((hole) => hole.getPoints(2));
  const vertices = [...contour, ...holes.flat()];
  THREE.ShapeUtils.triangulateShape(contour, holes).forEach(([aIndex, bIndex, cIndex]) => {
    const a = vertices[aIndex]; const b = vertices[bIndex]; const c = vertices[cIndex];
    if (!a || !b || !c) return;
    const area = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) * 0.5;
    if (area <= (flagAnchorById.get(id)?.area ?? 0)) return;
    flagAnchorById.set(id, { point: new THREE.Vector2((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3), area });
  });
}

function addCountrySilhouette(pathData: string): void {
  if (!pathData) return;
  const parsed = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${pathData}" /></svg>`);
  parsed.paths.forEach((path) => {
    SVGLoader.createShapes(path).forEach((shape) => {
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: false, curveSegments: 1 });
      geometry.translate(0, 0, -0.7);
      const mesh = new THREE.Mesh(geometry, silhouetteMaterial);
      mesh.renderOrder = -2;
      mapGroup.add(mesh);
    });
  });
}

async function loadReferenceSvg(): Promise<void> {
  updateLoadingState(true);
  try {
    const response = await fetch('/russia-regions.svg');
    if (!response.ok) throw new Error(`Could not load map SVG: ${response.status}`);
    const svgText = await response.text();
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const silhouette = doc.querySelector<SVGPathElement>('#country-silhouette')?.getAttribute('d') ?? '';
    const groups = [...doc.querySelectorAll<SVGGElement>('svg > g[id^="region-"]')];
    const loader = new SVGLoader();

    groups.forEach((group) => {
      const id = group.id.replace('region-', '');
      const name = group.dataset.name ?? `Регион ${id}`;
      const paths = [...group.querySelectorAll<SVGPathElement>('path')]
        .flatMap((path) => loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${path.getAttribute('d') ?? ''}" /></svg>`).paths);
      const transform = group.getAttribute('transform');
      const translatedPaths = transform ? translateSvgPaths(paths, transform) : paths;
      addRegionGroup(id, name, translatedPaths);
    });

    if (!meshById.size) throw new Error('SVG contains no usable regional paths.');
    normalizeMap();
    addCountrySilhouette(silhouette);
    mapReady = true;
    [...regionsById.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru')).forEach((region) => {
      const option = document.createElement('option'); option.value = region.id; option.textContent = region.name; regionSelect.append(option);
    });
    syncFlags();
    const initial = new URLSearchParams(window.location.hash.slice(1)).get('region');
    if (initial && meshById.has(initial)) selectRegion(initial);
    else announceRegion(null);
  } catch (error) {
    mapStage.setAttribute('aria-label', 'Не удалось загрузить карту регионов.');
    console.error(error);
  } finally {
    updateLoadingState(false);
  }
}

function translateSvgPaths(paths: THREE.ShapePath[], transform: string): THREE.ShapePath[] {
  const numbers = transform.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [0, 0];
  const [x = 0, y = 0] = numbers;
  paths.forEach((path) => {
    path.subPaths.forEach((subPath) => {
      subPath.currentPoint.x += x;
      subPath.currentPoint.y += y;
      subPath.curves.forEach((curve) => {
        const translated = curve as THREE.Curve<THREE.Vector2> & {
          v0?: THREE.Vector2;
          v1?: THREE.Vector2;
          v2?: THREE.Vector2;
          v3?: THREE.Vector2;
          aX?: number;
          aY?: number;
        };
        [translated.v0, translated.v1, translated.v2, translated.v3].forEach((point) => {
          if (!point) return;
          point.x += x;
          point.y += y;
        });
        if (translated.aX !== undefined) translated.aX += x;
        if (translated.aY !== undefined) translated.aY += y;
      });
    });
  });
  return paths;
}

function updatePointerFromClient(clientX: number, clientY: number): void {
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
}

function updatePointer(event: PointerEvent): void {
  updatePointerFromClient(event.clientX, event.clientY);
}

function getWorldPointFromClient(clientX: number, clientY: number): THREE.Vector3 | null {
  updatePointerFromClient(clientX, clientY);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.ray.intersectPlane(mapPlane, new THREE.Vector3());
}

function getIntersectedRegion(event: PointerEvent): RegionMesh | null {
  if (!mapReady) return null;
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  return (raycaster.intersectObjects(meshes, false)[0]?.object as RegionMesh | undefined) ?? null;
}

function setHover(id: string | null): void {
  if (hoveredId === id) return;
  hoveredId = id;
  mapStage.classList.toggle('map-stage--hovering', Boolean(id));
  renderSelection();
}

function resize(): void {
  const { width, height } = mapStage.getBoundingClientRect();
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  clampViewport();
}

new ResizeObserver(resize).observe(mapStage);

mapStage.addEventListener('wheel', (event) => {
  event.preventDefault();
  setZoom(targetZoom * Math.exp(-event.deltaY * 0.00125), getWorldPointFromClient(event.clientX, event.clientY));
}, { passive: false });

mapStage.addEventListener('pointermove', (event) => {
  if (pointerDown && panAnchor) {
    const distance = pointerStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY));
    if (distance > 4) panning = true;
    if (panning) {
      const current = getWorldPointFromClient(event.clientX, event.clientY);
      if (current) {
        targetViewportPosition.add(panAnchor.clone().sub(current));
        clampViewport();
        panAnchor = current;
      }
      mapStage.classList.add('map-stage--dragging');
    }
    return;
  }
  setHover(getIntersectedRegion(event)?.userData.region.id ?? null);
});

mapStage.addEventListener('pointerleave', () => { if (!pointerDown) setHover(null); });

mapStage.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  pointerDown = true;
  panning = false;
  pointerStart.set(event.clientX, event.clientY);
  panAnchor = getWorldPointFromClient(event.clientX, event.clientY);
  mapStage.setPointerCapture(event.pointerId);
});

mapStage.addEventListener('pointerup', (event) => {
  if (!pointerDown) return;
  pointerDown = false;
  mapStage.classList.remove('map-stage--dragging');
  if (mapStage.hasPointerCapture(event.pointerId)) mapStage.releasePointerCapture(event.pointerId);
  if (!panning) {
    const mesh = getIntersectedRegion(event);
    if (mesh) {
      selectRegion(mesh.userData.region.id);
      focusRegion(mesh.userData.region.id);
    }
  }
  panAnchor = null;
});

mapStage.addEventListener('pointercancel', () => {
  pointerDown = false;
  panning = false;
  panAnchor = null;
  mapStage.classList.remove('map-stage--dragging');
});

mapStage.addEventListener('keydown', (event) => {
  if (!selectedId || !mapReady) return;
  const ids = [...meshById.keys()];
  const index = ids.indexOf(selectedId);
  const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
  if (step) {
    event.preventDefault();
    selectRegion(ids[(index + step + ids.length) % ids.length]);
  }
});

zoomInButton.addEventListener('click', () => setZoom(targetZoom * 1.2, getViewportCenter()));
zoomOutButton.addEventListener('click', () => setZoom(targetZoom / 1.2, getViewportCenter()));
zoomResetButton.addEventListener('click', resetViewport);
adminToggle.addEventListener('click', () => { setPanel(eventPanel, false); setPanel(adminPanel, true); window.setTimeout(() => regionSelect.focus(), 180); });
adminClose.addEventListener('click', () => setPanel(adminPanel, false));
eventClose.addEventListener('click', () => setPanel(eventPanel, false));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { setPanel(adminPanel, false); setPanel(eventPanel, false); } });
form.addEventListener('submit', (event) => {
  event.preventDefault(); formError.textContent = '';
  const start = new Date(startInput.value); const end = new Date(endInput.value);
  if (end <= start) { formError.textContent = 'Окончание должно быть позже начала.'; endInput.focus(); return; }
  const item: CtfEvent = { id: crypto.randomUUID(), regionId: regionSelect.value, city: cityInput.value.trim(), name: nameInput.value.trim(), start: start.toISOString(), end: end.toISOString() };
  ctfEvents.push(item); localStorage.setItem(STORAGE_KEY, JSON.stringify(ctfEvents)); syncFlags(); form.reset(); setPanel(adminPanel, false);
  selectRegion(item.regionId); focusRegion(item.regionId); toast.textContent = `${item.name} добавлен на карту`; toast.classList.add('is-visible'); window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
});

const demoCities = ['Москва', 'Санкт-Петербург', 'Казань', 'Екатеринбург', 'Новосибирск', 'Самара', 'Томск', 'Владивосток', 'Краснодар', 'Уфа'];
demoGenerate.addEventListener('click', () => {
  const count = THREE.MathUtils.clamp(Math.round(Number(demoCount.value) || 1), 1, 50);
  const availableRegions = [...regionsById.values()];
  if (!availableRegions.length) return;
  const now = Date.now();
  const generated = Array.from({ length: count }, (_, index): CtfEvent => {
    const region = availableRegions[(index * 17 + 7) % availableRegions.length];
    const startsAt = now + (index % 4 === 0 ? -2 : index + 1) * 86_400_000;
    return {
      id: crypto.randomUUID(), regionId: region.id, city: demoCities[index % demoCities.length],
      name: `Test CTF #${index + 1}`, start: new Date(startsAt).toISOString(), end: new Date(startsAt + 2 * 86_400_000).toISOString(),
    };
  });
  ctfEvents.push(...generated);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ctfEvents));
  syncFlags(); setPanel(adminPanel, false);
  toast.textContent = `Добавлено тестовых CTF: ${count}`; toast.classList.add('is-visible');
  window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
});

resize();
void loadReferenceSvg();

function animate(): void {
  zoom = reduceMotion ? targetZoom : THREE.MathUtils.damp(zoom, targetZoom, 12, 1 / 60);
  mapViewport.scale.setScalar(zoom);
  mapViewport.position.x = reduceMotion ? targetViewportPosition.x : THREE.MathUtils.damp(mapViewport.position.x, targetViewportPosition.x, 12, 1 / 60);
  mapViewport.position.y = reduceMotion ? targetViewportPosition.y : THREE.MathUtils.damp(mapViewport.position.y, targetViewportPosition.y, 12, 1 / 60);
  meshes.forEach((mesh) => {
    mesh.position.z = reduceMotion
      ? mesh.userData.targetLift
      : THREE.MathUtils.damp(mesh.position.z, mesh.userData.targetLift, 15, 1 / 60);
  });
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
}

animate();
