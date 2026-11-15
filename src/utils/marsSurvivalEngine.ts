import {
  MARTIAN_STUDY_SITES,
  SURVIVAL_OBSERVATIONS,
} from '../data/survivalKnowledgeBase';
import {
  LocationIntelligenceReport,
  MartianStudySite,
  OrbitalCoverageStatus,
  RouteIntelligenceReport,
  RouteSegmentSummary,
  RouteWaypointSummary,
  ScientificObservation,
} from '../types/survival';
import {
  clampLatitude,
  isPointInExtent,
  JEZERO_CTX_EXTENT,
  JEZERO_HIRISE_EXTENT,
  JEZERO_MAP_CENTER,
  MARS_BASE_LAYERS,
  MARS_OVERLAY_LAYERS,
  MARS_WORLD_EXTENT,
  MOLA_CLRSHADE_EXTENT,
  normalizeLongitude,
  THEMIS_CONTROLLED_EXTENT,
} from './marsMapLayers';
import {
  computeRouteMetrics,
  marsMeanRadiusDistanceKm,
  PlannerWaypoint,
} from './marsRouteMath';
import { loadNasaMarsTextures } from './nasaMarsTextures';

/**
 * Matches an areocentric coordinate to a documented NASA study site if it lies
 * within that site's defined geographic footprint radius.
 */
export function matchLocationToStudySite(
  latDeg: number,
  lonDeg: number
): { site: MartianStudySite | null; distanceKm: number | null } {
  const lat = clampLatitude(latDeg);
  const lon = normalizeLongitude(lonDeg);

  let bestSite: MartianStudySite | null = null;
  let bestDist = Infinity;

  for (const site of MARTIAN_STUDY_SITES) {
    const d = marsMeanRadiusDistanceKm(lat, lon, site.lat, site.lon);
    if (d <= site.matchRadiusKm && d < bestDist) {
      bestDist = d;
      bestSite = site;
    }
  }

  return {
    site: bestSite,
    distanceKm: bestSite ? bestDist : null,
  };
}

/**
 * Evaluates exact coverage of all NASA Mars Trek / USGS / Caltech orbital datasets
 * at a given coordinate using verified WMTS bounding boxes.
 */
export function evaluateOrbitalCoverage(
  latDeg: number,
  lonDeg: number
): OrbitalCoverageStatus[] {
  const lat = clampLatitude(latDeg);
  const lon = normalizeLongitude(lonDeg);

  const inHirise = isPointInExtent(lon, lat, JEZERO_HIRISE_EXTENT);
  const inJezeroCtx = isPointInExtent(lon, lat, JEZERO_CTX_EXTENT);
  const inThemis = isPointInExtent(lon, lat, THEMIS_CONTROLLED_EXTENT);
  const inMola = isPointInExtent(lon, lat, MOLA_CLRSHADE_EXTENT);
  const inWorld = isPointInExtent(lon, lat, MARS_WORLD_EXTENT);

  return [
    {
      layerId: 'hirise-jezero',
      name: MARS_OVERLAY_LAYERS['hirise-jezero'].label,
      instrument: MARS_OVERLAY_LAYERS['hirise-jezero'].instrument,
      resolution: '25 cm/px (0.25 m)',
      dataKind: 'Direct Orbital Observation',
      covered: inHirise,
      coverageNote: inHirise
        ? 'Inside Jezero HiRISE 25 cm/px orthomosaic footprint'
        : 'Outside Jezero HiRISE footprint (unavailable at this coordinate)',
      extentDescription: '77.2229°–77.5840° E, 18.3068°–18.6693° N',
      limitations: MARS_OVERLAY_LAYERS['hirise-jezero'].caveat,
      capabilitiesUrl: MARS_OVERLAY_LAYERS['hirise-jezero'].capabilitiesUrl,
    },
    {
      layerId: 'ctx-jezero',
      name: 'CTX Jezero Controlled Mosaic (6 m/px)',
      instrument: MARS_BASE_LAYERS['ctx-jezero'].instrument,
      resolution: '6 m/px',
      dataKind: 'Direct Orbital Observation',
      covered: inJezeroCtx,
      coverageNote: inJezeroCtx
        ? 'Inside controlled Mars 2020 TRN CTX orthomosaic'
        : 'Outside controlled 6 m mosaic (uncontrolled ~5 m Global CTX fallback)',
      extentDescription: '77.1605°–77.6992° E, 18.2110°–18.7212° N',
      limitations: MARS_BASE_LAYERS['ctx-jezero'].caveat,
      capabilitiesUrl: MARS_BASE_LAYERS['ctx-jezero'].capabilitiesUrl,
    },
    {
      layerId: 'ctx-global',
      name: MARS_BASE_LAYERS['ctx-global'].label,
      instrument: MARS_BASE_LAYERS['ctx-global'].instrument,
      resolution: '~5 m/px',
      dataKind: 'Direct Orbital Observation',
      covered: inWorld,
      coverageNote: 'Near-global CTX Beta01 coverage (minor narrow swath gaps possible)',
      extentDescription: 'Global (-180° to 180°, -90° to 90°)',
      limitations: MARS_BASE_LAYERS['ctx-global'].caveat,
      capabilitiesUrl: MARS_BASE_LAYERS['ctx-global'].capabilitiesUrl,
    },
    {
      layerId: 'themis-ir',
      name: 'Mars Odyssey THEMIS Day & Night IR Mosaics',
      instrument: 'Mars Odyssey THEMIS',
      resolution: '100 m/px',
      dataKind: 'Direct Orbital Observation',
      covered: inThemis,
      coverageNote: inThemis
        ? 'Covered within ±65° controlled THEMIS IR mosaic'
        : 'Outside ±65° latitude band (polar region excluded)',
      extentDescription: '65° S to 65° N, -180° to 180°',
      limitations:
        'Qualitative relative daytime morphology & nighttime thermal inertia brightness; NOT absolute °C temperature.',
      capabilitiesUrl: MARS_BASE_LAYERS['themis-day-ir'].capabilitiesUrl,
    },
    {
      layerId: 'mola-clrshade',
      name: MARS_BASE_LAYERS['mola-clrshade'].label,
      instrument: MARS_BASE_LAYERS['mola-clrshade'].instrument,
      resolution: '463 m/px (WMTS ClrShade) · ~10 km/px (global PNG)',
      dataKind: 'Derived Shaded-Relief Visualization',
      covered: inMola,
      coverageNote: 'Global MOLA colorized shaded-relief tile coverage',
      extentDescription: 'Global (-180° to 180°, -90° to 90°)',
      limitations:
        'Shaded-relief RGB tiles do NOT encode raw metric elevation or slope degrees on click.',
      capabilitiesUrl: MARS_BASE_LAYERS['mola-clrshade'].capabilitiesUrl,
    },
    {
      layerId: 'viking-color',
      name: MARS_BASE_LAYERS['viking-color'].label,
      instrument: MARS_BASE_LAYERS['viking-color'].instrument,
      resolution: '232 m/px',
      dataKind: 'Direct Orbital Observation',
      covered: inWorld,
      coverageNote: 'Global Viking Orbiter color albedo mosaic coverage',
      extentDescription: 'Global (-180° to 180°, -90° to 90°)',
      limitations: MARS_BASE_LAYERS['viking-color'].caveat,
      capabilitiesUrl: MARS_BASE_LAYERS['viking-color'].capabilitiesUrl,
    },
  ];
}

/**
 * Generates a scientifically strict Location Intelligence Report for any coordinate.
 * Never attributes observations from another crater (e.g. Gale RAD) as local to Jezero or elsewhere.
 */
export function buildLocationIntelligenceReport(
  latDeg: number,
  lonDeg: number,
  locationLabel?: string,
  relativeMolaValue?: number | null,
  relativeMolaStatus: 'loaded' | 'loading' | 'unavailable' = 'loading'
): LocationIntelligenceReport {
  const lat = clampLatitude(latDeg);
  const lon = normalizeLongitude(lonDeg);
  const lon360 = ((lon % 360) + 360) % 360;

  const { site: matchedSite, distanceKm } = matchLocationToStudySite(lat, lon);
  const distanceToJezeroKm = marsMeanRadiusDistanceKm(
    lat,
    lon,
    JEZERO_MAP_CENTER.lat,
    JEZERO_MAP_CENTER.lon
  );
  const orbitalCoverage = evaluateOrbitalCoverage(lat, lon);

  const localObservations: ScientificObservation[] = [];
  const regionalObservations: ScientificObservation[] = [];
  const comparativeSiteObservations: ScientificObservation[] = [];
  const planetaryReferenceObservations: ScientificObservation[] = [];
  const interpretationsAndHypotheses: ScientificObservation[] = [];

  const inThemis = isPointInExtent(lon, lat, THEMIS_CONTROLLED_EXTENT);

  for (const obs of SURVIVAL_OBSERVATIONS) {
    if (obs.classification === 'D' || obs.classification === 'E') {
      interpretationsAndHypotheses.push(obs);
      continue;
    }

    if (obs.scope === 'planetary-reference') {
      planetaryReferenceObservations.push(obs);
      continue;
    }

    if (obs.scope === 'regional-orbital') {
      if (obs.id === 'temp-themis-ir' && !inThemis) {
        continue;
      }
      regionalObservations.push(obs);
      continue;
    }

    if (obs.scope === 'local-site' || obs.scope === 'other-site-comparison') {
      if (matchedSite && obs.siteId === matchedSite.id && obs.scope === 'local-site') {
        localObservations.push(obs);
      } else {
        // Keep other-site observations strictly separated as comparative context
        comparativeSiteObservations.push({
          ...obs,
          classification: 'B',
          scope: 'other-site-comparison',
        });
      }
    }
  }

  let localAvailabilityNotice: string;
  if (matchedSite) {
    if (matchedSite.hasLocalWeatherData && matchedSite.hasLocalRadiationData) {
      localAvailabilityNotice = `Coordinate lies within the ${matchedSite.name} study footprint (${distanceKm?.toFixed(1)} km from site reference). Published in-situ meteorology and surface ionizing radiation dosimetry are available for this site.`;
    } else if (matchedSite.hasLocalWeatherData) {
      localAvailabilityNotice = `Coordinate lies within the ${matchedSite.name} study footprint (${distanceKm?.toFixed(1)} km from site reference). Published in-situ meteorology is available; however, ${matchedSite.localDataGapNote ?? 'some local instrument datasets (such as ionizing radiation dosimetry) are unavailable at this site.'}`;
    } else {
      localAvailabilityNotice = `Coordinate lies within the ${matchedSite.name} orbital study region (${distanceKm?.toFixed(1)} km from site reference). ${matchedSite.localDataGapNote ?? 'No surface lander or rover measurements exist here; only orbital datasets and planetary reference data apply.'}`;
    }
  } else {
    localAvailabilityNotice =
      'No in-situ NASA surface lander or rover measurements exist at this coordinate. Only orbital imagery coverage and Planetary/Global Reference values (Category C) apply—do not treat global reference numbers or distant-crater measurements (such as Jezero MEDA or Gale RAD) as local conditions here.';
  }

  const effectiveLabel =
    locationLabel?.trim() ||
    (matchedSite ? `${matchedSite.name} Region` : 'Custom Martian Coordinate');

  return {
    lat,
    lon,
    lon360,
    locationLabel: effectiveLabel,
    matchedSite,
    distanceToMatchedSiteKm: distanceKm,
    distanceToJezeroKm,
    orbitalCoverage,
    relativeMolaIndex: {
      value: relativeMolaValue ?? null,
      status: relativeMolaStatus,
      caveat:
        'Uncalibrated 8-bit relative MOLA relief index (0.00–1.00) sampled from the global 2048×1024 MOLA DEM PNG. Exact metric elevation (meters) and slope angles cannot be derived from 8-bit shaded/normalized imagery.',
    },
    localObservations,
    regionalObservations,
    comparativeSiteObservations,
    planetaryReferenceObservations,
    interpretationsAndHypotheses,
    localAvailabilityNotice,
  };
}

/**
 * Samples the cached 2048x1024 NASA MGS MOLA relative elevation raster without
 * introducing redundant network downloads.
 */
export async function sampleRelativeMolaIndex(
  latDeg: number,
  lonDeg: number
): Promise<number | null> {
  try {
    const textures = await loadNasaMarsTextures(4);
    const val = textures.sampleElevationNormalized(
      clampLatitude(latDeg),
      normalizeLongitude(lonDeg)
    );
    return Number.isFinite(val) ? val : null;
  } catch {
    return null;
  }
}

/**
 * Builds a factual route-level scientific coverage summary for an existing
 * Marswalk Planner route without claiming safety certification or hazard avoidance.
 */
export function buildRouteIntelligenceReport(
  routeName: string,
  waypoints: PlannerWaypoint[]
): RouteIntelligenceReport {
  const metrics = computeRouteMetrics(waypoints);
  const coveredSitesSet = new Set<string>();
  const missingDataSet = new Set<string>();

  const wpSummaries: RouteWaypointSummary[] = waypoints.map((wp, idx) => {
    const lat = clampLatitude(wp.lat);
    const lon = normalizeLongitude(wp.lon);
    const { site } = matchLocationToStudySite(lat, lon);
    if (site) coveredSitesSet.add(site.name);

    const hasHirise25cm = isPointInExtent(lon, lat, JEZERO_HIRISE_EXTENT);
    const hasJezeroCtx6m = isPointInExtent(lon, lat, JEZERO_CTX_EXTENT);
    const hasThemis100m = isPointInExtent(lon, lat, THEMIS_CONTROLLED_EXTENT);
    const hasLocalSurfaceWeather = Boolean(site?.hasLocalWeatherData);
    const hasLocalRadiationData = Boolean(site?.hasLocalRadiationData);

    const missingDataNotes: string[] = [];
    if (!hasHirise25cm) {
      missingDataNotes.push('No 25 cm/px HiRISE orthomosaic coverage');
      missingDataSet.add('Sub-meter HiRISE (25 cm/px) coverage missing on one or more waypoints');
    }
    if (!hasJezeroCtx6m) {
      missingDataNotes.push('Outside 6 m/px controlled Jezero CTX footprint');
    }
    if (!hasThemis100m) {
      missingDataNotes.push('Outside ±65° THEMIS IR mosaic');
      missingDataSet.add('THEMIS IR 100 m/px coverage unavailable poleward of ±65°');
    }
    if (!hasLocalSurfaceWeather) {
      missingDataNotes.push('No in-situ surface meteorological station');
      missingDataSet.add('One or more waypoints lack local in-situ weather station data');
    }
    if (!hasLocalRadiationData) {
      missingDataNotes.push('No direct surface ionizing radiation dosimetry');
      missingDataSet.add(
        'Direct local ionizing radiation (GCR/SEP) dosimetry is unavailable (only Gale Crater has RAD)'
      );
    }
    missingDataNotes.push('Calibrated metric DEM / local slope stability data not queried');

    return {
      order: idx + 1,
      id: wp.id,
      label: wp.label?.trim() || `Waypoint ${idx + 1}`,
      lat,
      lon,
      matchedSiteName: site?.name ?? null,
      hasLocalSurfaceWeather,
      hasLocalRadiationData,
      hasHirise25cm,
      hasJezeroCtx6m,
      hasThemis100m,
      missingDataNotes,
    };
  });

  missingDataSet.add(
    'Per-pixel metric elevation (m), local slope gradients, and soil trafficability are not computed in-browser.'
  );

  const segments: RouteSegmentSummary[] = metrics.legs.map((leg, i) => {
    const wpFrom = wpSummaries[i];
    const wpTo = wpSummaries[i + 1];

    const hiriseBoth = wpFrom.hasHirise25cm && wpTo.hasHirise25cm;
    const hiriseOne = wpFrom.hasHirise25cm || wpTo.hasHirise25cm;
    const hiriseCoverage: RouteSegmentSummary['hiriseCoverage'] = hiriseBoth
      ? 'Full endpoints'
      : hiriseOne
      ? 'Partial endpoint'
      : 'Unavailable';

    const ctxBoth = wpFrom.hasJezeroCtx6m && wpTo.hasJezeroCtx6m;
    const ctxOne = wpFrom.hasJezeroCtx6m || wpTo.hasJezeroCtx6m;
    const ctx6mCoverage: RouteSegmentSummary['ctx6mCoverage'] = ctxBoth
      ? 'Full endpoints'
      : ctxOne
      ? 'Partial endpoint'
      : 'Global CTX fallback (~5 m/px)';

    const themisCoverage: RouteSegmentSummary['themisCoverage'] =
      wpFrom.hasThemis100m && wpTo.hasThemis100m
        ? 'Covered (±65°)'
        : 'Outside ±65° band';

    const localSurfaceData =
      wpFrom.matchedSiteName && wpFrom.matchedSiteName === wpTo.matchedSiteName
        ? wpFrom.hasLocalSurfaceWeather
          ? `${wpFrom.matchedSiteName} site archive (no radiation dosimetry unless Gale)`
          : `${wpFrom.matchedSiteName} orbital region only`
        : 'Mixed or uninstrumented terrain';

    const missingParts: string[] = [];
    if (hiriseCoverage !== 'Full endpoints') missingParts.push('HiRISE 25 cm');
    if (!wpFrom.hasLocalRadiationData || !wpTo.hasLocalRadiationData)
      missingParts.push('Local RAD dosimetry');
    missingParts.push('Slope/trafficability');

    return {
      legIndex: leg.index,
      fromLabel: wpFrom.label,
      toLabel: wpTo.label,
      distanceFormatted: leg.formattedDistance,
      hiriseCoverage,
      ctx6mCoverage,
      themisCoverage,
      localSurfaceData,
      missingDataSummary: missingParts.join(' · '),
    };
  });

  const hiriseCount = wpSummaries.filter((w) => w.hasHirise25cm).length;
  const localWeatherCount = wpSummaries.filter((w) => w.hasLocalSurfaceWeather).length;

  const routeScientificSummary =
    waypoints.length === 0
      ? 'No waypoints are currently defined in the Marswalk Planner.'
      : `Route "${routeName || 'Untitled Traverse'}" spans ${waypoints.length} waypoint${
          waypoints.length === 1 ? '' : 's'
        } (${metrics.formattedTotalDistance} approximate spherical surface distance). ${hiriseCount}/${waypoints.length} waypoints fall inside the 25 cm/px Jezero HiRISE orthomosaic, and ${localWeatherCount}/${waypoints.length} fall within a documented surface lander meteorological footprint. This summary describes dataset availability only and does NOT assess route safety or traversability.`;

  return {
    routeName: routeName || 'Untitled Conceptual Traverse',
    waypointCount: waypoints.length,
    totalDistanceFormatted: metrics.formattedTotalDistance,
    waypoints: wpSummaries,
    segments,
    coveredSites: Array.from(coveredSitesSet),
    missingDataSummary: Array.from(missingDataSet),
    routeScientificSummary,
  };
}

export interface CapabilitiesCheckResult {
  layerId: string;
  reachable: boolean;
  checkedAt: string;
}

const capabilitiesCache = new Map<string, Promise<CapabilitiesCheckResult>>();

/**
 * Lightweight, cached check against a NASA Mars Trek WMTSCapabilities endpoint.
 * Prevents repeated network requests across re-renders and fails gracefully offline.
 */
export function verifyWmtsEndpointCached(
  layerId: string,
  url: string
): Promise<CapabilitiesCheckResult> {
  const existing = capabilitiesCache.get(layerId);
  if (existing) return existing;

  const promise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
      });
      return {
        layerId,
        reachable: res.ok,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return {
        layerId,
        reachable: false,
        checkedAt: new Date().toISOString(),
      };
    } finally {
      clearTimeout(timer);
    }
  })();

  capabilitiesCache.set(layerId, promise);
  return promise;
}
