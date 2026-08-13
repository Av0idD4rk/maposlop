<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { geoConicConformal, geoPath, type GeoProjection } from 'd3-geo';
  import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
  import type { FeatureCollection, Geometry } from 'geojson';
  import { assets } from '$app/paths';
  import { canonicalRegionId, regionMembers, compositeName, colorForRegion } from '$lib/regions';
  import { events, selectedRegionId, regionNames, activeEvent } from '$lib/stores';
  import { dateText, pulseClass, nearestLabel } from '$lib/format';
  import type { CtfEvent, Region } from '$lib/types';
  import ZoomControls from './ZoomControls.svelte';
  import MapHint from './MapHint.svelte';

  type RegionMesh = THREE.Mesh<THREE.ExtrudeGeometry, THREE.MeshStandardMaterial> & {
    userData: {
      region: Region;
      targetLift: number;
      outline?: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
    };
  };

  type MarkerVM = {
    key: string;
    className: string;
    ariaLabel: string;
    label: string;
    pulseWidth: string;
    pulseLeft: string;
    pulseHeight: string;
    labelOffset: string;
    anchor: THREE.Object3D;
    onclick: () => void;
  };

  type MapProperties = { code: string; name: string; isoCode: string };
  type MapData = FeatureCollection<Geometry, MapProperties> & {
    source: string;
    sourceUrl: string;
    license: string;
  };

  let stageEl: HTMLDivElement | undefined = $state();
  let mapAriaLabel = $state('Интерактивная карта регионов России. Выберите регион.');
  let mapStatus = $state<'loading' | 'ready' | 'error'>('loading');
  let markers = $state<MarkerVM[]>([]);
  let mapReady = $state(false);
  let zoomIn = () => {};
  let zoomOut = () => {};
  let zoomReset = () => {};
  let retryMap = () => {};

  // onMount fills these in once the Three.js scene exists; the effects below
  // only ever invoke them after mapReady flips true, so the indirection is safe.
  let applySelectionImpl: (id: string | null, isSubsequent: boolean) => void = () => {};
  let rebuildMarkersImpl: (currentEvents: CtfEvent[], selected: string | null) => void = () => {};

  const markerRefs = new Map<string, HTMLButtonElement>();
  function markerRef(node: HTMLButtonElement, key: string) {
    markerRefs.set(key, node);
    return {
      update(nextKey: string) {
        markerRefs.delete(key);
        key = nextKey;
        markerRefs.set(key, node);
      },
      destroy() {
        markerRefs.delete(key);
      },
    };
  }

  let selectionEffectRan = false;
  $effect(() => {
    if (!mapReady) return;
    applySelectionImpl($selectedRegionId, selectionEffectRan);
    selectionEffectRan = true;
  });

  $effect(() => {
    if (!mapReady) return;
    rebuildMarkersImpl($events, $selectedRegionId);
  });

  // --- Everything below is imperative Three.js setup, mirroring a classic
  // canvas app; it only ever touches the DOM inside onMount/onDestroy. ---

  let cleanup: () => void = () => {};

  onMount(() => {
    const stage = stageEl!;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const narrowViewport = matchMedia('(max-width: 760px)').matches;
    const compactDevice = narrowViewport || ((navigator.hardwareConcurrency ?? 8) <= 4);
    const compactFlagScale = narrowViewport ? 2 : 1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 500);
    camera.position.set(0, -5.7, 30);
    camera.lookAt(0, 0, -0.35);

    const renderer = new THREE.WebGLRenderer({ antialias: !compactDevice, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, compactDevice ? 1 : 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;
    renderer.domElement.className = 'map-stage__canvas';
    stage.append(renderer.domElement);

    const mapGroup = new THREE.Group();
    const mapViewport = new THREE.Group();
    const flagLayer = new THREE.Group();
    mapGroup.rotation.set(-0.065, 0, 0);
    scene.add(mapViewport);
    mapViewport.add(mapGroup);
    mapGroup.add(flagLayer);
    scene.add(new THREE.HemisphereLight(0xd6efff, 0x061035, 2.45));
    const light = new THREE.DirectionalLight(0xe9f8ff, 4.6);
    light.position.set(-8, -7, 15);
    scene.add(light);
    const rim = new THREE.DirectionalLight(0x607cff, 2.2);
    rim.position.set(12, 4, 10);
    scene.add(rim);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(29, 17),
      new THREE.MeshBasicMaterial({ color: 0x020719, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    shadow.position.z = -0.74;
    mapViewport.add(shadow);
    const meshes: RegionMesh[] = [];
    const meshById = new Map<string, RegionMesh[]>();
    const regionsById = new Map<string, Region>();
    let mapProjection: GeoProjection | null = null;
    const flagAnchorById = new Map<string, { point: THREE.Vector2; area: number }>();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const mapPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const targetPosition = new THREE.Vector3();
    const normalizedMapSize = new THREE.Vector2(22.5, 11);

    let selectedId: string | null = null;
    let hoveredId: string | null = null;
    let zoom = 1;
    let targetZoom = 1;
    let pointerDown = false;
    let panning = false;
    const pointerStart = new THREE.Vector2();
    let panAnchor: THREE.Vector3 | null = null;
    const regionNamesLocal = new Map<string, string>();

    function setZoom(value: number, anchor: THREE.Vector3 | null = null) {
      const next = THREE.MathUtils.clamp(value, 0.72, 5);
      if (anchor) {
        const local = anchor.clone().sub(targetPosition).multiplyScalar(1 / targetZoom);
        targetPosition.copy(anchor).addScaledVector(local, -next);
      }
      targetZoom = next;
      clampViewport();
    }
    function resetViewport() {
      targetZoom = 1;
      targetPosition.set(0, 0, 0);
    }
    function regionMeshes(id: string) {
      return regionMembers(id).flatMap((member) => meshById.get(member) ?? []);
    }
    function regionBounds(id: string) {
      const bounds = new THREE.Box3();
      regionMeshes(id).forEach((mesh) => {
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) bounds.union(mesh.geometry.boundingBox);
      });
      return bounds;
    }
    /** Best flag anchor across a region's members: the centroid of its single largest triangulated patch. */
    function regionFlagAnchor(id: string) {
      let best: { point: THREE.Vector2; area: number } | undefined;
      regionMembers(id).forEach((member) => {
        const anchor = flagAnchorById.get(member);
        if (anchor && (!best || anchor.area > best.area)) best = anchor;
      });
      return best?.point;
    }
    function regionCenter(id: string) {
      const anchor = regionFlagAnchor(id);
      if (anchor) return new THREE.Vector3(anchor.x, anchor.y, 0);
      return regionBounds(id).getCenter(new THREE.Vector3());
    }
    function regionDisplayName(id: string): string {
      const canonical = canonicalRegionId(id);
      return compositeName(canonical) ?? regionsById.get(canonical)?.name ?? `Регион ${canonical}`;
    }
    function renderSelection() {
      meshes.forEach((mesh) => {
        const id = canonicalRegionId(mesh.userData.region.id);
        const active = id === selectedId;
        const hover = id === hoveredId;
        const baseColor = new THREE.Color(mesh.userData.region.color);
        mesh.userData.targetLift = hover ? 0.76 : active ? 0.28 : 0;
        mesh.material.color.copy(baseColor);
        mesh.material.emissive.copy(baseColor).multiplyScalar(0.03);
        if (active) {
          mesh.material.color.lerp(new THREE.Color(0xcff9ff), 0.55);
          mesh.material.emissive.set(0x62eaff).multiplyScalar(0.35);
        }
        if (hover) {
          mesh.material.color.lerp(new THREE.Color(0x00e5ff), 0.7);
          mesh.material.emissive.set(0x00d8ff).multiplyScalar(0.72);
        }
        if (mesh.userData.outline) {
          mesh.userData.outline.material.color.set(hover ? 0xffffff : active ? 0xbffaff : 0x69bde9);
          mesh.userData.outline.material.opacity = hover ? 1 : active ? 0.95 : 0.42;
        }
      });
    }
    function focusRegion(id: string) {
      const canonical = canonicalRegionId(id);
      const list = regionMeshes(canonical);
      if (!list.length) return;
      const bounds = regionBounds(canonical);
      const center = bounds.getCenter(new THREE.Vector3());
      const rawSize = bounds.getSize(new THREE.Vector3());
      const normalizedExtent = Math.max(rawSize.x * Math.abs(mapGroup.scale.x), rawSize.y * Math.abs(mapGroup.scale.y));
      const regionZoom = THREE.MathUtils.clamp(1.8 / normalizedExtent, 3.2, 4.8);
      const mobile = matchMedia('(max-width: 760px)').matches;
      const panelEl = document.querySelector<HTMLElement>('.side-panel');
      const panelWidth = mobile || !panelEl ? 0 : panelEl.getBoundingClientRect().width + 42;
      const focusX = mobile ? innerWidth / 2 : (innerWidth - panelWidth) / 2;
      const focusY = mobile ? innerHeight * 0.3 : innerHeight * 0.52;
      const desiredPoint = getWorldPoint(focusX, focusY);
      if (!desiredPoint) return;
      mapGroup.updateMatrix();
      const normalizedCenter = center.clone();
      normalizedCenter.z = 0;
      normalizedCenter.applyMatrix4(mapGroup.matrix);
      targetZoom = regionZoom;
      targetPosition.set(desiredPoint.x - normalizedCenter.x * regionZoom, desiredPoint.y - normalizedCenter.y * regionZoom, 0);
      clampViewport();
    }
    function normalizeMap() {
      const bounds = new THREE.Box3().setFromObject(mapGroup);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const scale = 22.5 / Math.max(size.x, size.y);
      mapGroup.scale.set(scale, -scale, scale);
      mapGroup.position.set(-center.x * scale, center.y * scale + 0.62, 0);
      normalizedMapSize.set(size.x * scale, size.y * scale);
    }
    function visibleHalfExtents() {
      const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.position.z;
      return new THREE.Vector2(halfHeight * camera.aspect, halfHeight);
    }
    /** Keep a useful part of the map inside the viewport at every zoom/pan combination. */
    function clampViewport() {
      const visible = visibleHalfExtents();
      const maxX = Math.max(0, (normalizedMapSize.x * targetZoom) / 2 - visible.x * 0.48);
      const maxY = Math.max(0, (normalizedMapSize.y * targetZoom) / 2 - visible.y * 0.48);
      targetPosition.x = THREE.MathUtils.clamp(targetPosition.x, -maxX, maxX);
      targetPosition.y = THREE.MathUtils.clamp(targetPosition.y, -maxY, maxY);
    }
    /** Unlike a bounding-box centre, the largest triangle's centroid is always on solid ground. */
    function updateFlagAnchor(id: string, shape: THREE.Shape) {
      const contour = shape.getPoints(2);
      const holes = shape.holes.map((hole) => hole.getPoints(2));
      const vertices = [...contour, ...holes.flat()];
      THREE.ShapeUtils.triangulateShape(contour, holes).forEach(([aIndex, bIndex, cIndex]) => {
        const a = vertices[aIndex];
        const b = vertices[bIndex];
        const c = vertices[cIndex];
        if (!a || !b || !c) return;
        const area = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) * 0.5;
        if (area <= (flagAnchorById.get(id)?.area ?? 0)) return;
        flagAnchorById.set(id, { point: new THREE.Vector2((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3), area });
      });
    }
    function addRegion(id: string, name: string, paths: THREE.ShapePath[]) {
      const region: Region = { id, name: id === '78' ? 'Санкт-Петербург' : name, fragments: paths.length, color: colorForRegion(id) };
      regionsById.set(id, region);
      const list: RegionMesh[] = [];
      paths.forEach((path) =>
        SVGLoader.createShapes(path).forEach((shape) => {
          updateFlagAnchor(id, shape);
          const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: 16,
            bevelEnabled: !compactDevice,
            bevelSegments: 1,
            bevelSize: 0.32,
            bevelThickness: 0.38,
            curveSegments: 1,
          });
          geometry.translate(0, 0, -16);
          const material = new THREE.MeshStandardMaterial({
            color: region.color,
            roughness: 0.58,
            metalness: 0.08,
            emissive: new THREE.Color(region.color).multiplyScalar(0.035),
            side: THREE.DoubleSide,
          });
          const mesh = new THREE.Mesh(geometry, material) as RegionMesh;
          mesh.userData = { region, targetLift: 0 };
          const points = shape.getPoints(1).map((p) => new THREE.Vector3(p.x, p.y, 0.012));
          if (points.length > 2) {
            points.push(points[0].clone());
            const outline = new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(points),
              new THREE.LineBasicMaterial({ color: 0x69bde9, transparent: true, opacity: 0.42 }),
            );
            mesh.add(outline);
            mesh.userData.outline = outline;
          }
          mapGroup.add(mesh);
          meshes.push(mesh);
          list.push(mesh);
        }),
      );
      if (list.length) meshById.set(id, list);
    }
    function populateRegions() {
      regionsById.forEach((region) => {
        const id = canonicalRegionId(region.id);
        regionNamesLocal.set(id, regionDisplayName(region.id));
      });
      regionNames.set(new Map(regionNamesLocal));
    }
    async function loadMap() {
      mapStatus = 'loading';
      stage.classList.add('is-loading');
      try {
        const data = await fetch(`${assets}/map/russia-regions.geojson`).then((r) => {
          if (!r.ok) throw new Error('Map unavailable');
          return r.json() as Promise<MapData>;
        });
        mapProjection = geoConicConformal()
          .parallels([52, 64])
          .rotate([-100, 0])
          .precision(0.2)
          .fitExtent([[0, 0], [1000, 600]], data);
        const pathGenerator = geoPath(mapProjection);
        const loader = new SVGLoader();
        data.features.forEach((feature) => {
          const pathData = pathGenerator(feature);
          if (!pathData) return;
          const paths = loader.parse(
            `<svg xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd"><path d="${pathData}"/></svg>`,
          ).paths;
          addRegion(feature.properties.code, feature.properties.name, paths);
        });
        normalizeMap();
        populateRegions();
        mapReady = true;
        mapStatus = 'ready';
        const initial = new URLSearchParams(location.hash.slice(1)).get('region');
        if (initial && meshById.has(initial)) selectedRegionId.set(canonicalRegionId(initial));
      } catch (error) {
        console.error(error);
        mapAriaLabel = 'Не удалось загрузить карту';
        mapStatus = 'error';
      } finally {
        stage.classList.remove('is-loading');
      }
    }

    const flagPoleGeometry = new THREE.CylinderGeometry(0.48, 0.68, 1, 8);
    const flagBaseGeometry = new THREE.CylinderGeometry(2.5, 3.1, 1.15, 12);
    const flagCollarGeometry = new THREE.SphereGeometry(0.82, 8, 6);
    const flagPoleMaterial = new THREE.MeshStandardMaterial({ color: 0xd8e5e8, roughness: 0.28, metalness: 0.72, emissive: 0x161d20 });
    const flagBaseMaterial = new THREE.MeshStandardMaterial({ color: 0x27343e, roughness: 0.48, metalness: 0.55, emissive: 0x080b0d });
    const flagClothMaterial = new THREE.MeshStandardMaterial({
      color: 0xff5a32,
      roughness: 0.46,
      metalness: 0.06,
      emissive: 0x521006,
      side: THREE.DoubleSide,
      flatShading: false,
    });
    function clear3dFlags() {
      while (flagLayer.children.length) {
        const child = flagLayer.children.pop()!;
        child.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (mesh.userData.ownedGeometry) mesh.geometry.dispose();
        });
      }
    }
    function create3dFlag(origin: THREE.Vector3, target: THREE.Vector3, scale: number, targetScale = scale) {
      const group = new THREE.Group();
      const root = new THREE.Vector3(0, 0, 0.25);
      const tip = new THREE.Vector3(0, -14, 12);
      const lowerMount = new THREE.Vector3(0, -7.8, 6.7);
      const direction = tip.clone().sub(root);
      const length = direction.length();
      const base3d = new THREE.Mesh(flagBaseGeometry, flagBaseMaterial);
      const pole = new THREE.Mesh(flagPoleGeometry, flagPoleMaterial);
      const topCollar = new THREE.Mesh(flagCollarGeometry, flagPoleMaterial);
      const bottomCollar = new THREE.Mesh(flagCollarGeometry, flagPoleMaterial);
      base3d.rotation.x = Math.PI / 2;
      base3d.position.z = 0.7;
      pole.scale.y = length;
      pole.position.copy(root).add(tip).multiplyScalar(0.5);
      pole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
      topCollar.position.copy(tip);
      bottomCollar.position.copy(lowerMount);
      const clothGeometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([0.55, 0, 0, 7, -0.2, 0.8, 14, -0.8, -0.35, 0.55, 6.2, -5.3, 7, 6.3, -4.45, 14, 6, -5.7]);
      clothGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      clothGeometry.setIndex([0, 3, 1, 1, 3, 4, 1, 4, 2, 2, 4, 5]);
      clothGeometry.computeVertexNormals();
      const cloth = new THREE.Mesh(clothGeometry, flagClothMaterial);
      cloth.position.copy(tip);
      cloth.userData.ownedGeometry = true;
      group.add(base3d, pole, topCollar, bottomCollar, cloth);
      group.position.set(origin.x, origin.y, 0.35);
      group.scale.setScalar(scale * compactFlagScale);
      group.userData.targetPosition = new THREE.Vector3(target.x, target.y, 0.35);
      group.userData.targetScale = targetScale * compactFlagScale;
      flagLayer.add(group);
      return group;
    }
    function splitFlagPosition(center: THREE.Vector3, index: number, total: number) {
      if (total === 1) return center.clone();
      const ring = Math.floor(index / 6);
      const itemsInRing = Math.min(6, total - ring * 6);
      const indexInRing = index % 6;
      const angle = -Math.PI / 2 + (Math.PI * 2 * indexInRing) / itemsInRing;
      const radius = 13 + ring * 11;
      return center.clone().add(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
    }

    function eventPoint(event: CtfEvent, regionId: string) {
      if (event.locationPrecision === 'city' && event.longitude !== null && event.latitude !== null && mapProjection) {
        const point = mapProjection([event.longitude, event.latitude]);
        if (point) return new THREE.Vector3(point[0], point[1], 0);
      }
      return regionCenter(regionId);
    }

    function locationKey(event: CtfEvent) {
      return event.locationPrecision === 'city' && event.longitude !== null && event.latitude !== null
        ? `city:${event.longitude}:${event.latitude}`
        : 'region-center';
    }

    function rebuildMarkers(currentEvents: CtfEvent[], selected: string | null) {
      clear3dFlags();
      const grouped = new Map<string, Map<string, CtfEvent[]>>();
      currentEvents.forEach((event) => {
        const id = canonicalRegionId(event.regionCode);
        const regionGroup = grouped.get(id) ?? new Map<string, CtfEvent[]>();
        const key = locationKey(event);
        const locationGroup = regionGroup.get(key) ?? [];
        locationGroup.push(event);
        regionGroup.set(key, locationGroup);
        grouped.set(id, regionGroup);
      });
      const next: MarkerVM[] = [];
      grouped.forEach((locations, groupId) => {
        let regionIndex = 0;
        locations.forEach((locationEvents, locationId) => {
          const event = locationEvents[0];
          const count = locationEvents.length;
          const center = eventPoint(event, groupId);
          if (!center) return;
          const aggregateScale = Math.min(1.66, 1 + Math.log2(count) * 0.22);
          if (selected === groupId) {
            locationEvents.forEach((item, index) => {
              regionIndex += 1;
              const target = splitFlagPosition(center, index, count);
              const flag = create3dFlag(center, target, index === 0 ? aggregateScale : 0.12, 0.64);
              next.push({
                key: `${groupId}-${item.id}`,
                className: `event-marker event-marker--split ${pulseClass(item)}`,
                ariaLabel: `${item.title}, ${item.city || item.regionName}, ${dateText(item.startsAt)}`,
                label: `${regionIndex}. ${item.title}`,
                pulseWidth: '22px',
                pulseLeft: '-11px',
                pulseHeight: '11px',
                labelOffset: '16px',
                anchor: flag,
                onclick: () => activeEvent.set(item),
              });
            });
          } else {
            const flag = create3dFlag(center, center, aggregateScale);
            const place = event.locationPrecision === 'city' ? event.city : regionNamesLocal.get(groupId) ?? groupId;
            next.push({
              key: `${groupId}-${locationId}-agg`,
              className: `event-marker ${pulseClass(event)}`,
              ariaLabel: `${count} CTF, ${place}. Выбрать регион`,
              label: `${count} CTF · ${place || nearestLabel(event)}`,
              pulseWidth: `${32 * aggregateScale}px`,
              pulseLeft: `${-16 * aggregateScale}px`,
              pulseHeight: `${16 * aggregateScale}px`,
              labelOffset: `${16 + 10 * aggregateScale}px`,
              anchor: flag,
              onclick: () => selectedRegionId.set(groupId),
            });
          }
        });
      });
      markers = next;
    }

    function applySelection(id: string | null, isSubsequent: boolean) {
      selectedId = id;
      renderSelection();
      if (id) {
        mapAriaLabel = `Выбран регион: ${regionDisplayName(id)}`;
        history.replaceState(null, '', `${location.pathname}${location.search}#region=${id}`);
        focusRegion(id);
      } else {
        mapAriaLabel = 'Интерактивная карта регионов России. Выберите регион.';
        history.replaceState(null, '', location.pathname + location.search);
        resetViewport();
        if (isSubsequent) stage.focus({ preventScroll: true });
      }
    }

    function pointerFrom(clientX: number, clientY: number) {
      const b = renderer.domElement.getBoundingClientRect();
      pointer.set(((clientX - b.left) / b.width) * 2 - 1, -(((clientY - b.top) / b.height) * 2 - 1));
    }
    function getWorldPoint(x: number, y: number) {
      pointerFrom(x, y);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.ray.intersectPlane(mapPlane, new THREE.Vector3());
    }
    function intersect(event: PointerEvent) {
      if (!mapReady) return null;
      pointerFrom(event.clientX, event.clientY);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(meshes, false)[0]?.object as RegionMesh | undefined;
    }
    function resize() {
      const { width, height } = stage.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      if (width <= 760) {
        const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
        camera.position.z = Math.max(30, 23.5 / (2 * Math.tan(halfFov) * camera.aspect));
      } else {
        camera.position.z = 30;
      }
      camera.position.x = 0;
      camera.lookAt(0, 0, -0.35);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      clampViewport();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(targetZoom * Math.exp(-e.deltaY * 0.00125), getWorldPoint(e.clientX, e.clientY));
    };
    const onPointerMove = (e: PointerEvent) => {
      if (pointerDown && panAnchor) {
        if (pointerStart.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 4) panning = true;
        if (panning) {
          const current = getWorldPoint(e.clientX, e.clientY);
          if (current) {
            targetPosition.add(panAnchor.clone().sub(current));
            clampViewport();
            panAnchor = current;
          }
          stage.classList.add('is-dragging');
        }
        return;
      }
      const rawId = intersect(e)?.userData.region.id ?? null;
      const id = rawId ? canonicalRegionId(rawId) : null;
      if (id !== hoveredId) {
        hoveredId = id;
        stage.classList.toggle('is-hovering', !!id);
        renderSelection();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pointerDown = true;
      panning = false;
      pointerStart.set(e.clientX, e.clientY);
      panAnchor = getWorldPoint(e.clientX, e.clientY);
      stage.setPointerCapture(e.pointerId);
    };
    const onPointerUp = (e: PointerEvent) => {
      pointerDown = false;
      stage.classList.remove('is-dragging');
      if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
      if (!panning) {
        const hit = intersect(e);
        if (hit) selectedRegionId.set(canonicalRegionId(hit.userData.region.id));
      }
      panAnchor = null;
    };
    const onPointerLeave = () => {
      if (!pointerDown) {
        hoveredId = null;
        renderSelection();
      }
    };

    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointerleave', onPointerLeave);

    resize();
    void loadMap();

    let rafId = 0;
    let lastFrame = 0;
    function animate(time = 0) {
      rafId = requestAnimationFrame(animate);
      if (document.hidden) return;
      const flagsMoving = flagLayer.children.some(
        (flag) =>
          flag.position.distanceToSquared(flag.userData.targetPosition) > 0.002 ||
          Math.abs(flag.scale.x - flag.userData.targetScale) > 0.002,
      );
      const moving =
        pointerDown ||
        flagsMoving ||
        Math.abs(zoom - targetZoom) > 0.001 ||
        Math.abs(mapViewport.position.x - targetPosition.x) > 0.001 ||
        Math.abs(mapViewport.position.y - targetPosition.y) > 0.001 ||
        meshes.some((mesh) => Math.abs(mesh.position.z - mesh.userData.targetLift) > 0.001);
      const frameInterval = moving ? (compactDevice ? 33 : 16) : 200;
      if (time - lastFrame < frameInterval) return;
      const delta = Math.min((time - lastFrame) / 1000, 0.05) || 1 / 30;
      lastFrame = time;
      zoom = reduceMotion ? targetZoom : THREE.MathUtils.damp(zoom, targetZoom, 12, delta);
      mapViewport.scale.setScalar(zoom);
      mapViewport.position.x = reduceMotion ? targetPosition.x : THREE.MathUtils.damp(mapViewport.position.x, targetPosition.x, 12, delta);
      mapViewport.position.y = reduceMotion ? targetPosition.y : THREE.MathUtils.damp(mapViewport.position.y, targetPosition.y, 12, delta);
      meshes.forEach((mesh) => {
        mesh.position.z = reduceMotion ? mesh.userData.targetLift : THREE.MathUtils.damp(mesh.position.z, mesh.userData.targetLift, 15, delta);
      });
      flagLayer.children.forEach((flag) => {
        const target = flag.userData.targetPosition as THREE.Vector3;
        const targetScale = flag.userData.targetScale as number;
        flag.position.x = reduceMotion ? target.x : THREE.MathUtils.damp(flag.position.x, target.x, 9, delta);
        flag.position.y = reduceMotion ? target.y : THREE.MathUtils.damp(flag.position.y, target.y, 9, delta);
        const nextScale = reduceMotion ? targetScale : THREE.MathUtils.damp(flag.scale.x, targetScale, 10, delta);
        flag.scale.setScalar(nextScale);
      });
      renderer.render(scene, camera);
      positionMarkers(camera);
    }
    animate();

    function positionMarkers(cam: THREE.PerspectiveCamera) {
      markers.forEach((marker) => {
        const el = markerRefs.get(marker.key);
        if (!el) return;
        const point = marker.anchor.getWorldPosition(new THREE.Vector3());
        point.project(cam);
        const visible = point.z < 1;
        const screenX = (point.x * 0.5 + 0.5) * innerWidth;
        const screenY = (-point.y * 0.5 + 0.5) * innerHeight;
        el.style.transform = `translate3d(${screenX - 24}px, ${screenY - 24}px, 0)`;
        el.hidden = !visible;
      });
    }

    // Exposed to the template / top-level effects via the outer refs.
    zoomIn = () => setZoom(targetZoom * 1.2, getWorldPoint(innerWidth / 2, innerHeight / 2));
    zoomOut = () => setZoom(targetZoom / 1.2, getWorldPoint(innerWidth / 2, innerHeight / 2));
    zoomReset = () => resetViewport();
    retryMap = () => void loadMap();
    applySelectionImpl = applySelection;
    rebuildMarkersImpl = rebuildMarkers;

    cleanup = () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointerup', onPointerUp);
      stage.removeEventListener('pointerleave', onPointerLeave);
      renderer.dispose();
    };
  });

  onDestroy(() => cleanup());
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="map-stage" bind:this={stageEl} role="application" tabindex="0" aria-label={mapAriaLabel}></div>

{#if mapStatus === 'loading'}
  <p class="map-status" role="status">Загружаем карту…</p>
{:else if mapStatus === 'error'}
  <div class="map-status map-status--error" role="alert">
    <span>Карта временно недоступна.</span>
    <button class="button button--ghost" type="button" onclick={() => retryMap()}>Повторить</button>
  </div>
{/if}

<div class="event-markers" aria-label="Мероприятия на карте">
  {#each markers as marker (marker.key)}
    <button
      class={marker.className}
      type="button"
      aria-label={marker.ariaLabel}
      style="--flag-pulse-width:{marker.pulseWidth};--flag-pulse-left:{marker.pulseLeft};--flag-pulse-height:{marker.pulseHeight};--flag-label-offset:{marker.labelOffset}"
      use:markerRef={marker.key}
      onclick={(event) => {
        event.stopPropagation();
        marker.onclick();
      }}
    >
      <span class="event-marker__pulse"></span>
      <span class="event-marker__label">{marker.label}</span>
    </button>
  {/each}
</div>

<ZoomControls onzoomin={() => zoomIn()} onzoomout={() => zoomOut()} onreset={() => zoomReset()} />
<MapHint />
<p class="map-attribution">
  <span class="map-attribution__item">
    Границы: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a>
  </span>
  <span class="map-attribution__separator"> · </span>
  <span class="map-attribution__item">
    города: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>
  </span>
</p>

<style>
  .map-stage {
    position: absolute;
    inset: 0;
    outline: none;
    touch-action: none;
  }

  :global(.map-stage.is-hovering) {
    cursor: pointer;
  }

  :global(.map-stage.is-dragging) {
    cursor: grabbing;
  }

  .map-stage:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: -5px;
  }

  .map-stage :global(.map-stage__canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .event-markers {
    position: fixed;
    z-index: 4;
    inset: 0;
    pointer-events: none;
  }

  .map-status {
    position: fixed;
    z-index: 6;
    left: 50%;
    top: 50%;
    margin: 0;
    padding: 10px 13px;
    color: #91a9ba;
    background: #071025;
    font: 500 11px 'IBM Plex Mono', monospace;
    transform: translate(-50%, -50%);
  }

  .map-status--error {
    display: flex;
    gap: 12px;
    align-items: center;
    border: 1px solid #35536a;
  }

  .map-attribution {
    position: fixed;
    z-index: 5;
    right: 12px;
    bottom: 8px;
    margin: 0;
    color: #658198;
    font: 500 9px 'IBM Plex Mono', monospace;
    pointer-events: auto;
  }

  .map-attribution a {
    color: #8db5c9;
  }

  .event-marker {
    position: absolute;
    left: 0;
    top: 0;
    display: flex;
    align-items: center;
    width: 48px;
    height: 48px;
    border: 0;
    padding: 0;
    pointer-events: auto;
    cursor: pointer;
    color: #07101d;
    background: none;
    will-change: transform;
  }

  .event-marker::before {
    content: '';
    position: absolute;
    inset: 0;
  }

  .event-marker__pulse {
    position: absolute;
    left: calc(50% + var(--flag-pulse-left, -20px));
    bottom: calc(50% - 7px);
    width: var(--flag-pulse-width, 40px);
    height: var(--flag-pulse-height, 22px);
    border: 1px solid #ff7045;
    border-radius: 50%;
    opacity: 0.52;
    animation: pulse 3.2s infinite;
  }

  :global(.marker--soon) .event-marker__pulse {
    animation-duration: 1.8s;
  }

  :global(.marker--hot) .event-marker__pulse {
    animation-duration: 0.75s;
  }

  .event-marker__label {
    position: absolute;
    left: calc(50% + var(--flag-label-offset, 33px));
    bottom: calc(50% + 5px);
    width: max-content;
    padding: 4px 7px;
    border: 1px solid #315069;
    border-radius: 0;
    color: #a5d7df;
    background: #081227;
    font: 500 9px 'IBM Plex Mono';
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .event-marker:focus-visible {
    outline: none;
  }

  .event-marker:focus-visible .event-marker__label {
    outline: 2px solid white;
    outline-offset: 3px;
  }

  @keyframes pulse {
    0% {
      opacity: 0.7;
      transform: scale(0.45);
    }
    100% {
      opacity: 0;
      transform: scale(1.4);
    }
  }

  .event-marker--split::before {
    inset: 0;
  }

  .event-marker--split .event-marker__label {
    bottom: calc(50% + 2px);
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #ffd1c5;
    border-color: rgba(255, 112, 69, 0.45);
    background: #180d14;
  }

  .event-marker--split .event-marker__pulse {
    opacity: 0.38;
  }

  @media (max-width: 760px) {
    .event-marker__label {
      display: none;
    }

    .map-attribution {
      left: 8px;
      right: 8px;
      bottom: 6px;
      width: calc(100vw - 16px);
      font-size: 8px;
      line-height: 1.45;
      text-align: right;
      overflow-wrap: anywhere;
    }

    .map-attribution__item {
      display: block;
    }

    .map-attribution__separator {
      display: none;
    }
  }
</style>
