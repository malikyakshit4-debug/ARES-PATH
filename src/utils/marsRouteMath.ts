import {
  clampLatitude,
  normalizeLongitude,
} from './marsMapLayers';

/**
 * Volumetric mean radius of Mars (IAU / NASA Mars Fact Sheet): 3,389.5 km.
 */
export const MARS_MEAN_RADIUS_KM = 3389.5;

export interface PlannerWaypoint {
  id: string;
  lat: number;
  lon: number;
  label?: string;
}

export interface RouteLeg {
  index: number;
  fromWaypoint: PlannerWaypoint;
  toWaypoint: PlannerWaypoint;
  distanceKm: number;
  formattedDistance: string;
}

export interface RouteMetrics {
  waypointCount: number;
  legs: RouteLeg[];
  totalDistanceKm: number;
  formattedTotalDistance: string;
}

/**
 * Normalizes any longitude in degrees to [-180, 180], wrapping cleanly across the antimeridian.
 */
export function wrapLongitudeDeg(lonDeg: number): number {
  const normalized = normalizeLongitude(lonDeg);
  return Object.is(normalized, -0) ? 0 : normalized;
}

/**
 * Shortest angular longitude delta in [-180, 180] degrees so routes crossing
 * 180° E / 180° W measure the short arc across the antimeridian.
 */
export function shortestLonDeltaDeg(lon1Deg: number, lon2Deg: number): number {
  const a = wrapLongitudeDeg(lon1Deg);
  const b = wrapLongitudeDeg(lon2Deg);
  return wrapLongitudeDeg(b - a);
}

/**
 * Great-circle surface distance on Mars using mean radius R = 3,389.5 km
 * and antimeridian-aware longitude difference.
 */
export function marsMeanRadiusDistanceKm(
  lat1Deg: number,
  lon1Deg: number,
  lat2Deg: number,
  lon2Deg: number
): number {
  const lat1 = clampLatitude(lat1Deg);
  const lat2 = clampLatitude(lat2Deg);
  const dLatDeg = lat2 - lat1;
  const dLonDeg = shortestLonDeltaDeg(lon1Deg, lon2Deg);

  const toRad = Math.PI / 180;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const dPhi = dLatDeg * toRad;
  const dLambda = dLonDeg * toRad;

  const sinDPhi = Math.sin(dPhi / 2);
  const sinDLambda = Math.sin(dLambda / 2);
  const a =
    sinDPhi * sinDPhi +
    Math.cos(phi1) * Math.cos(phi2) * sinDLambda * sinDLambda;
  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  return MARS_MEAN_RADIUS_KM * c;
}

/**
 * Formats Mars surface distance: metres below 1 km, kilometres at >= 1 km.
 */
export function formatMarsSurfaceDistance(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return '0 m';
  if (distanceKm < 1) {
    const meters = distanceKm * 1000;
    if (meters < 10 && meters > 0) {
      return `${meters.toFixed(1)} m`;
    }
    return `${Math.round(meters)} m`;
  }
  if (distanceKm < 100) {
    return `${distanceKm.toFixed(2)} km`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Computes consecutive leg distances and total approximate surface distance for a list of waypoints.
 */
export function computeRouteMetrics(waypoints: PlannerWaypoint[]): RouteMetrics {
  const legs: RouteLeg[] = [];
  let totalDistanceKm = 0;

  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const distKm = marsMeanRadiusDistanceKm(prev.lat, prev.lon, curr.lat, curr.lon);
    totalDistanceKm += distKm;
    legs.push({
      index: i,
      fromWaypoint: prev,
      toWaypoint: curr,
      distanceKm: distKm,
      formattedDistance: formatMarsSurfaceDistance(distKm),
    });
  }

  return {
    waypointCount: waypoints.length,
    legs,
    totalDistanceKm,
    formattedTotalDistance: formatMarsSurfaceDistance(totalDistanceKm),
  };
}

/**
 * Splits a segment between two coordinates into EPSG:104905 polyline chains
 * that wrap cleanly across the ±180° antimeridian instead of drawing across the map.
 */
export function splitAntimeridianPolylines(
  waypoints: PlannerWaypoint[]
): Array<Array<[number, number]>> {
  if (waypoints.length < 2) return [];

  const chains: Array<Array<[number, number]>> = [];
  let currentChain: Array<[number, number]> = [
    [wrapLongitudeDeg(waypoints[0].lon), clampLatitude(waypoints[0].lat)],
  ];

  for (let i = 1; i < waypoints.length; i++) {
    const lon1 = wrapLongitudeDeg(waypoints[i - 1].lon);
    const lat1 = clampLatitude(waypoints[i - 1].lat);
    const lon2 = wrapLongitudeDeg(waypoints[i].lon);
    const lat2 = clampLatitude(waypoints[i].lat);

    const rawDelta = lon2 - lon1;

    if (Math.abs(rawDelta) <= 180) {
      currentChain.push([lon2, lat2]);
    } else {
      // Crosses ±180° antimeridian along the shorter spherical arc
      const shortDelta = shortestLonDeltaDeg(lon1, lon2);
      const edge1 = shortDelta > 0 ? 180 : -180;
      const edge2 = -edge1;
      const t =
        shortDelta !== 0 ? Math.abs((edge1 - lon1) / shortDelta) : 0.5;
      const crossLat = clampLatitude(lat1 + (lat2 - lat1) * Math.min(1, Math.max(0, t)));

      currentChain.push([edge1, crossLat]);
      chains.push(currentChain);
      currentChain = [
        [edge2, crossLat],
        [lon2, lat2],
      ];
    }
  }

  if (currentChain.length >= 2) {
    chains.push(currentChain);
  }

  return chains;
}

export interface MarsRouteExportPayload {
  project: 'ARES PATH';
  routeName: string;
  createdAt: string;
  planet: 'Mars';
  routeClassification: 'Conceptual surface traverse (not validated for human safety)';
  coordinateReferenceSystem: {
    code: 'EPSG:104905';
    name: 'Mars 2000 Equirectangular (Simple Cylindrical)';
    coordinates: 'Areocentric Latitude / Longitude';
    units: 'degrees';
    distanceModel: 'Spherical great-circle surface distance';
    meanMarsRadiusKm: typeof MARS_MEAN_RADIUS_KM;
    distanceUnits: string;
  };
  safetyNotice: string;
  waypointCount: number;
  totalApproximateDistanceKm: number;
  totalApproximateDistanceFormatted: string;
  waypoints: Array<{
    order: number;
    role: 'start' | 'intermediate' | 'destination';
    label: string;
    latitudeDeg: number;
    longitudeDeg: number;
    distanceFromPreviousKm: number;
    distanceFromPreviousFormatted: string;
  }>;
  legs: Array<{
    leg: number;
    fromOrder: number;
    toOrder: number;
    approximateDistanceKm: number;
    approximateDistanceFormatted: string;
  }>;
  mapLayerAttribution: string;
}

export function buildRouteExportPayload(
  routeName: string,
  waypoints: PlannerWaypoint[],
  activeLayerAttribution: string
): MarsRouteExportPayload {
  const metrics = computeRouteMetrics(waypoints);
  const cleanName = routeName.trim() || 'Untitled Conceptual Traverse';

  return {
    project: 'ARES PATH',
    routeName: cleanName,
    createdAt: new Date().toISOString(),
    planet: 'Mars',
    routeClassification:
      'Conceptual surface traverse (not validated for human safety)',
    coordinateReferenceSystem: {
      code: 'EPSG:104905',
      name: 'Mars 2000 Equirectangular (Simple Cylindrical)',
      coordinates: 'Areocentric Latitude / Longitude',
      units: 'degrees',
      distanceModel: 'Spherical great-circle surface distance',
      meanMarsRadiusKm: MARS_MEAN_RADIUS_KM,
      distanceUnits: 'kilometres (metres displayed when < 1 km)',
    },
    safetyNotice:
      'Route safety assessment is not yet supported. Distances are approximate spherical surface distances and do not evaluate terrain slope, rocks, dust, or EVA hazards.',
    waypointCount: metrics.waypointCount,
    totalApproximateDistanceKm: Number(metrics.totalDistanceKm.toFixed(6)),
    totalApproximateDistanceFormatted: metrics.formattedTotalDistance,
    waypoints: waypoints.map((wp, idx) => {
      const role: 'start' | 'intermediate' | 'destination' =
        idx === 0
          ? 'start'
          : idx === waypoints.length - 1
          ? 'destination'
          : 'intermediate';
      const leg = idx > 0 ? metrics.legs[idx - 1] : null;
      return {
        order: idx + 1,
        role,
        label: wp.label?.trim() || `Waypoint ${idx + 1}`,
        latitudeDeg: Number(clampLatitude(wp.lat).toFixed(6)),
        longitudeDeg: Number(wrapLongitudeDeg(wp.lon).toFixed(6)),
        distanceFromPreviousKm: leg ? Number(leg.distanceKm.toFixed(6)) : 0,
        distanceFromPreviousFormatted: leg ? leg.formattedDistance : '0 m',
      };
    }),
    legs: metrics.legs.map((leg) => ({
      leg: leg.index,
      fromOrder: leg.index,
      toOrder: leg.index + 1,
      approximateDistanceKm: Number(leg.distanceKm.toFixed(6)),
      approximateDistanceFormatted: leg.formattedDistance,
    })),
    mapLayerAttribution: activeLayerAttribution,
  };
}
