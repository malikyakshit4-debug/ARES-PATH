import { Projection, addProjection } from 'ol/proj';
import WMTSTileGrid from 'ol/tilegrid/WMTS';

/**
 * IAU 2000 Mars equatorial sphere radius (meters) used by NASA Mars Trek EPSG:104905
 * Simple Cylindrical / Equirectangular projection.
 */
export const MARS_EQUATORIAL_RADIUS_M = 3_396_190;
export const MARS_METERS_PER_DEGREE = (2 * Math.PI * MARS_EQUATORIAL_RADIUS_M) / 360;
export const MARS_PROJECTION_CODE = 'EPSG:104905';
export const MARS_WORLD_EXTENT: [number, number, number, number] = [-180, -90, 180, 90];

export const JEZERO_MAP_CENTER = {
  lat: 18.4,
  lon: 77.4,
  name: 'Jezero Crater',
};

/**
 * Verified bounding boxes from NASA Mars Trek WMTSCapabilities.xml
 */
export const JEZERO_CTX_EXTENT: [number, number, number, number] = [
  77.1604655,
  18.2110274,
  77.6991776,
  18.7211945,
];

export const JEZERO_HIRISE_EXTENT: [number, number, number, number] = [
  77.2229331,
  18.3067994,
  77.583964,
  18.669315,
];

export const THEMIS_CONTROLLED_EXTENT: [number, number, number, number] = [
  -179.9999997,
  -65.0006576,
  179.9998849,
  65.0007535,
];

export const MOLA_CLRSHADE_EXTENT: [number, number, number, number] = [
  -180.0,
  -89.9991635,
  179.9983271,
  90.0,
];

let registeredMarsProjection: Projection | null = null;

/**
 * Registers and returns the Mars Equirectangular projection (EPSG:104905)
 * with true Mars meters-per-degree scaling so OpenLayers ScaleLine measures
 * planetary distances accurately rather than defaulting to Earth's radius.
 */
export function getMarsProjection(): Projection {
  if (registeredMarsProjection) {
    return registeredMarsProjection;
  }

  const projection = new Projection({
    code: MARS_PROJECTION_CODE,
    units: 'degrees',
    extent: MARS_WORLD_EXTENT,
    worldExtent: MARS_WORLD_EXTENT,
    global: true,
    axisOrientation: 'enu',
    metersPerUnit: MARS_METERS_PER_DEGREE,
    getPointResolution: (resolution: number, point: number[]) => {
      const latDeg = Math.max(-85, Math.min(85, point?.[1] ?? 0));
      return resolution * Math.cos((latDeg * Math.PI) / 180);
    },
  });

  addProjection(projection);
  registeredMarsProjection = projection;
  return projection;
}

/**
 * Builds an OpenLayers WMTSTileGrid matching NASA Mars Trek's `default028mm`
 * 2:1 Equirectangular pyramid (Zoom 0 = 2 cols x 1 row of 256px tiles = 0.703125 deg/px).
 */
export function createMarsWmtsTileGrid(maxZoom: number): WMTSTileGrid {
  const resolutions: number[] = [];
  const matrixIds: string[] = [];

  for (let z = 0; z <= maxZoom; z++) {
    resolutions.push(360 / (512 * Math.pow(2, z)));
    matrixIds.push(String(z));
  }

  return new WMTSTileGrid({
    origin: [-180, 90],
    resolutions,
    matrixIds,
    tileSize: 256,
  });
}

export type MarsBaseLayerId =
  | 'ctx-jezero'
  | 'ctx-global'
  | 'mola-clrshade'
  | 'themis-day-ir'
  | 'themis-night-ir'
  | 'viking-color';

export type MarsOverlayLayerId =
  | 'hirise-jezero'
  | 'mola-overlay'
  | 'themis-day-overlay';

export interface MarsWmtsLayerMeta {
  id: string;
  wmtsIdentifier: string;
  label: string;
  shortLabel: string;
  instrument: string;
  resolutionLabel: string;
  dataKind: 'Direct Orbital Observation' | 'Derived Terrain Visualization';
  coverageLabel: string;
  extent: [number, number, number, number];
  maxZoom: number;
  minRecommendedZoom?: number;
  format: 'image/png' | 'image/jpeg';
  serviceType: 'wmts' | 'xyz';
  tileUrlTemplate: string;
  capabilitiesUrl: string;
  attribution: string;
  scientificExplanation: string;
  caveat: string;
}

export const MARS_BASE_LAYERS: Record<MarsBaseLayerId, MarsWmtsLayerMeta> = {
  'ctx-jezero': {
    id: 'ctx-jezero',
    wmtsIdentifier: 'JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0',
    label: 'CTX Jezero Mosaic (6 m/px) + Global CTX',
    shortLabel: 'CTX Imagery',
    instrument: 'MRO Context Camera (CTX)',
    resolutionLabel: '6 m/px (Jezero Controlled) · ~5 m/px (Surrounding CTX)',
    dataKind: 'Direct Orbital Observation',
    coverageLabel: 'Jezero controlled mosaic: 77.16°–77.70° E, 18.21°–18.72° N (backed by Caltech global CTX)',
    extent: JEZERO_CTX_EXTENT,
    maxZoom: 13,
    format: 'image/png',
    serviceType: 'wmts',
    tileUrlTemplate:
      'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
    capabilitiesUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/WMTSCapabilities.xml',
    attribution: 'NASA / JPL / USGS Astrogeology / Caltech Murray Lab / MSSS',
    scientificExplanation:
      'Panchromatic visible-wavelength mosaic acquired by the Mars Reconnaissance Orbiter Context Camera. The Jezero dataset is stereo-orthorectified for Mars 2020 Terrain Relative Navigation and paired with the Caltech Murray Lab Beta01 CTX mosaic for regional surroundings.',
    caveat:
      'Controlled 6 m/px orthorectification applies strictly within the Jezero Crater footprint; surrounding terrain uses the uncontrolled global Beta01 CTX mosaic.',
  },
  'ctx-global': {
    id: 'ctx-global',
    wmtsIdentifier: 'CTX_beta01_uncontrolled_5m_Caltech',
    label: 'MRO CTX Global Mosaic (~5 m/px)',
    shortLabel: 'CTX Global',
    instrument: 'MRO Context Camera (CTX)',
    resolutionLabel: '~5 m/px (WMTS Zoom 0–11)',
    dataKind: 'Direct Orbital Observation',
    coverageLabel: 'Near-global Mars (-180° to 180°, -90° to 90°; minor orbital strip gaps)',
    extent: MARS_WORLD_EXTENT,
    maxZoom: 11,
    format: 'image/png',
    serviceType: 'xyz',
    tileUrlTemplate:
      'https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{z}/{y}/{x}',
    capabilitiesUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/CTX_beta01_uncontrolled_5m_Caltech/1.0.0/WMTSCapabilities.xml',
    attribution: 'Caltech Murray Lab / NASA JPL / MSSS / Esri Astrogeology / Mars Trek',
    scientificExplanation:
      'Near-global ~5 m/px panchromatic CTX Beta01 mosaic assembled from individual Mars Reconnaissance Orbiter swaths across Mars.',
    caveat:
      'Uncontrolled mosaic: minor seam brightness steps and occasional narrow orbital coverage gaps exist in some regions.',
  },
  'mola-clrshade': {
    id: 'mola-clrshade',
    wmtsIdentifier: 'Mars_MGS_MOLA_ClrShade_merge_global_463m',
    label: 'MOLA Color Hillshade (463 m/px)',
    shortLabel: 'MOLA Elevation',
    instrument: 'MGS Mars Orbiter Laser Altimeter (MOLA)',
    resolutionLabel: '463 m/px (WMTS Zoom 0–7)',
    dataKind: 'Derived Terrain Visualization',
    coverageLabel: 'Global Mars (-180° to 180°, -90° to 90°)',
    extent: MOLA_CLRSHADE_EXTENT,
    maxZoom: 7,
    format: 'image/jpeg',
    serviceType: 'wmts',
    tileUrlTemplate:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpg',
    capabilitiesUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml',
    attribution: 'NASA GSFC MOLA Science Team / USGS / Mars Trek WMTS',
    scientificExplanation:
      'Derived hypsometric colorized shaded-relief visualization generated from over 600 million Mars Global Surveyor laser altimetry measurements (±3 m vertical uncertainty, ~100 m horizontal accuracy). Warm reds/whites indicate high elevations; blues/violets indicate low basins.',
    caveat:
      'Colorized hillshade visualization only—rendered RGB tiles illustrate relative planetary topography and do not provide raw per-pixel elevation values on click.',
  },
  'themis-day-ir': {
    id: 'themis-day-ir',
    wmtsIdentifier: 'THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018',
    label: 'THEMIS Daytime IR Mosaic (100 m/px)',
    shortLabel: 'THEMIS Day IR',
    instrument: 'Mars Odyssey THEMIS (Thermal IR)',
    resolutionLabel: '100 m/px (WMTS Zoom 0–9)',
    dataKind: 'Direct Orbital Observation',
    coverageLabel: '65° S to 65° N (-180° to 180°; excludes polar latitudes >65°)',
    extent: THEMIS_CONTROLLED_EXTENT,
    maxZoom: 9,
    format: 'image/png',
    serviceType: 'wmts',
    tileUrlTemplate:
      'https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
    capabilitiesUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml',
    attribution: 'Arizona State University / USGS / NASA Mars Odyssey / Mars Trek WMTS',
    scientificExplanation:
      'Geodetically controlled daytime thermal infrared brightness mosaic (Oct 2018 v2). Because daytime solar heating warms sunward-facing slopes more than shaded slopes, daytime IR imagery emphasizes fine-scale topographic relief and surface morphology.',
    caveat:
      'Qualitative daytime IR radiance mosaic—not a calibrated surface temperature measurement. Coverage ends at ±65° latitude.',
  },
  'themis-night-ir': {
    id: 'themis-night-ir',
    wmtsIdentifier: 'THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018',
    label: 'THEMIS Nighttime IR Mosaic (100 m/px)',
    shortLabel: 'THEMIS Night IR',
    instrument: 'Mars Odyssey THEMIS (Thermal IR)',
    resolutionLabel: '100 m/px (WMTS Zoom 0–9)',
    dataKind: 'Direct Orbital Observation',
    coverageLabel: '65° S to 65° N (-180° to 180°; excludes polar latitudes >65°)',
    extent: THEMIS_CONTROLLED_EXTENT,
    maxZoom: 9,
    format: 'image/png',
    serviceType: 'wmts',
    tileUrlTemplate:
      'https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018/1.0.0/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
    capabilitiesUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml',
    attribution: 'Arizona State University / USGS / NASA Mars Odyssey / Mars Trek WMTS',
    scientificExplanation:
      'Geodetically controlled nighttime thermal infrared brightness mosaic (Oct 2018 v2). Highlights relative thermal inertia: dense bedrock, rocky crater walls, and indurated materials retain daytime heat and glow brighter at night than fine unconsolidated dust.',
    caveat:
      'Indicates relative nighttime IR brightness / thermal inertia contrast rather than direct absolute surface temperatures. Coverage ends at ±65° latitude.',
  },
  'viking-color': {
    id: 'viking-color',
    wmtsIdentifier: 'Mars_Viking_MDIM21_ClrMosaic_global_232m',
    label: 'Viking MDIM 2.1 Color Mosaic (232 m/px)',
    shortLabel: 'Viking Color',
    instrument: 'Viking 1 & 2 Orbiter Imaging Systems',
    resolutionLabel: '232 m/px (WMTS Zoom 0–7)',
    dataKind: 'Direct Orbital Observation',
    coverageLabel: 'Global Mars (-180° to 180°, -90° to 90°)',
    extent: MARS_WORLD_EXTENT,
    maxZoom: 7,
    format: 'image/jpeg',
    serviceType: 'wmts',
    tileUrlTemplate:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpg',
    capabilitiesUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml',
    attribution: 'NASA / USGS Astrogeology / Mars Trek WMTS',
    scientificExplanation:
      'Global colorized digital image mosaic from the Viking 1 and 2 Orbiter vidicon cameras, providing global planetary albedo and regional color context.',
    caveat:
      '232 m/px regional resolution; local crater boulders and rover-scale landforms require CTX or HiRISE imagery.',
  },
};

export const MARS_OVERLAY_LAYERS: Record<MarsOverlayLayerId, MarsWmtsLayerMeta> = {
  'hirise-jezero': {
    id: 'hirise-jezero',
    wmtsIdentifier: 'JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd',
    label: 'HiRISE Jezero Mosaic (25 cm/px)',
    shortLabel: 'HiRISE Jezero',
    instrument: 'MRO HiRISE',
    resolutionLabel: '25 cm/px (WMTS Zoom 0–17)',
    dataKind: 'Direct Orbital Observation',
    coverageLabel: 'Strictly Jezero Landing Region: 77.2229°–77.5840° E, 18.3068°–18.6693° N',
    extent: JEZERO_HIRISE_EXTENT,
    maxZoom: 17,
    minRecommendedZoom: 10,
    format: 'image/png',
    serviceType: 'wmts',
    tileUrlTemplate:
      'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
    capabilitiesUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/WMTSCapabilities.xml',
    attribution: 'NASA / JPL / University of Arizona / USGS Astrogeology / Mars Trek WMTS',
    scientificExplanation:
      'Sub-meter (25 cm/px) orthorectified mosaic acquired by MRO HiRISE for Mars 2020 Perseverance landing-site hazard mapping across the Jezero delta and crater floor. Available strictly inside the Jezero orthomosaic footprint.',
    caveat:
      '25 cm/px coverage exists exclusively within the Jezero Crater mosaic bounding box (77.22°–77.58° E, 18.31°–18.67° N) and is not available planet-wide.',
  },
  'mola-overlay': {
    id: 'mola-overlay',
    wmtsIdentifier: 'Mars_MGS_MOLA_ClrShade_merge_global_463m',
    label: 'MOLA Elevation Tint Overlay',
    shortLabel: 'MOLA Overlay',
    instrument: 'MGS MOLA',
    resolutionLabel: '463 m/px (WMTS Zoom 0–7)',
    dataKind: 'Derived Terrain Visualization',
    coverageLabel: 'Global Mars (-180° to 180°, -90° to 90°)',
    extent: MOLA_CLRSHADE_EXTENT,
    maxZoom: 7,
    format: 'image/jpeg',
    serviceType: 'wmts',
    tileUrlTemplate:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpg',
    capabilitiesUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml',
    attribution: 'NASA GSFC MOLA Science Team / USGS / Mars Trek WMTS',
    scientificExplanation:
      'Translucent MOLA colorized hillshade overlay for draping planetary elevation context directly onto CTX or HiRISE morphology.',
    caveat:
      'Derived hypsometric hillshade visualization (463 m/px); does not encode raw elevation numbers per pixel.',
  },
  'themis-day-overlay': {
    id: 'themis-day-overlay',
    wmtsIdentifier: 'THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018',
    label: 'THEMIS Day IR Overlay',
    shortLabel: 'THEMIS Day Overlay',
    instrument: 'Mars Odyssey THEMIS (IR)',
    resolutionLabel: '100 m/px (WMTS Zoom 0–9)',
    dataKind: 'Direct Orbital Observation',
    coverageLabel: '65° S to 65° N (-180° to 180°)',
    extent: THEMIS_CONTROLLED_EXTENT,
    maxZoom: 9,
    format: 'image/png',
    serviceType: 'wmts',
    tileUrlTemplate:
      'https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
    capabilitiesUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml',
    attribution: 'ASU / USGS / NASA Mars Odyssey / Mars Trek WMTS',
    scientificExplanation:
      'Translucent daytime thermal IR brightness overlay highlighting slope illumination and surface morphology.',
    caveat:
      'Qualitative IR radiance mosaic (±65° latitude); not a calibrated surface temperature map.',
  },
};

export interface MarsQuickLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  zoom: number;
  note: string;
}

export const MARS_QUICK_LOCATIONS: MarsQuickLocation[] = [
  {
    id: 'jezero-regional',
    name: 'Jezero Crater (Regional)',
    lat: 18.4,
    lon: 77.4,
    zoom: 9.2,
    note: 'Full ~45 km crater basin & surrounding terrain',
  },
  {
    id: 'jezero-delta',
    name: 'Jezero Western Delta',
    lat: 18.49,
    lon: 77.38,
    zoom: 13.5,
    note: 'Ancient river fan-delta inside HiRISE 25 cm coverage',
  },
  {
    id: 'neretva-inlet',
    name: 'Neretva Vallis Inlet',
    lat: 18.46,
    lon: 77.26,
    zoom: 11.8,
    note: 'Western breach valley entering Jezero paleolake',
  },
  {
    id: 'syrtis-major',
    name: 'Syrtis Major / Isidis Rim',
    lat: 14.5,
    lon: 74.0,
    zoom: 6.5,
    note: 'Regional volcanic shield & basin context (CTX / MOLA / THEMIS)',
  },
  {
    id: 'valles-marineris',
    name: 'Valles Marineris',
    lat: -13.9,
    lon: -59.2,
    zoom: 5.5,
    note: 'Global canyon system (outside Jezero HiRISE/CTX footprints)',
  },
];

export function normalizeLongitude(lonDeg: number): number {
  return ((((lonDeg + 180) % 360) + 360) % 360) - 180;
}

export function clampLatitude(latDeg: number): number {
  return Math.max(-90, Math.min(90, latDeg));
}

export function isPointInExtent(
  lonDeg: number,
  latDeg: number,
  extent: [number, number, number, number]
): boolean {
  const lon = normalizeLongitude(lonDeg);
  return (
    lon >= extent[0] &&
    lon <= extent[2] &&
    latDeg >= extent[1] &&
    latDeg <= extent[3]
  );
}

export function extentsIntersect(
  a: [number, number, number, number],
  b: [number, number, number, number]
): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

export function formatMarsLatLonDetailed(latDeg: number, lonDeg: number): string {
  const lat = clampLatitude(latDeg);
  const lon = normalizeLongitude(lonDeg);
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

export function formatMarsLatLonShort(latDeg: number, lonDeg: number): string {
  const lat = clampLatitude(latDeg);
  const lon = normalizeLongitude(lonDeg);
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}° ${latDir}, ${Math.abs(lon).toFixed(2)}° ${lonDir}`;
}

/**
 * Computes great-circle surface distance on Mars (equatorial sphere R = 3,396.19 km).
 */
export function marsGreatCircleDistanceKm(
  lat1Deg: number,
  lon1Deg: number,
  lat2Deg: number,
  lon2Deg: number
): number {
  const toRad = Math.PI / 180;
  const lat1 = lat1Deg * toRad;
  const lat2 = lat2Deg * toRad;
  const dLat = (lat2Deg - lat1Deg) * toRad;
  const dLon = (lon2Deg - lon1Deg) * toRad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (MARS_EQUATORIAL_RADIUS_M / 1000) * c;
}

/**
 * Approximate ground sampling distance (meters per screen pixel) at a given zoom & latitude.
 */
export function approxMetersPerPixel(zoom: number, latDeg: number): number {
  const degPerPx = 360 / (512 * Math.pow(2, zoom));
  const latCos = Math.max(0.1, Math.cos((clampLatitude(latDeg) * Math.PI) / 180));
  return degPerPx * MARS_METERS_PER_DEGREE * latCos;
}
