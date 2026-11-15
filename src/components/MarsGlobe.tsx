import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  AlertTriangle,
  Compass,
  Globe,
  Grid,
  Layers,
  Loader2,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { JEZERO_CRATER } from '../data/marsData';
import {
  formatAreocentricCoordinates,
  latLonToVector3,
  vector3ToLatLon,
} from '../utils/coordinates';
import {
  ComposedTileTextures,
  getGridDimensions,
  getTileBounds,
  latLonToTileCoord,
  MarsSurfaceMode,
  MarsTileManager,
  tileIntersectsJezeroHirise,
  wrapTileCol,
} from '../utils/marsTileManager';
import {
  LoadedMarsTextures,
  loadNasaMarsTextures,
  resetNasaMarsTextureCache,
} from '../utils/nasaMarsTextures';

const MARS_RADIUS = 1.65;
const DISPLACEMENT_SCALE = 0.052;
const DISPLACEMENT_BIAS = -0.022;
const DEFAULT_CAMERA_LAT = 16;
const DEFAULT_CAMERA_LON = 64;
const DEFAULT_CAMERA_DISTANCE = 4.35;
const JEZERO_FOCUS_DISTANCE = 2.55;
const SUN_DIRECTION = new THREE.Vector3(8, 2.6, 5.4).normalize();

interface ActivePatchSpec {
  id: string;
  z: number;
  row: number;
  col: number;
  lonMin: number;
  lonMax: number;
  latMin: number;
  latMax: number;
  tier: 'context' | 'detail';
  priority: number;
}

interface TelemetrySnapshot {
  zoom: number;
  hasCtx: boolean;
  hasHirise: boolean;
  cameraDist: number;
}

function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function selectDetailZoom(
  dist: number,
  mode: MarsSurfaceMode,
  isSoftwareGl: boolean
): number {
  const maxZ = isSoftwareGl ? 7 : 12;
  let z = 2;
  if (dist <= 1.682) z = 12;
  else if (dist <= 1.70) z = 11;
  else if (dist <= 1.735) z = 10;
  else if (dist <= 1.80) z = 9;
  else if (dist <= 1.92) z = 8;
  else if (dist <= 2.12) z = 7;
  else if (dist <= 2.45) z = 6;
  else if (dist <= 2.95) z = 5;
  else if (dist <= 3.60) z = 4;
  else if (dist <= 4.75 || mode === 'ctx') z = 3;

  return Math.min(maxZ, z);
}

function computePatchGrid(
  centerLat: number,
  centerLon: number,
  detailZoom: number
): ActivePatchSpec[] {
  const patches: ActivePatchSpec[] = [];
  if (detailZoom < 3) return patches;

  const addWindow = (
    z: number,
    latRadiusCount: number,
    lonRadiusBase: number,
    tier: 'context' | 'detail',
    basePriority: number
  ) => {
    const { cols, rows } = getGridDimensions(z);
    const center = latLonToTileCoord(centerLat, centerLon, z);
    const latCos = Math.max(0.35, Math.cos(THREE.MathUtils.degToRad(centerLat)));
    const lonRadius = Math.min(
      Math.floor((cols - 1) / 2),
      Math.max(lonRadiusBase, Math.round(lonRadiusBase / latCos))
    );
    // Keep tile count bounded even near high latitudes
    const clampedLonRadius = Math.min(3, lonRadius);

    for (let dr = -latRadiusCount; dr <= latRadiusCount; dr++) {
      const row = center.row + dr;
      if (row < 0 || row >= rows) continue;
      for (let dc = -clampedLonRadius; dc <= clampedLonRadius; dc++) {
        const col = wrapTileCol(center.col + dc, cols);
        const unwrappedLonMin = -180 + ((center.col + dc) / cols) * 360;
        const unwrappedLonMax = -180 + ((center.col + dc + 1) / cols) * 360;
        const bounds = getTileBounds(z, row, col);
        const distSq = dr * dr + dc * dc;

        patches.push({
          id: `${tier}:${z}/${row}/${col}:${center.col + dc}`,
          z,
          row,
          col,
          lonMin: unwrappedLonMin,
          lonMax: unwrappedLonMax,
          latMin: bounds.latMin,
          latMax: bounds.latMax,
          tier,
          priority: basePriority + distSq,
        });
      }
    }
  };

  if (detailZoom >= 5) {
    const contextZ = Math.max(3, detailZoom - 2);
    addWindow(contextZ, 1, 1, 'context', 100);
  }

  const latR = detailZoom >= 12 ? 1 : detailZoom === 3 ? 1 : 2;
  const lonR = detailZoom >= 12 ? 2 : detailZoom === 3 ? 2 : 2;
  addWindow(detailZoom, latR, lonR, 'detail', 0);

  return patches;
}

function buildSphericalPatchGeometry(
  patch: ActivePatchSpec,
  sampleElevationNormalized: (latDeg: number, lonDeg: number) => number
): THREE.BufferGeometry {
  const segs = patch.z <= 4 ? 24 : patch.z <= 7 ? 16 : 10;
  const count = (segs + 1) * (segs + 1);
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const indices: number[] = [];

  const radialLift = patch.tier === 'detail' ? 0.0024 : 0.0014;
  const lonSpan = patch.lonMax - patch.lonMin;
  const latSpan = patch.latMax - patch.latMin;
  const epsDeg = Math.min(0.14, Math.max(0.002, lonSpan / 18));

  const pCenter = new THREE.Vector3();
  const pEast = new THREE.Vector3();
  const pWest = new THREE.Vector3();
  const pNorth = new THREE.Vector3();
  const pSouth = new THREE.Vector3();
  const tEast = new THREE.Vector3();
  const tNorth = new THREE.Vector3();
  const nVec = new THREE.Vector3();

  const radiusAt = (latDeg: number, lonDeg: number) => {
    const normElev = sampleElevationNormalized(latDeg, lonDeg);
    return MARS_RADIUS + normElev * DISPLACEMENT_SCALE + DISPLACEMENT_BIAS + radialLift;
  };

  let vIdx = 0;
  let uvIdx = 0;

  for (let iy = 0; iy <= segs; iy++) {
    const v = iy / segs;
    const lat = patch.latMin + v * latSpan;
    const latN = Math.min(89.95, lat + epsDeg);
    const latS = Math.max(-89.95, lat - epsDeg);

    for (let ix = 0; ix <= segs; ix++) {
      const u = ix / segs;
      const lon = patch.lonMin + u * lonSpan;

      latLonToVector3(lat, lon, radiusAt(lat, lon), pCenter);
      positions[vIdx] = pCenter.x;
      positions[vIdx + 1] = pCenter.y;
      positions[vIdx + 2] = pCenter.z;

      // Analytical finite-difference MOLA surface normal so adjacent patches have zero lighting seams
      latLonToVector3(lat, lon + epsDeg, radiusAt(lat, lon + epsDeg), pEast);
      latLonToVector3(lat, lon - epsDeg, radiusAt(lat, lon - epsDeg), pWest);
      latLonToVector3(latN, lon, radiusAt(latN, lon), pNorth);
      latLonToVector3(latS, lon, radiusAt(latS, lon), pSouth);

      tEast.subVectors(pEast, pWest);
      tNorth.subVectors(pNorth, pSouth);
      nVec.crossVectors(tEast, tNorth).normalize();

      normals[vIdx] = nVec.x;
      normals[vIdx + 1] = nVec.y;
      normals[vIdx + 2] = nVec.z;

      uvs[uvIdx] = u;
      uvs[uvIdx + 1] = v;

      vIdx += 3;
      uvIdx += 2;
    }
  }

  const stride = segs + 1;
  for (let iy = 0; iy < segs; iy++) {
    for (let ix = 0; ix < segs; ix++) {
      const i00 = iy * stride + ix;
      const i10 = i00 + 1;
      const i01 = (iy + 1) * stride + ix;
      const i11 = i01 + 1;
      indices.push(i00, i10, i11);
      indices.push(i00, i11, i01);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

interface TilePatchMeshProps {
  patch: ActivePatchSpec;
  surfaceMode: MarsSurfaceMode;
  tileManager: MarsTileManager;
  sampleElevationNormalized: (latDeg: number, lonDeg: number) => number;
  reducedMotion: boolean;
  onInspectCoords?: (coords: { latDeg: number; lonDeg: number }) => void;
  onTileStatus?: (info: { z: number; hasCtx: boolean; hasHirise: boolean }) => void;
}

function TilePatchMesh({
  patch,
  surfaceMode,
  tileManager,
  sampleElevationNormalized,
  reducedMotion,
  onInspectCoords,
  onTileStatus,
}: TilePatchMeshProps) {
  const [composed, setComposed] = useState<ComposedTileTextures | null>(() =>
    tileManager.getCached(`${surfaceMode}:${patch.z}/${patch.row}/${patch.col}`) ?? null
  );
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const fadeStartRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `${surfaceMode}:${patch.z}/${patch.row}/${patch.col}`;
    const existing = tileManager.getCached(cacheKey);
    if (existing) {
      setComposed(existing);
      fadeStartRef.current = performance.now();
      onTileStatus?.({
        z: existing.z,
        hasCtx: existing.hasCtx,
        hasHirise: existing.hasHirise,
      });
      return;
    }

    setComposed(null);
    tileManager
      .requestTile(patch.z, patch.row, patch.col, surfaceMode, patch.priority)
      .then((res) => {
        if (cancelled || !res) return;
        fadeStartRef.current = performance.now();
        setComposed(res);
        onTileStatus?.({
          z: res.z,
          hasCtx: res.hasCtx,
          hasHirise: res.hasHirise,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [patch.z, patch.row, patch.col, patch.priority, surfaceMode, tileManager, onTileStatus]);

  const geometry = useMemo(
    () => buildSphericalPatchGeometry(patch, sampleElevationNormalized),
    [patch, sampleElevationNormalized]
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame(() => {
    const mat = materialRef.current;
    if (!mat || !composed) return;
    if (reducedMotion || fadeStartRef.current === null) {
      if (mat.opacity !== 1 || mat.transparent) {
        mat.opacity = 1;
        mat.transparent = false;
        mat.depthWrite = true;
        mat.needsUpdate = true;
      }
      return;
    }

    const elapsed = (performance.now() - fadeStartRef.current) / 180;
    if (elapsed >= 1) {
      mat.opacity = 1;
      mat.transparent = false;
      mat.depthWrite = true;
      mat.needsUpdate = true;
      fadeStartRef.current = null;
    } else {
      mat.opacity = Math.max(0.05, elapsed);
      mat.transparent = true;
      mat.depthWrite = false;
    }
  });

  if (!composed) return null;

  return (
    <mesh
      geometry={geometry}
      renderOrder={patch.tier === 'detail' ? 2 : 1}
      onClick={
        onInspectCoords
          ? (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onInspectCoords(vector3ToLatLon(e.point));
            }
          : undefined
      }
    >
      <meshStandardMaterial
        ref={materialRef}
        map={composed.colorTexture}
        bumpMap={composed.bumpTexture}
        bumpScale={patch.z >= 9 ? 0.01 : 0.014}
        roughness={0.93}
        metalness={0.01}
        polygonOffset
        polygonOffsetFactor={patch.tier === 'detail' ? -3 : -1}
        polygonOffsetUnits={patch.tier === 'detail' ? -3 : -1}
        transparent={!reducedMotion}
        opacity={reducedMotion ? 1 : 0.05}
        depthWrite={reducedMotion}
      />
    </mesh>
  );
}

function buildGraticuleGeometry(radius: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const stepDeg = 6;
  const point = new THREE.Vector3();

  for (let lat = -60; lat <= 60; lat += 30) {
    for (let lon = -180; lon < 180; lon += stepDeg) {
      latLonToVector3(lat, lon, radius, point);
      positions.push(point.x, point.y, point.z);
      latLonToVector3(lat, lon + stepDeg, radius, point);
      positions.push(point.x, point.y, point.z);
    }
  }

  for (let lon = -180; lon < 180; lon += 30) {
    for (let lat = -84; lat < 84; lat += stepDeg) {
      latLonToVector3(lat, lon, radius, point);
      positions.push(point.x, point.y, point.z);
      latLonToVector3(lat + stepDeg, lon, radius, point);
      positions.push(point.x, point.y, point.z);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function createAtmosphericLimbMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: { value: SUN_DIRECTION.clone() },
      uRimColor: { value: new THREE.Color('#D6805C') },
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      uniform vec3 uRimColor;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;

      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 v = normalize(vViewDir);
        float ndotv = clamp(dot(n, v), 0.0, 1.0);
        float rim = pow(1.0 - ndotv, 5.2);
        float sunTerm = smoothstep(-0.18, 0.55, dot(n, normalize(uSunDir)));
        float alpha = rim * mix(0.015, 0.22, sunTerm);
        gl_FragColor = vec4(uRimColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
}

interface MarsSceneProps {
  textures: LoadedMarsTextures;
  surfaceMode: MarsSurfaceMode;
  showGrid: boolean;
  autoRotate: boolean;
  isSoftwareGl: boolean;
  reducedMotion: boolean;
  cameraGoalRef: React.MutableRefObject<THREE.Vector3 | null>;
  jezeroOverlayRef: React.RefObject<HTMLDivElement | null>;
  onSelectJezero?: () => void;
  onInspectCoords?: (coords: { latDeg: number; lonDeg: number } | null) => void;
  onTelemetryChange: (snapshot: TelemetrySnapshot) => void;
  onPendingTilesChange: (pending: number) => void;
}

const _camDir = new THREE.Vector3();
const _markerDir = new THREE.Vector3();
const _projVec = new THREE.Vector3();

function MarsScene({
  textures,
  surfaceMode,
  showGrid,
  autoRotate,
  isSoftwareGl,
  reducedMotion,
  cameraGoalRef,
  jezeroOverlayRef,
  onSelectJezero,
  onInspectCoords,
  onTelemetryChange,
  onPendingTilesChange,
}: MarsSceneProps) {
  const { camera, size } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [activePatches, setActivePatches] = useState<ActivePatchSpec[]>([]);
  const patchSignatureRef = useRef<string>('');
  const ctxVerifiedRef = useRef<boolean>(false);
  const hiriseVerifiedRef = useRef<boolean>(false);

  const tileManager = useMemo(
    () =>
      new MarsTileManager(
        textures.colorCanvas,
        textures.elevationCanvas,
        isSoftwareGl ? 2 : 8,
        onPendingTilesChange
      ),
    [textures.colorCanvas, textures.elevationCanvas, isSoftwareGl, onPendingTilesChange]
  );

  useEffect(() => {
    return () => {
      tileManager.disposeAll();
    };
  }, [tileManager]);

  const graticuleGeometry = useMemo(
    () => buildGraticuleGeometry(MARS_RADIUS + DISPLACEMENT_SCALE + DISPLACEMENT_BIAS + 0.008),
    []
  );

  const atmosphereMaterial = useMemo(() => createAtmosphericLimbMaterial(), []);

  useEffect(() => {
    return () => {
      graticuleGeometry.dispose();
      atmosphereMaterial.dispose();
    };
  }, [graticuleGeometry, atmosphereMaterial]);

  // Place Jezero Crater marker directly on the MOLA-displaced planetary surface
  const jezeroSurfaceRadius = useMemo(() => {
    const normElev = textures.sampleElevationNormalized(
      JEZERO_CRATER.approxLat,
      JEZERO_CRATER.approxLon
    );
    return MARS_RADIUS + normElev * DISPLACEMENT_SCALE + DISPLACEMENT_BIAS;
  }, [textures]);

  const jezeroSurfacePos = useMemo(
    () =>
      latLonToVector3(
        JEZERO_CRATER.approxLat,
        JEZERO_CRATER.approxLon,
        jezeroSurfaceRadius
      ),
    [jezeroSurfaceRadius]
  );

  const jezeroLabelAnchor = useMemo(
    () =>
      latLonToVector3(
        JEZERO_CRATER.approxLat,
        JEZERO_CRATER.approxLon,
        jezeroSurfaceRadius + 0.165
      ),
    [jezeroSurfaceRadius]
  );

  const jezeroOrientation = useMemo(() => {
    const normal = jezeroSurfacePos.clone().normalize();
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      normal
    );
  }, [jezeroSurfacePos]);

  const handleTileStatus = useCallback(
    (info: { z: number; hasCtx: boolean; hasHirise: boolean }) => {
      if (info.hasCtx) ctxVerifiedRef.current = true;
      if (info.hasHirise) hiriseVerifiedRef.current = true;
    },
    []
  );

  useFrame((_, delta) => {
    const goal = cameraGoalRef.current;
    if (goal) {
      if (isSoftwareGl || reducedMotion) {
        camera.position.copy(goal);
        camera.lookAt(0, 0, 0);
        cameraGoalRef.current = null;
      } else {
        const alpha = 1 - Math.exp(-5.5 * Math.min(delta, 0.1));
        camera.position.lerp(goal, alpha);
        camera.lookAt(0, 0, 0);
        if (camera.position.distanceTo(goal) < 0.012) {
          camera.position.copy(goal);
          cameraGoalRef.current = null;
        }
      }
      controlsRef.current?.update();
    }

    // Sub-camera surface coordinates & dynamic MOLA-aware minimum orbital altitude
    const camDist = camera.position.length();
    const camCoords = vector3ToLatLon(camera.position);

    if (controlsRef.current) {
      const localElev = textures.sampleElevationNormalized(
        camCoords.latDeg,
        camCoords.lonDeg
      );
      const localSurfaceRadius =
        MARS_RADIUS + localElev * DISPLACEMENT_SCALE + DISPLACEMENT_BIAS;
      controlsRef.current.minDistance = localSurfaceRadius + 0.026;
      // Scale zoom/rotate sensitivity smoothly when flying close to craters
      const altitudeRatio = THREE.MathUtils.clamp((camDist - localSurfaceRadius) / 2.5, 0.06, 1);
      controlsRef.current.rotateSpeed = 0.18 + 0.48 * altitudeRatio;
      controlsRef.current.zoomSpeed = 0.45 + 0.4 * altitudeRatio;
    }

    // Compute active progressive regional tile grid
    const detailZoom = selectDetailZoom(camDist, surfaceMode, isSoftwareGl);
    const centerTile = latLonToTileCoord(
      camCoords.latDeg,
      camCoords.lonDeg,
      detailZoom
    );
    const sig = `${surfaceMode}:${detailZoom}:${centerTile.row}:${centerTile.col}`;

    if (sig !== patchSignatureRef.current) {
      patchSignatureRef.current = sig;
      const nextPatches = computePatchGrid(
        camCoords.latDeg,
        camCoords.lonDeg,
        detailZoom
      );
      const desiredIds = new Set(
        nextPatches.map((p) => `${p.z}/${p.row}/${p.col}`)
      );
      tileManager.setDesiredKeys(desiredIds);
      setActivePatches(nextPatches);

      const overJezero =
        detailZoom >= 9 &&
        nextPatches.some((p) =>
          tileIntersectsJezeroHirise(getTileBounds(p.z, p.row, p.col))
        );

      onTelemetryChange({
        zoom: detailZoom,
        hasCtx: surfaceMode !== 'viking' && (detailZoom >= 3 || ctxVerifiedRef.current),
        hasHirise:
          surfaceMode !== 'viking' && overJezero && hiriseVerifiedRef.current,
        cameraDist: camDist,
      });
    }

    // Project Jezero Crater marker label to DOM overlay with horizon occlusion
    const overlay = jezeroOverlayRef.current;
    if (overlay) {
      _camDir.copy(camera.position).normalize();
      _markerDir.copy(jezeroSurfacePos).normalize();
      const dot = _camDir.dot(_markerDir);

      _projVec.copy(jezeroLabelAnchor).project(camera);
      const inFront = _projVec.z >= -1 && _projVec.z <= 1;
      const visible = dot > 0.12 && inFront;

      if (visible) {
        const x = (_projVec.x * 0.5 + 0.5) * size.width;
        const y = (-_projVec.y * 0.5 + 0.5) * size.height;
        overlay.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'auto';
      } else {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
      }
    }
  });

  const handleSurfaceClick = (e: ThreeEvent<MouseEvent>) => {
    if (!onInspectCoords) return;
    e.stopPropagation();
    const coords = vector3ToLatLon(e.point);
    onInspectCoords(coords);
  };

  return (
    <>
      <color attach="background" args={['#06070A']} />

      {/* Subtle deep-space starfield */}
      <Stars
        radius={45}
        depth={30}
        count={isSoftwareGl ? 600 : 1600}
        factor={2.2}
        saturation={0}
        fade={false}
        speed={0}
      />

      {/* Single fixed solar directional illumination for authentic planetary terminator + subtle deep-space fill */}
      <ambientLight intensity={0.032} color="#8FA4C4" />
      <hemisphereLight args={['#D6C7BE', '#080B12', 0.048]} />
      <directionalLight
        position={[8, 2.6, 5.4]}
        intensity={2.95}
        color="#FFF5EB"
      />

      {/* Global baseline Mars sphere: NASA Viking MDIM 2.1 Color + MGS MOLA Global DEM */}
      <mesh onClick={handleSurfaceClick} renderOrder={0}>
        <sphereGeometry
          args={[
            MARS_RADIUS,
            isSoftwareGl ? 160 : 320,
            isSoftwareGl ? 80 : 160,
          ]}
        />
        <meshStandardMaterial
          map={textures.colorMap}
          displacementMap={textures.elevationMap}
          displacementScale={DISPLACEMENT_SCALE}
          displacementBias={DISPLACEMENT_BIAS}
          bumpMap={textures.elevationMap}
          bumpScale={0.018}
          roughness={0.93}
          metalness={0.01}
        />
      </mesh>

      {/* Progressive regional high-resolution surface tiles (Viking + Caltech CTX + Jezero HiRISE + MOLA bump) */}
      {activePatches.map((patch) => (
        <TilePatchMesh
          key={`${surfaceMode}:${patch.id}`}
          patch={patch}
          surfaceMode={surfaceMode}
          tileManager={tileManager}
          sampleElevationNormalized={textures.sampleElevationNormalized}
          reducedMotion={reducedMotion}
          onInspectCoords={onInspectCoords}
          onTileStatus={handleTileStatus}
        />
      ))}

      {/* Subtle illustrative Fresnel atmospheric limb scatter */}
      <mesh material={atmosphereMaterial} renderOrder={3}>
        <sphereGeometry args={[MARS_RADIUS * 1.028, 64, 64]} />
      </mesh>

      {/* Optional planetary latitude/longitude graticule */}
      {showGrid && (
        <lineSegments geometry={graticuleGeometry} renderOrder={4}>
          <lineBasicMaterial color="#9CA3AF" transparent opacity={0.18} />
        </lineSegments>
      )}

      {/* Jezero Crater precision surface marker (~18.4° N, 77.4° E) */}
      <group
        position={jezeroSurfacePos}
        quaternion={jezeroOrientation}
        onClick={(e) => {
          e.stopPropagation();
          onSelectJezero?.();
        }}
      >
        <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.045, 0.061, 32]} />
          <meshBasicMaterial color="#E6643C" side={THREE.DoubleSide} />
        </mesh>

        <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.016, 24]} />
          <meshBasicMaterial color="#FFFFFF" side={THREE.DoubleSide} />
        </mesh>

        <mesh position={[0, 0.065, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.115, 12]} />
          <meshBasicMaterial color="#E6643C" />
        </mesh>

        <mesh position={[0, 0.125, 0]}>
          <sphereGeometry args={[0.015, 16, 16]} />
          <meshBasicMaterial color="#F59E0B" />
        </mesh>
      </group>

      <OrbitControls
        ref={controlsRef}
        target={[0, 0, 0]}
        enablePan={false}
        enableRotate
        enableZoom
        minDistance={1.68}
        maxDistance={7.4}
        rotateSpeed={0.62}
        zoomSpeed={0.8}
        enableDamping={!isSoftwareGl && !reducedMotion}
        dampingFactor={0.06}
        autoRotate={autoRotate && !isSoftwareGl && !reducedMotion}
        autoRotateSpeed={0.42}
        onStart={() => {
          cameraGoalRef.current = null;
        }}
      />
    </>
  );
}

export interface MarsGlobeProps {
  heightClassName?: string;
  initialFocusJezero?: boolean;
  showInspectReadout?: boolean;
  onSelectJezero?: () => void;
}

const SURFACE_MODE_LABELS: { id: MarsSurfaceMode; label: string }[] = [
  { id: 'fusion', label: 'Color + CTX' },
  { id: 'ctx', label: 'CTX Mono' },
  { id: 'viking', label: 'Viking' },
];

export function MarsGlobe({
  heightClassName = 'h-[420px] sm:h-[480px] lg:h-[540px]',
  initialFocusJezero = false,
  showInspectReadout = false,
  onSelectJezero,
}: MarsGlobeProps) {
  const [showGrid, setShowGrid] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [surfaceMode, setSurfaceMode] = useState<MarsSurfaceMode>('fusion');
  const [contextLost, setContextLost] = useState(false);
  const [textures, setTextures] = useState<LoadedMarsTextures | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingTiles, setPendingTiles] = useState(0);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>({
    zoom: 2,
    hasCtx: false,
    hasHirise: false,
    cameraDist: DEFAULT_CAMERA_DISTANCE,
  });
  const [inspectedCoords, setInspectedCoords] = useState<{
    latDeg: number;
    lonDeg: number;
  } | null>(null);

  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);
  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const fetchTextures = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    loadNasaMarsTextures(isSoftwareGl ? 2 : 8)
      .then((loaded) => {
        if (cancelled) return;
        setTextures(loaded);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to load NASA Mars planetary texture assets.';
        setLoadError(msg);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isSoftwareGl]);

  useEffect(() => {
    return fetchTextures();
  }, [fetchTextures]);

  const handleRetryTextures = () => {
    resetNasaMarsTextureCache();
    fetchTextures();
  };

  const initialCameraPosition = useMemo(() => {
    const lat = initialFocusJezero ? JEZERO_CRATER.approxLat : DEFAULT_CAMERA_LAT;
    const lon = initialFocusJezero ? JEZERO_CRATER.approxLon : DEFAULT_CAMERA_LON;
    const dist = initialFocusJezero
      ? JEZERO_FOCUS_DISTANCE + 0.3
      : DEFAULT_CAMERA_DISTANCE;
    const v = latLonToVector3(lat, lon, dist);
    return [v.x, v.y, v.z] as [number, number, number];
  }, [initialFocusJezero]);

  const cameraGoalRef = useRef<THREE.Vector3 | null>(null);
  const jezeroOverlayRef = useRef<HTMLDivElement | null>(null);

  const focusJezero = () => {
    setAutoRotate(false);
    cameraGoalRef.current = latLonToVector3(
      JEZERO_CRATER.approxLat,
      JEZERO_CRATER.approxLon,
      JEZERO_FOCUS_DISTANCE
    );
    onSelectJezero?.();
  };

  const resetView = () => {
    setAutoRotate(false);
    setInspectedCoords(null);
    cameraGoalRef.current = latLonToVector3(
      DEFAULT_CAMERA_LAT,
      DEFAULT_CAMERA_LON,
      DEFAULT_CAMERA_DISTANCE
    );
  };

  const activeLayerText = useMemo(() => {
    if (telemetry.zoom <= 2) {
      return 'NASA Viking MDIM 2.1 + MGS MOLA DEM (Global Z2)';
    }
    if (surfaceMode === 'viking') {
      return `NASA Viking MDIM 2.1 Color + MOLA DEM · Regional Z${Math.min(telemetry.zoom, 7)}`;
    }
    if (surfaceMode === 'ctx') {
      return telemetry.hasHirise
        ? `Caltech CTX + Jezero HiRISE Ortho + MOLA · Regional Z${telemetry.zoom}`
        : `Caltech MRO CTX Beta01 + MOLA DEM · Regional Z${telemetry.zoom}`;
    }
    return telemetry.hasHirise
      ? `Viking Color + Caltech CTX + Jezero HiRISE + MOLA · Z${telemetry.zoom}`
      : `Viking Color + Caltech MRO CTX + MOLA DEM · Z${telemetry.zoom}`;
  }, [surfaceMode, telemetry]);

  return (
    <div
      className={`relative w-full ${heightClassName} bg-[#06070A] border border-[#232732] rounded-lg overflow-hidden`}
    >
      {/* Top-left NASA/Caltech dataset attribution & active zoom readout */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none max-w-[calc(100%-24px)] flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#111318]/92 border border-[#232732] rounded text-xs text-[#C7CCD6]">
          <Globe className="w-3.5 h-3.5 text-[#D9532F] shrink-0" />
          <span className="truncate">{activeLayerText}</span>
          {pendingTiles > 0 && (
            <Loader2 className="w-3.5 h-3.5 text-[#F39C82] animate-spin shrink-0" />
          )}
        </div>
      </div>

      {/* Optional surface-click coordinate readout */}
      {showInspectReadout && inspectedCoords && (
        <div className="absolute top-3 right-3 z-10 px-2.5 py-1 bg-[#111318]/92 border border-[#232732] rounded text-xs">
          <span className="text-[#9CA3AF] mr-2">Sampled point (approx.):</span>
          <span className="font-mono tabular-nums text-[#E6E8EC]">
            {formatAreocentricCoordinates(
              inspectedCoords.latDeg,
              inspectedCoords.lonDeg
            )}
          </span>
        </div>
      )}

      {contextLost ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#0B0D12]">
          <Globe className="w-8 h-8 text-[#D9532F] mb-3" />
          <p className="text-sm font-medium text-[#E6E8EC] mb-1">
            3D WebGL viewport unavailable
          </p>
          <p className="text-xs text-[#9CA3AF] max-w-md">
            Your browser or graphics context paused WebGL rendering. Jezero Crater
            reference coordinates remain available at {JEZERO_CRATER.coordinateLabel}.
          </p>
        </div>
      ) : loadError ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#0B0D12]">
          <AlertTriangle className="w-8 h-8 text-[#D9532F] mb-3" />
          <p className="text-sm font-medium text-[#E6E8EC] mb-1">
            Unable to load NASA planetary surface imagery
          </p>
          <p className="text-xs text-[#9CA3AF] max-w-md mb-4">{loadError}</p>
          <button
            type="button"
            onClick={handleRetryTextures}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#D9532F] hover:bg-[#B64223] rounded transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Loading NASA Data</span>
          </button>
        </div>
      ) : loading || !textures ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#0B0D12]">
          <Loader2 className="w-7 h-7 text-[#D9532F] animate-spin mb-3" />
          <p className="text-sm font-medium text-[#E6E8EC] mb-1">
            Loading NASA Mars Surface Datasets
          </p>
          <p className="text-xs text-[#9CA3AF]">
            Viking MDIM 2.1 Global Color Mosaic &amp; MGS MOLA Global DEM (2048×1024)
          </p>
        </div>
      ) : (
        <>
          <Canvas
            camera={{
              position: initialCameraPosition,
              fov: 38,
              near: 0.008,
              far: 120,
            }}
            dpr={isSoftwareGl ? 1 : [1, 2]}
            gl={{
              antialias: !isSoftwareGl,
              powerPreference: 'high-performance',
            }}
            onCreated={({ gl }) => {
              gl.outputColorSpace = THREE.SRGBColorSpace;
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.02;

              const canvas = gl.domElement;
              const handleLost = (e: Event) => {
                e.preventDefault();
                setContextLost(true);
              };
              const handleRestored = () => {
                setContextLost(false);
              };
              canvas.addEventListener('webglcontextlost', handleLost, false);
              canvas.addEventListener('webglcontextrestored', handleRestored, false);
            }}
          >
            <MarsScene
              textures={textures}
              surfaceMode={surfaceMode}
              showGrid={showGrid}
              autoRotate={autoRotate}
              isSoftwareGl={isSoftwareGl}
              reducedMotion={reducedMotion}
              cameraGoalRef={cameraGoalRef}
              jezeroOverlayRef={jezeroOverlayRef}
              onSelectJezero={onSelectJezero}
              onInspectCoords={showInspectReadout ? setInspectedCoords : undefined}
              onTelemetryChange={setTelemetry}
              onPendingTilesChange={setPendingTiles}
            />
          </Canvas>

          {/* Horizon-occluded projected DOM marker label */}
          <div
            ref={jezeroOverlayRef}
            style={{ opacity: 0, pointerEvents: 'none' }}
            className="absolute top-0 left-0 z-10 pb-1 transition-opacity duration-150 select-none will-change-transform"
          >
            <button
              type="button"
              onClick={focusJezero}
              className="flex items-center gap-2 px-2.5 py-1 bg-[#111318]/92 border border-[#D9532F]/70 rounded text-left whitespace-nowrap hover:border-[#D9532F] focus-visible:outline-2 focus-visible:outline-[#D9532F] cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9532F] shrink-0" />
              <span className="text-[11px] font-medium text-[#F3F4F6]">
                Jezero Crater
              </span>
              <span className="text-[11px] font-mono tabular-nums text-[#9CA3AF]">
                ~18.4° N, 77.4° E
              </span>
            </button>
          </div>
        </>
      )}

      {/* Bottom control dock */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-1 p-1 bg-[#111318]/92 border border-[#232732] rounded-md pointer-events-auto">
          <Layers className="w-3.5 h-3.5 text-[#9CA3AF] ml-1.5 mr-1 shrink-0" />
          {SURFACE_MODE_LABELS.map((item) => {
            const active = surfaceMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSurfaceMode(item.id)}
                aria-pressed={active}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#D9532F]/25 text-[#F7B29B]'
                    : 'text-[#9CA3AF] hover:text-white hover:bg-[#1C2029]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#111318]/92 border border-[#232732] rounded-md pointer-events-auto ml-auto">
          <button
            type="button"
            onClick={focusJezero}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#E6E8EC] hover:text-white hover:bg-[#1C2029] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-[#D9532F]" />
            <span>Focus Jezero</span>
          </button>

          <button
            type="button"
            onClick={resetView}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#9CA3AF] hover:text-white hover:bg-[#1C2029] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGrid((prev) => !prev)}
            aria-pressed={showGrid}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showGrid
                ? 'bg-[#1D222C] text-white'
                : 'text-[#9CA3AF] hover:text-white hover:bg-[#1C2029]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>

          {!isSoftwareGl && !reducedMotion && (
            <button
              type="button"
              onClick={() => setAutoRotate((prev) => !prev)}
              aria-pressed={autoRotate}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                autoRotate
                  ? 'bg-[#D9532F]/20 text-[#F39C82]'
                  : 'text-[#9CA3AF] hover:text-white hover:bg-[#1C2029]'
              }`}
            >
              {autoRotate ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>Spin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
