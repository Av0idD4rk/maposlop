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
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const mapPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const targetViewportPosition = new THREE.Vector3();
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
  const percent = Math.round(targetZoom * 100);
  zoomResetButton.setAttribute('aria-label', `Сбросить масштаб. Текущий масштаб ${percent} процентов`);
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
}

function addRegionGroup(id: string, name: string, paths: THREE.ShapePath[]): void {
  const region: Region = { id, name, fragments: paths.length, color: colorForRegion(id) };
  regionsById.set(id, region);
  const material = new THREE.MeshStandardMaterial({
    color: region.color,
    roughness: 0.58,
    metalness: 0.08,
    emissive: new THREE.Color(region.color).multiplyScalar(0.035),
    side: THREE.DoubleSide,
  });
  const regionMeshes: RegionMesh[] = [];

  paths.forEach((path) => {
    const shapes = SVGLoader.createShapes(path);
    shapes.forEach((shape) => {
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
