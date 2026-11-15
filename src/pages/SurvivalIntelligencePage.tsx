import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Compass,
  Database,
  ExternalLink,
  Layers,
  Map as MapIcon,
  MapPin,
  Navigation,
  Route,
  ShieldAlert,
  Thermometer,
  Wind,
} from 'lucide-react';
import {
  MapJumpRequest,
  MarsScientificMap,
  SelectedMapPoint,
} from '../components/MarsScientificMap';
import { StatusNotice } from '../components/StatusNotice';
import { ObservationCard } from '../components/survival/ObservationCard';
import {
  AtmosphericCompositionChart,
  DustPhenomenaDiagram,
  RadiationShieldingDiagram,
  TemperatureRangeChart,
  WaterEvidenceDiagram,
} from '../components/survival/ScientificCharts';
import {
  CLASSIFICATION_SYSTEM,
  EXPLORATION_CONSIDERATIONS,
  MARTIAN_STUDY_SITES,
  SCIENTIFIC_SOURCES_REGISTRY,
} from '../data/survivalKnowledgeBase';
import { ModuleId, SharedMapCoordinates } from '../types/navigation';
import {
  ClassificationCode,
  SurvivalDomainId,
} from '../types/survival';
import {
  clampLatitude,
  formatMarsLatLonDetailed,
  MARS_BASE_LAYERS,
  MarsBaseLayerId,
  normalizeLongitude,
} from '../utils/marsMapLayers';
import { PlannerRouteState } from './MarswalkPlannerPage';
import {
  buildLocationIntelligenceReport,
  buildRouteIntelligenceReport,
  CapabilitiesCheckResult,
  sampleRelativeMolaIndex,
  verifyWmtsEndpointCached,
} from '../utils/marsSurvivalEngine';

interface SurvivalIntelligencePageProps {
  onNavigate: (moduleId: ModuleId) => void;
  sharedCoordinates: SharedMapCoordinates;
  onUpdateSharedCoordinates: (coords: SharedMapCoordinates) => void;
  routeState: PlannerRouteState;
}

type SectionTabId =
  | 'overview'
  | SurvivalDomainId
  | 'route';

const SECTION_TABS: { id: SectionTabId; label: string }[] = [
  { id: 'overview', label: 'Summary' },
  { id: 'atmosphere', label: 'Atmosphere' },
  { id: 'temperature', label: 'Temperature' },
  { id: 'radiation', label: 'Radiation' },
  { id: 'terrain', label: 'Terrain & Geology' },
  { id: 'dust', label: 'Dust & Weather' },
  { id: 'water', label: 'Water & Resources' },
  { id: 'considerations', label: 'Exploration Considerations' },
  { id: 'route', label: 'Marswalk Route' },
  { id: 'sources', label: 'Scientific Sources' },
];

const QUICK_TEST_LOCATIONS = [
  { label: 'Jezero Crater', lat: 18.38, lon: 77.58 },
  { label: 'Gale Crater', lat: -4.59, lon: 137.44 },
  { label: 'Elysium (InSight)', lat: 4.5, lon: 135.62 },
  { label: 'Phoenix Polar', lat: 68.22, lon: -125.7 },
  { label: 'Valles Marineris', lat: -13.9, lon: -59.2 },
  { label: 'Olympus Mons', lat: 18.65, lon: -133.8 },
  { label: 'Arcadia (No Station)', lat: 46.7, lon: -172.0 },
];

const CLASSIFICATION_TEXT_COLOR: Record<ClassificationCode, string> = {
  A: 'text-[#6EE7B7]',
  B: 'text-[#60A5FA]',
  C: 'text-[#E5A952]',
  D: 'text-[#C4B5FD]',
  E: 'text-[#F39C82]',
};

export function SurvivalIntelligencePage({
  onNavigate,
  sharedCoordinates,
  onUpdateSharedCoordinates,
  routeState,
}: SurvivalIntelligencePageProps) {
  const [activeTab, setActiveTab] = useState<SectionTabId>('overview');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapBaseLayer, setMapBaseLayer] = useState<MarsBaseLayerId>('ctx-jezero');
  const [jumpRequest, setJumpRequest] = useState<MapJumpRequest | null>(() => ({
    lat: sharedCoordinates.lat,
    lon: sharedCoordinates.lon,
    zoom: 8.8,
    seq: 1,
  }));

  const [latInput, setLatInput] = useState(() => sharedCoordinates.lat.toFixed(4));
  const [lonInput, setLonInput] = useState(() =>
    normalizeLongitude(sharedCoordinates.lon).toFixed(4)
  );
  const [coordError, setCoordError] = useState<string | null>(null);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<ClassificationCode | 'ALL'>('ALL');

  const [molaState, setMolaState] = useState<{
    value: number | null;
    status: 'loaded' | 'loading' | 'unavailable';
  }>({ value: null, status: 'loading' });

  const [wmtsVerification, setWmtsVerification] = useState<
    Record<string, CapabilitiesCheckResult>
  >({});

  // Sync manual input fields when sharedCoordinates change externally
  useEffect(() => {
    setLatInput(sharedCoordinates.lat.toFixed(4));
    setLonInput(normalizeLongitude(sharedCoordinates.lon).toFixed(4));
  }, [sharedCoordinates.lat, sharedCoordinates.lon]);

  // Sample MOLA 8-bit relative relief index from cached NASA DEM baseline
  useEffect(() => {
    let cancelled = false;
    setMolaState((prev) => ({ ...prev, status: 'loading' }));
    sampleRelativeMolaIndex(sharedCoordinates.lat, sharedCoordinates.lon).then(
      (val) => {
        if (cancelled) return;
        setMolaState(
          val !== null
            ? { value: val, status: 'loaded' }
            : { value: null, status: 'unavailable' }
        );
      }
    );
    return () => {
      cancelled = true;
    };
  }, [sharedCoordinates.lat, sharedCoordinates.lon]);

  // Cached NASA Mars Trek WMTSCapabilities verification (runs once per layer)
  useEffect(() => {
    let cancelled = false;
    const targets: Array<{ id: string; url: string }> = [
      {
        id: 'hirise-jezero',
        url: 'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/WMTSCapabilities.xml',
      },
      {
        id: 'ctx-jezero',
        url: MARS_BASE_LAYERS['ctx-jezero'].capabilitiesUrl,
      },
      {
        id: 'themis-ir',
        url: MARS_BASE_LAYERS['themis-day-ir'].capabilitiesUrl,
      },
      {
        id: 'mola-clrshade',
        url: MARS_BASE_LAYERS['mola-clrshade'].capabilitiesUrl,
      },
      {
        id: 'viking-color',
        url: MARS_BASE_LAYERS['viking-color'].capabilitiesUrl,
      },
    ];

    Promise.all(
      targets.map((t) => verifyWmtsEndpointCached(t.id, t.url))
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, CapabilitiesCheckResult> = {};
      for (const r of results) {
        map[r.layerId] = r;
      }
      setWmtsVerification(map);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const report = useMemo(
    () =>
      buildLocationIntelligenceReport(
        sharedCoordinates.lat,
        sharedCoordinates.lon,
        sharedCoordinates.label,
        molaState.value,
        molaState.status
      ),
    [
      sharedCoordinates.lat,
      sharedCoordinates.lon,
      sharedCoordinates.label,
      molaState.value,
      molaState.status,
    ]
  );

  const routeReport = useMemo(
    () => buildRouteIntelligenceReport(routeState.routeName, routeState.waypoints),
    [routeState.routeName, routeState.waypoints]
  );

  const selectCoordinates = useCallback(
    (lat: number, lon: number, label?: string, zoom = 8.8) => {
      const clampedLat = clampLatitude(lat);
      const wrappedLon = normalizeLongitude(lon);
      setCoordError(null);
      onUpdateSharedCoordinates({
        lat: clampedLat,
        lon: wrappedLon,
        label,
      });
      setJumpRequest((prev) => ({
        lat: clampedLat,
        lon: wrappedLon,
        zoom,
        seq: (prev?.seq ?? 0) + 1,
      }));
    },
    [onUpdateSharedCoordinates]
  );

  const handleApplyManualCoords = () => {
    const latStr = latInput.trim();
    const lonStr = lonInput.trim();
    const parsedLat = Number(latStr);
    const parsedLon = Number(lonStr);
    if (!latStr || !lonStr || !Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) {
      setCoordError('Enter valid numeric latitude and longitude values.');
      return;
    }
    if (parsedLat < -90 || parsedLat > 90) {
      setCoordError('Areocentric latitude must lie between -90° and +90°.');
      return;
    }
    setSelectedWaypointId('');
    selectCoordinates(parsedLat, parsedLon, 'Manual Coordinate');
  };

  const handleSelectWaypoint = (wpId: string) => {
    setSelectedWaypointId(wpId);
    const wp = routeState.waypoints.find((w) => w.id === wpId);
    if (!wp) return;
    selectCoordinates(
      wp.lat,
      wp.lon,
      wp.label?.trim() || `Marswalk Waypoint`,
      10.5
    );
  };

  const handleMapClick = useCallback(
    (pt: SelectedMapPoint) => {
      setSelectedWaypointId('');
      onUpdateSharedCoordinates({
        lat: pt.lat,
        lon: pt.lon,
        label: 'Selected Map Point',
      });
    },
    [onUpdateSharedCoordinates]
  );

  const domainObservations = useMemo(() => {
    const all = [
      ...report.localObservations,
      ...report.regionalObservations,
      ...report.planetaryReferenceObservations,
      ...report.interpretationsAndHypotheses,
      ...report.comparativeSiteObservations,
    ];
    return {
      atmosphere: all.filter((o) => o.domain === 'atmosphere'),
      temperature: all.filter((o) => o.domain === 'temperature'),
      radiation: all.filter((o) => o.domain === 'radiation'),
      dust: all.filter((o) => o.domain === 'dust'),
      water: all.filter((o) => o.domain === 'water'),
    };
  }, [report]);

  const filteredSources = useMemo(() => {
    if (sourceFilter === 'ALL') return SCIENTIFIC_SOURCES_REGISTRY;
    return SCIENTIFIC_SOURCES_REGISTRY.filter(
      (s) => s.classification === sourceFilter
    );
  }, [sourceFilter]);

  const renderDomainCards = (
    domain: 'atmosphere' | 'temperature' | 'radiation' | 'dust' | 'water'
  ) => {
    const list = domainObservations[domain];
    const localItems = list.filter((o) => o.scope === 'local-site');
    const regionalItems = list.filter((o) => o.scope === 'regional-orbital');
    const planetaryItems = list.filter(
      (o) =>
        o.scope === 'planetary-reference' &&
        o.classification !== 'D' &&
        o.classification !== 'E'
    );
    const interpretationItems = list.filter(
      (o) => o.classification === 'D' || o.classification === 'E'
    );
    const otherSiteItems = list.filter(
      (o) => o.scope === 'other-site-comparison'
    );

    return (
      <div className="space-y-6">
        {/* Local Observations at Selected Coordinate */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#232732] pb-2">
            <h3 className="text-sm font-semibold text-white">
              Direct Local Observations at Selected Coordinate
            </h3>
            <span className="text-xs font-mono text-[#6EE7B7]">
              Category A · {report.matchedSite ? report.matchedSite.name : 'No Local Station'}
            </span>
          </div>

          {localItems.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {localItems.map((obs) => (
                <ObservationCard key={obs.id} observation={obs} />
              ))}
            </div>
          ) : (
            <div className="p-4 bg-[#0D0F14] border border-[#232732] rounded-lg text-xs text-[#C7CCD6] space-y-1.5">
              <div className="font-semibold text-white">
                Direct local {domain} observations unavailable at this coordinate
              </div>
              <p className="text-[#9CA3AF] leading-relaxed">
                {domain === 'radiation' &&
                report.matchedSite &&
                !report.matchedSite.hasLocalRadiationData
                  ? `${report.matchedSite.name} has no in-situ ionizing radiation (GCR/SEP) dosimeter. Curiosity RAD measurements from Gale Crater (~3,700 km away) are shown strictly in the Comparative Other-Site section below.`
                  : `No surface lander or rover has recorded direct ${domain} measurements at ${formatMarsLatLonDetailed(
                      report.lat,
                      report.lon
                    )}. Refer to Planetary/Global Reference values or documented comparative landing sites below.`}
              </p>
            </div>
          )}
        </div>

        {/* Regional Orbital Observations */}
        {regionalItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#232732] pb-2">
              <h3 className="text-sm font-semibold text-white">
                Regional Orbital Observations Covering Coordinate
              </h3>
              <span className="text-xs font-mono text-[#60A5FA]">
                Category B · Regional Remote Sensing
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {regionalItems.map((obs) => (
                <ObservationCard key={obs.id} observation={obs} />
              ))}
            </div>
          </div>
        )}

        {/* Planetary / Global Reference */}
        {planetaryItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#232732] pb-2">
              <h3 className="text-sm font-semibold text-white">
                Planetary &amp; Global Reference Baselines
              </h3>
              <span className="text-xs font-mono text-[#E5A952]">
                Category C · Planetary Reference (Not a Local Measurement)
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {planetaryItems.map((obs) => (
                <ObservationCard key={obs.id} observation={obs} />
              ))}
            </div>
          </div>
        )}

        {/* Interpretations & Hypotheses */}
        {interpretationItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#232732] pb-2">
              <h3 className="text-sm font-semibold text-white">
                Scientific Interpretations &amp; Unconfirmed Hypotheses
              </h3>
              <span className="text-xs font-mono text-[#C4B5FD]">
                Category D / E · Separated from Confirmed Measurements
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {interpretationItems.map((obs) => (
                <ObservationCard key={obs.id} observation={obs} />
              ))}
            </div>
          </div>
        )}

        {/* Comparative Other-Site Observations (Strictly Labeled) */}
        {otherSiteItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#232732] pb-2">
              <h3 className="text-sm font-semibold text-white">
                Comparative NASA Surface Mission Records (Different Locations on Mars)
              </h3>
              <span className="text-xs font-mono text-[#F39C82]">
                Other-Site Context · Do Not Treat as Local to{' '}
                {report.matchedSite ? report.matchedSite.name : 'Selected Point'}
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {otherSiteItems.map((obs) => (
                <ObservationCard
                  key={obs.id}
                  observation={obs}
                  contextBadge="Separate Mission Site"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#232732] pb-5">
        <div className="space-y-1.5">
          <div className="text-xs font-mono text-[#9CA3AF]">
            Active Module · Milestone 4 · NASA PDS &amp; Peer-Reviewed Planetary Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white text-balance">
            Mars Survival Intelligence System
          </h1>
          <p className="text-sm text-[#9CA3AF] max-w-2xl">
            Location-linked Martian environmental, geological, and mission-planning
            reference distinguishing direct local measurements, regional orbital coverage,
            and planetary reference baselines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#C7CCD6] hover:text-white bg-[#111318] hover:bg-[#191D26] border border-[#232732] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>2D Scientific Map</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('planner')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#C7CCD6] hover:text-white bg-[#111318] hover:bg-[#191D26] border border-[#232732] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Route className="w-3.5 h-3.5" />
            <span>Marswalk Planner</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMapPicker((prev) => !prev)}
            aria-expanded={showMapPicker}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showMapPicker
                ? 'bg-[#191D26] text-white border border-[#D9532F]'
                : 'bg-[#D9532F] hover:bg-[#B64223] text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{showMapPicker ? 'Hide Mars Map Picker' : 'Pick Location on Map'}</span>
          </button>
        </div>
      </div>

      {/* Location Selector Console: Coordinates + Quick Regions + Waypoints + Route */}
      <section className="p-4 sm:p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          {/* Active Coordinate Summary */}
          <div className="lg:col-span-4 space-y-1">
            <div className="text-xs text-[#8D95A5]">Active Study Coordinate</div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-lg font-mono font-semibold tabular-nums text-white">
                {formatMarsLatLonDetailed(report.lat, report.lon)}
              </span>
              <span className="text-xs font-mono tabular-nums text-[#8D95A5]">
                ({report.lon360.toFixed(2)}° E)
              </span>
            </div>
            <div className="text-xs text-[#F39C82]">
              {report.matchedSite
                ? `${report.matchedSite.name} (${report.distanceToMatchedSiteKm?.toFixed(1)} km from site ref)`
                : `Uninstrumented Terrain · ${report.distanceToJezeroKm.toFixed(0)} km from Jezero`}
            </div>
          </div>

          {/* Manual Lat / Lon Entry */}
          <div className="lg:col-span-4 space-y-1.5">
            <div className="text-xs font-medium text-[#9CA3AF]">
              Enter Coordinates Manually (Areocentric °)
            </div>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-4">
                <label htmlFor="survival-lat-input" className="sr-only">
                  Latitude in degrees
                </label>
                <input
                  id="survival-lat-input"
                  type="number"
                  step="0.01"
                  min={-90}
                  max={90}
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyManualCoords();
                  }}
                  placeholder="Lat (°)"
                  className="w-full px-2.5 py-2 text-xs font-mono tabular-nums bg-[#0D0F14] border border-[#232732] focus:border-[#D9532F] focus:outline-none rounded text-white"
                />
              </div>
              <div className="col-span-4">
                <label htmlFor="survival-lon-input" className="sr-only">
                  Longitude in degrees
                </label>
                <input
                  id="survival-lon-input"
                  type="number"
                  step="0.01"
                  value={lonInput}
                  onChange={(e) => setLonInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyManualCoords();
                  }}
                  placeholder="Lon (°)"
                  className="w-full px-2.5 py-2 text-xs font-mono tabular-nums bg-[#0D0F14] border border-[#232732] focus:border-[#D9532F] focus:outline-none rounded text-white"
                />
              </div>
              <div className="col-span-4">
                <button
                  type="button"
                  onClick={handleApplyManualCoords}
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-[#191D26] hover:bg-[#D9532F] border border-[#323848] hover:border-[#D9532F] rounded transition-colors whitespace-nowrap cursor-pointer"
                >
                  Inspect Point
                </button>
              </div>
            </div>
            {coordError && (
              <p className="text-[11px] text-[#F7B29B]">{coordError}</p>
            )}
          </div>

          {/* Marswalk Waypoint / Route Selector */}
          <div className="lg:col-span-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="survival-waypoint-select" className="font-medium text-[#9CA3AF]">
                Marswalk Planner Connection
              </label>
              <span className="font-mono text-[11px] text-[#8D95A5]">
                {routeState.waypoints.length} waypoint{routeState.waypoints.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                id="survival-waypoint-select"
                value={selectedWaypointId}
                onChange={(e) => handleSelectWaypoint(e.target.value)}
                disabled={routeState.waypoints.length === 0}
                className="flex-1 min-w-0 px-2.5 py-2 text-xs bg-[#0D0F14] border border-[#232732] focus:border-[#D9532F] focus:outline-none rounded text-[#E6E8EC] disabled:opacity-50"
              >
                <option value="">
                  {routeState.waypoints.length === 0
                    ? 'No Marswalk waypoints planned yet'
                    : 'Select a planned waypoint...'}
                </option>
                {routeState.waypoints.map((wp, idx) => (
                  <option key={wp.id} value={wp.id}>
                    #{idx + 1} · {wp.label?.trim() || `Waypoint ${idx + 1}`} (
                    {wp.lat.toFixed(2)}°, {normalizeLongitude(wp.lon).toFixed(2)}°)
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setActiveTab('route')}
                className="px-3 py-2 text-xs font-medium text-[#E6E8EC] hover:text-white bg-[#161920] hover:bg-[#1E222B] border border-[#232732] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Inspect Route
              </button>
            </div>
          </div>
        </div>

        {/* Quick Site Presets */}
        <div className="pt-3 border-t border-[#232732] flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#8D95A5] mr-1 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-[#D9532F]" />
            <span>Study Regions:</span>
          </span>
          {QUICK_TEST_LOCATIONS.map((loc) => {
            const isSelected =
              Math.abs(report.lat - loc.lat) < 0.05 &&
              Math.abs(report.lon - loc.lon) < 0.05;
            return (
              <button
                key={loc.label}
                type="button"
                onClick={() => {
                  setSelectedWaypointId('');
                  selectCoordinates(loc.lat, loc.lon, loc.label, 8.8);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[#D9532F]/20 border-[#D9532F] text-white'
                    : 'bg-[#0D0F14] hover:bg-[#191D26] border-[#232732] text-[#C7CCD6]'
                }`}
              >
                {loc.label}
              </button>
            );
          })}
        </div>

        {/* Collapsible Embedded Interactive 2D Map Picker */}
        {showMapPicker && (
          <div className="pt-4 border-t border-[#232732] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-[#C7CCD6]">
                Click anywhere on the NASA Mars Trek 2D map to inspect Survival Intelligence for that location.
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ['ctx-jezero', 'CTX Imagery'],
                    ['mola-clrshade', 'MOLA Relief'],
                    ['themis-day-ir', 'THEMIS Day IR'],
                    ['themis-night-ir', 'THEMIS Night IR'],
                    ['viking-color', 'Viking Color'],
                  ] as Array<[MarsBaseLayerId, string]>
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMapBaseLayer(id)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                      mapBaseLayer === id
                        ? 'bg-[#191D26] border-[#D9532F] text-white'
                        : 'bg-[#0D0F14] border-[#232732] text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <MarsScientificMap
              baseLayerId={mapBaseLayer}
              overlays={{
                hirise: {
                  enabled: mapBaseLayer === 'ctx-jezero',
                  opacity: 1,
                },
                mola: { enabled: false, opacity: 0.45 },
                themisDay: { enabled: false, opacity: 0.5 },
              }}
              selectedPoint={{ lat: report.lat, lon: report.lon }}
              jumpRequest={jumpRequest}
              onSelectPoint={handleMapClick}
              plannerWaypoints={routeState.waypoints}
              heightClassName="h-[360px] sm:h-[420px]"
            />
          </div>
        )}
      </section>

      {/* Honest Local Data Availability Banner */}
      <StatusNotice
        tone={report.matchedSite?.hasLocalWeatherData ? 'milestone' : 'safety'}
        label={
          report.matchedSite
            ? `Region Coverage: ${report.matchedSite.name}`
            : 'Outside In-Situ Surface Mission Footprints'
        }
        message={report.localAvailabilityNotice}
      />

      {/* Section Navigation Tabs */}
      <nav
        aria-label="Survival intelligence sections"
        className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#232732]"
      >
        {SECTION_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`px-3.5 py-2 text-xs font-medium rounded-t border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'border-[#D9532F] text-white bg-[#111318]'
                  : 'border-transparent text-[#9CA3AF] hover:text-white hover:bg-[#111318]/60'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ==================== TAB CONTENT ==================== */}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Classification Legend (A–E) */}
          <section className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-white">
                Scientific Evidence Classification System
              </h2>
              <span className="text-xs text-[#8D95A5]">
                Every observation is tagged A–E and never merged without attribution
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {(['A', 'B', 'C', 'D', 'E'] as ClassificationCode[]).map((code) => {
                const meta = CLASSIFICATION_SYSTEM[code];
                return (
                  <div
                    key={code}
                    className="p-3 bg-[#0D0F14] border border-[#232732] rounded space-y-1"
                  >
                    <div
                      className={`text-xs font-mono font-semibold ${CLASSIFICATION_TEXT_COLOR[code]}`}
                    >
                      {meta.shortLabel}
                    </div>
                    <p className="text-xs text-[#9CA3AF] leading-relaxed">
                      {meta.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4-Domain Snapshot Cards for Active Coordinate */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-[#111318] border border-[#232732] rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                <span className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-[#D9532F]" />
                  <span>Atmosphere</span>
                </span>
                <span
                  className={`font-mono ${
                    report.matchedSite?.hasLocalWeatherData
                      ? 'text-[#6EE7B7]'
                      : 'text-[#E5A952]'
                  }`}
                >
                  {report.matchedSite?.hasLocalWeatherData ? 'Cat A Local' : 'Cat C Global'}
                </span>
              </div>
              <div className="text-xl font-mono font-semibold tabular-nums text-white">
                {report.matchedSite?.id === 'jezero-crater'
                  ? '610 – 780 Pa'
                  : report.matchedSite?.id === 'gale-crater'
                  ? '700 – 925 Pa'
                  : report.matchedSite?.id === 'elysium-insight'
                  ? '630 – 840 Pa'
                  : '~610 Pa (datum ref)'}
              </div>
              <p className="text-xs text-[#9CA3AF]">
                95.32% CO₂ · &lt;1% Earth sea-level pressure; full pressure suits mandatory.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('atmosphere')}
                className="text-xs font-medium text-[#F39C82] hover:text-white inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open Atmosphere</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="p-4 bg-[#111318] border border-[#232732] rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                <span className="flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-[#D9532F]" />
                  <span>Temperature</span>
                </span>
                <span
                  className={`font-mono ${
                    report.matchedSite?.hasLocalWeatherData
                      ? 'text-[#6EE7B7]'
                      : 'text-[#E5A952]'
                  }`}
                >
                  {report.matchedSite?.hasLocalWeatherData ? 'Cat A Local' : 'Cat C Global'}
                </span>
              </div>
              <div className="text-xl font-mono font-semibold tabular-nums text-white">
                {report.matchedSite?.id === 'jezero-crater'
                  ? '-83 °C to -17 °C'
                  : report.matchedSite?.id === 'gale-crater'
                  ? '-89 °C to +4 °C'
                  : report.matchedSite?.id === 'vastitas-phoenix'
                  ? '-96 °C to -17 °C'
                  : '-63 °C mean (global)'}
              </div>
              <p className="text-xs text-[#9CA3AF]">
                {report.matchedSite?.id === 'jezero-crater'
                  ? 'MEDA air range (ground swings -98 °C to +2 °C).'
                  : 'Extreme diurnal swings due to thin CO₂ air.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('temperature')}
                className="text-xs font-medium text-[#F39C82] hover:text-white inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open Temperature</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="p-4 bg-[#111318] border border-[#232732] rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#D9532F]" />
                  <span>Ionizing Radiation</span>
                </span>
                <span
                  className={`font-mono ${
                    report.matchedSite?.hasLocalRadiationData
                      ? 'text-[#6EE7B7]'
                      : 'text-[#F39C82]'
                  }`}
                >
                  {report.matchedSite?.hasLocalRadiationData
                    ? 'Cat A Local'
                    : 'No Local RAD'}
                </span>
              </div>
              <div className="text-xl font-mono font-semibold tabular-nums text-white">
                {report.matchedSite?.hasLocalRadiationData
                  ? '~0.67 mSv/day'
                  : 'Unavailable Locally'}
              </div>
              <p className="text-xs text-[#9CA3AF]">
                {report.matchedSite?.hasLocalRadiationData
                  ? 'Curiosity RAD (Gale Crater, 2012–2013 solar max).'
                  : 'Only Gale Crater has RAD dosimetry; thin ~16–20 g/cm² air globally.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('radiation')}
                className="text-xs font-medium text-[#F39C82] hover:text-white inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open Radiation</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="p-4 bg-[#111318] border border-[#232732] rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#D9532F]" />
                  <span>Orbital Datasets</span>
                </span>
                <span className="font-mono text-[#60A5FA]">
                  {report.orbitalCoverage.filter((c) => c.covered).length}/
                  {report.orbitalCoverage.length} Layers
                </span>
              </div>
              <div className="text-xl font-mono font-semibold tabular-nums text-white">
                {report.orbitalCoverage.find((c) => c.layerId === 'hirise-jezero')
                  ?.covered
                  ? '25 cm/px HiRISE'
                  : report.orbitalCoverage.find((c) => c.layerId === 'themis-ir')
                      ?.covered
                  ? '~5–100 m/px'
                  : '~5–463 m/px'}
              </div>
              <p className="text-xs text-[#9CA3AF]">
                {report.relativeMolaIndex.status === 'loaded' &&
                report.relativeMolaIndex.value !== null
                  ? `Relative MOLA Index: ${report.relativeMolaIndex.value.toFixed(3)} (uncalibrated)`
                  : 'MOLA relative index loading…'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('terrain')}
                className="text-xs font-medium text-[#F39C82] hover:text-white inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open Terrain &amp; Geology</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </section>

          {/* Study Site Profile (or Uninstrumented Terrain Note) */}
          {report.matchedSite ? (
            <section className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#232732] pb-3">
                <div>
                  <div className="text-xs font-mono text-[#E5A952]">
                    {report.matchedSite.subtitle}
                  </div>
                  <h2 className="text-lg font-semibold text-white mt-0.5">
                    {report.matchedSite.name} — Site Brief
                  </h2>
                </div>
                <span className="text-xs font-mono text-[#8D95A5]">
                  Ref: {formatMarsLatLonDetailed(report.matchedSite.lat, report.matchedSite.lon)}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-[#E6E8EC]">
                    Mission Context
                  </div>
                  <p className="text-xs text-[#C7CCD6] leading-relaxed">
                    {report.matchedSite.missionContext}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-[#E6E8EC]">
                    Published Elevation &amp; Geology
                  </div>
                  <p className="text-xs text-[#C7CCD6] leading-relaxed">
                    {report.matchedSite.elevationSummary}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-[#E6E8EC]">
                    Water &amp; Resource Confirmation
                  </div>
                  <p className="text-xs text-[#C7CCD6] leading-relaxed">
                    {report.matchedSite.waterConfirmationNote}
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <section className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-2">
              <h2 className="text-base font-semibold text-white">
                Uninstrumented Coordinate Notice
              </h2>
              <p className="text-sm text-[#C7CCD6] leading-relaxed">
                No surface mission has operated near{' '}
                <span className="font-mono text-white">
                  {formatMarsLatLonDetailed(report.lat, report.lon)}
                </span>
                . Use the <button type="button" onClick={() => setActiveTab('terrain')} className="text-[#F39C82] underline cursor-pointer">Terrain &amp; Geology</button>{' '}
                tab to inspect orbital mosaic coverage at this location, or select a documented NASA study region above (such as Jezero Crater) to examine in-situ measurements.
              </p>
            </section>
          )}
        </div>
      )}

      {activeTab === 'atmosphere' && (
        <div className="space-y-6">
          <StatusNotice
            tone="milestone"
            label="Historical & Reference Atmospheric Data — Not Live Mars Weather"
            message="ARES PATH does not fabricate current Martian weather. Local values below represent peer-reviewed NASA PDS mission periods (e.g., Perseverance MEDA at Jezero, Curiosity REMS at Gale, InSight APSS at Elysium); global figures are labeled Category C planetary references."
          />
          <AtmosphericCompositionChart />
          {renderDomainCards('atmosphere')}
        </div>
      )}

      {activeTab === 'temperature' && (
        <div className="space-y-6">
          <TemperatureRangeChart activeSiteId={report.matchedSite?.id} />
          {renderDomainCards('temperature')}
        </div>
      )}

      {activeTab === 'radiation' && (
        <div className="space-y-6">
          <StatusNotice
            tone="safety"
            label="Scientific Radiation Guardrail — Site Separation Enforced"
            message="Curiosity’s Radiation Assessment Detector (RAD) operates exclusively in Gale Crater (~4.6° S, 137.4° E). Perseverance in Jezero Crater (~18.4° N, 77.4° E) does not carry a GCR/SEP particle dosimeter. Gale Crater RAD data is never presented as a direct Jezero Crater measurement."
          />
          <RadiationShieldingDiagram />
          {renderDomainCards('radiation')}
        </div>
      )}

      {activeTab === 'terrain' && (
        <div className="space-y-6">
          {/* Distinction between true elevation vs shaded-relief imagery */}
          <StatusNotice
            tone="milestone"
            label="Elevation Data vs. Shaded-Relief Imagery Distinction"
            message="The 2D Scientific Map renders MGS MOLA Color Hillshade (463 m/px) as a derived RGB shaded-relief visualization, and the local 2048×1024 MOLA DEM PNG is an uncalibrated 8-bit normalized raster. Exact metric elevation (meters) and slope degrees are NOT computed from imagery pixels alone."
          />

          {/* Relative MOLA Index + Site Elevation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[#E5A952]">
                  C · Local 8-bit MOLA Raster Sample
                </span>
                <span className="font-mono text-[#8D95A5]">2048 × 1024 Baseline</span>
              </div>
              <div className="text-sm font-semibold text-white">
                Relative MOLA Relief Index at Coordinate
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-semibold tabular-nums text-white">
                  {report.relativeMolaIndex.status === 'loading'
                    ? 'Sampling…'
                    : report.relativeMolaIndex.value !== null
                    ? report.relativeMolaIndex.value.toFixed(3)
                    : 'Unavailable'}
                </span>
                {report.relativeMolaIndex.value !== null && (
                  <span className="text-xs font-mono text-[#9CA3AF]">
                    / 1.000 normalized scale
                  </span>
                )}
              </div>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                {report.relativeMolaIndex.caveat}
              </p>
            </div>

            <div className="lg:col-span-7 p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[#60A5FA]">
                  {report.matchedSite
                    ? `Cat ${report.matchedSite.elevationClassification} · Published Site Topography`
                    : 'Unavailable for Unmapped Coordinate'}
                </span>
                <span className="text-[#8D95A5]">
                  {report.matchedSite?.elevationSource ?? 'No site DEM brief'}
                </span>
              </div>
              <div className="text-sm font-semibold text-white">
                {report.matchedSite
                  ? `${report.matchedSite.name} Geological & Topographic Summary`
                  : 'Local Geological Formation Details Unavailable'}
              </div>
              {report.matchedSite ? (
                <div className="space-y-2.5 text-xs text-[#C7CCD6]">
                  <p className="leading-relaxed">
                    <strong className="text-white">Elevation:</strong>{' '}
                    {report.matchedSite.elevationSummary}
                  </p>
                  <p className="leading-relaxed">
                    <strong className="text-white">Geology:</strong>{' '}
                    {report.matchedSite.geologicalSetting}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Exact local elevation in meters, rock abundance, and geological unit
                  classifications are not available in-browser for arbitrary global
                  coordinates outside documented study regions. Inspect the orbital
                  imagery coverage table below or open the 2D Scientific Map to examine
                  CTX, THEMIS, and MOLA hillshade layers visually.
                </p>
              )}
            </div>
          </div>

          {/* Site Surface Features & Difficult Terrain */}
          {report.matchedSite && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-3">
                <div className="text-xs font-mono text-[#60A5FA]">
                  B / D · Documented Surface Features &amp; Formations
                </div>
                <h3 className="text-base font-semibold text-white">
                  Landforms, Rocks &amp; Stratigraphy
                </h3>
                <ul className="space-y-2 text-xs text-[#C7CCD6]">
                  {report.matchedSite.surfaceFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-[#D9532F] font-mono shrink-0">—</span>
                      <span className="leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-3">
                <div className="text-xs font-mono text-[#E5A952]">
                  B · Potentially Difficult Terrain (Non-Certified Reference)
                </div>
                <h3 className="text-base font-semibold text-white">
                  Known Mobility &amp; Terrain Challenges
                </h3>
                <ul className="space-y-2 text-xs text-[#C7CCD6]">
                  {report.matchedSite.difficultTerrainNotes.map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="text-[#E5A952] font-mono shrink-0">—</span>
                      <span className="leading-relaxed">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Orbital Dataset Coverage Table at Coordinate */}
          <section className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-white">
                NASA Mars Trek &amp; Orbital Layer Coverage at Coordinate
              </h3>
              <span className="text-xs font-mono text-[#8D95A5]">
                {formatMarsLatLonDetailed(report.lat, report.lon)}
              </span>
            </div>

            <div className="overflow-x-auto border border-[#232732] rounded">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#232732] bg-[#0D0F14] text-[#9CA3AF]">
                    <th className="py-2.5 px-3">Dataset &amp; Instrument</th>
                    <th className="py-2.5 px-3">Resolution</th>
                    <th className="py-2.5 px-3">Data Kind</th>
                    <th className="py-2.5 px-3">Coverage at Point</th>
                    <th className="py-2.5 px-3">WMTS Service</th>
                    <th className="py-2.5 px-3">Limitations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232732]">
                  {report.orbitalCoverage.map((layer) => {
                    const check = wmtsVerification[layer.layerId];
                    return (
                      <tr key={layer.layerId} className="align-top">
                        <td className="py-3 px-3">
                          <div className="font-medium text-white">{layer.name}</div>
                          <div className="text-[11px] text-[#8D95A5] mt-0.5">
                            {layer.instrument} · {layer.extentDescription}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[#E6E8EC] whitespace-nowrap">
                          {layer.resolution}
                        </td>
                        <td className="py-3 px-3 text-[#C7CCD6] whitespace-nowrap">
                          {layer.dataKind}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-mono font-medium ${
                              layer.covered ? 'text-[#6EE7B7]' : 'text-[#8D95A5]'
                            }`}
                          >
                            {layer.covered ? 'Covered' : 'Outside Footprint'}
                          </span>
                          <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                            {layer.coverageNote}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono whitespace-nowrap">
                          {!check ? (
                            <span className="text-[#8D95A5]">Checking…</span>
                          ) : check.reachable ? (
                            <a
                              href={layer.capabilitiesUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#60A5FA] hover:text-white"
                            >
                              <span>Verified</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[#E5A952]">Cached / Offline</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[#9CA3AF] leading-relaxed min-w-[220px]">
                          {layer.limitations}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'dust' && (
        <div className="space-y-6">
          <StatusNotice
            tone="milestone"
            label="No Live Dust Storm Status Claimed"
            message="ARES PATH has no live orbital atmospheric weather feed and cannot state whether a dust devil or dust storm is occurring at this coordinate right now. All dust storm data below represents documented historical mission observations and Mars climatology."
          />
          <DustPhenomenaDiagram />
          {renderDomainCards('dust')}
        </div>
      )}

      {activeTab === 'water' && (
        <div className="space-y-6">
          <StatusNotice
            tone="safety"
            label="Resource Clarification — Drinking Water Not Confirmed at Jezero Crater"
            message="Ancient lake deltas and hydrated clay/carbonate minerals at Jezero Crater confirm past liquid water (~3.5–3.8 billion years ago), NOT modern accessible liquid water or shallow drinking water. Shallow subsurface water ice is confirmed only at high latitudes (e.g., Phoenix at 68.2° N) and interpreted in mid-latitudes."
          />
          <WaterEvidenceDiagram />
          {renderDomainCards('water')}
        </div>
      )}

      {activeTab === 'considerations' && (
        <div className="space-y-6">
          <StatusNotice
            tone="safety"
            label="No Safety Certification or Automated Hazard Ratings"
            message="ARES PATH does not compute numerical hazard scores, survival probabilities, or route safety certifications. The engineering and operational considerations below summarize documented physical constraints from NASA planetary science archives."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {EXPLORATION_CONSIDERATIONS.map((item) => (
              <article
                key={item.id}
                className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[#9CA3AF]">{item.category}</span>
                  <span
                    className={`font-mono font-medium ${CLASSIFICATION_TEXT_COLOR[item.classification]}`}
                  >
                    {CLASSIFICATION_SYSTEM[item.classification].shortLabel}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-white">{item.title}</h3>

                <dl className="space-y-2.5 text-xs">
                  <div>
                    <dt className="font-semibold text-[#E6E8EC]">What the challenge is</dt>
                    <dd className="text-[#C7CCD6] mt-0.5 leading-relaxed">
                      {item.challenge}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#E6E8EC]">Why it matters to exploration</dt>
                    <dd className="text-[#C7CCD6] mt-0.5 leading-relaxed">
                      {item.whyItMatters}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#E6E8EC]">Relevant scientific evidence</dt>
                    <dd className="text-[#C7CCD6] mt-0.5 leading-relaxed">
                      {item.scientificEvidence}
                    </dd>
                  </div>
                  <div className="pt-2 border-t border-[#232732]">
                    <dt className="text-[#8D95A5]">Source &amp; limitations</dt>
                    <dd className="text-[#9CA3AF] mt-0.5 leading-relaxed">
                      {item.limitations}
                    </dd>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-1.5 text-xs font-medium text-[#60A5FA] hover:text-white"
                    >
                      <span>{item.sourceLabel}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'route' && (
        <div className="space-y-6">
          <StatusNotice
            tone="safety"
            label="Route Scientific Coverage Only — Not a Safety Assessment"
            message="This view reports which Marswalk Planner waypoints and segments fall inside NASA orbital footprints and documented study sites, and where data is missing. It does NOT validate terrain slope, boulder hazards, dust conditions, or EVA safety."
          />

          {routeReport.waypointCount === 0 ? (
            <div className="p-6 bg-[#111318] border border-[#232732] rounded-lg text-center space-y-3">
              <MapPin className="w-6 h-6 text-[#D9532F] mx-auto" />
              <h2 className="text-base font-semibold text-white">
                No Marswalk Route Waypoints Defined
              </h2>
              <p className="text-xs text-[#9CA3AF] max-w-md mx-auto leading-relaxed">
                Create waypoints in the Marswalk Planner to inspect waypoint-by-waypoint
                and segment-by-segment NASA dataset coverage here.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#D9532F] hover:bg-[#B64223] rounded transition-colors cursor-pointer"
              >
                <Route className="w-3.5 h-3.5" />
                <span>Open Marswalk Planner</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Route-Level Summary */}
              <div className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#232732] pb-3">
                  <div>
                    <div className="text-xs font-mono text-[#E5A952]">
                      Active Marswalk Route Summary
                    </div>
                    <h2 className="text-lg font-semibold text-white mt-0.5">
                      {routeReport.routeName}
                    </h2>
                  </div>
                  <div className="text-xs font-mono tabular-nums text-[#E6E8EC]">
                    {routeReport.waypointCount} waypoints · {routeReport.totalDistanceFormatted}
                  </div>
                </div>
                <p className="text-sm text-[#C7CCD6] leading-relaxed">
                  {routeReport.routeScientificSummary}
                </p>

                {routeReport.missingDataSummary.length > 0 && (
                  <div className="p-3.5 bg-[#0D0F14] border border-[#232732] rounded space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F7B29B]">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#D9532F]" />
                      <span>Missing Data &amp; Coverage Gaps Along Route</span>
                    </div>
                    <ul className="space-y-1 text-xs text-[#9CA3AF]">
                      {routeReport.missingDataSummary.map((gap) => (
                        <li key={gap}>— {gap}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Waypoint-by-Waypoint Scientific Coverage */}
              <div className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-3">
                <h3 className="text-base font-semibold text-white">
                  Waypoint Scientific Coverage
                </h3>
                <div className="overflow-x-auto border border-[#232732] rounded">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#232732] bg-[#0D0F14] text-[#9CA3AF]">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Waypoint &amp; Coordinates</th>
                        <th className="py-2.5 px-3">Study Region</th>
                        <th className="py-2.5 px-3">HiRISE 25 cm</th>
                        <th className="py-2.5 px-3">Jezero CTX 6 m</th>
                        <th className="py-2.5 px-3">THEMIS ±65°</th>
                        <th className="py-2.5 px-3">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#232732]">
                      {routeReport.waypoints.map((wp) => (
                        <tr key={wp.id} className="align-top">
                          <td className="py-2.5 px-3 font-mono text-white">{wp.order}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-white">{wp.label}</div>
                            <div className="font-mono tabular-nums text-[11px] text-[#8D95A5]">
                              {formatMarsLatLonDetailed(wp.lat, wp.lon)}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-[#C7CCD6]">
                            {wp.matchedSiteName ?? 'Uninstrumented'}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <span
                              className={
                                wp.hasHirise25cm ? 'text-[#6EE7B7]' : 'text-[#8D95A5]'
                              }
                            >
                              {wp.hasHirise25cm ? 'Covered' : 'Unavailable'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <span
                              className={
                                wp.hasJezeroCtx6m ? 'text-[#6EE7B7]' : 'text-[#8D95A5]'
                              }
                            >
                              {wp.hasJezeroCtx6m ? 'Covered' : 'Global ~5m'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <span
                              className={
                                wp.hasThemis100m ? 'text-[#6EE7B7]' : 'text-[#F39C82]'
                              }
                            >
                              {wp.hasThemis100m ? 'Covered' : 'Outside ±65°'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedWaypointId(wp.id);
                                selectCoordinates(wp.lat, wp.lon, wp.label, 11);
                                setActiveTab('overview');
                              }}
                              className="px-2.5 py-1 text-[11px] font-medium text-white bg-[#191D26] hover:bg-[#D9532F] border border-[#232732] rounded transition-colors whitespace-nowrap cursor-pointer"
                            >
                              Inspect Point
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Route Segment Coverage */}
              {routeReport.segments.length > 0 && (
                <div className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-3">
                  <h3 className="text-base font-semibold text-white">
                    Route Segment Data Coverage
                  </h3>
                  <div className="overflow-x-auto border border-[#232732] rounded">
                    <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#232732] bg-[#0D0F14] text-[#9CA3AF]">
                        <th className="py-2.5 px-3">Segment</th>
                        <th className="py-2.5 px-3">Approx. Distance</th>
                        <th className="py-2.5 px-3">HiRISE 25 cm</th>
                        <th className="py-2.5 px-3">CTX Coverage</th>
                        <th className="py-2.5 px-3">THEMIS ±65°</th>
                        <th className="py-2.5 px-3">Local Station</th>
                        <th className="py-2.5 px-3">Missing Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#232732]">
                      {routeReport.segments.map((seg) => (
                        <tr key={seg.legIndex} className="align-top">
                          <td className="py-2.5 px-3 font-medium text-white">
                            Leg {seg.legIndex}: {seg.fromLabel} → {seg.toLabel}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-[#E5A952]">
                            {seg.distanceFormatted}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#C7CCD6]">
                            {seg.hiriseCoverage}
                          </td>
                          <td className="py-2.5 px-3 text-[#C7CCD6]">
                            {seg.ctx6mCoverage}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#C7CCD6]">
                            {seg.themisCoverage}
                          </td>
                          <td className="py-2.5 px-3 text-[#C7CCD6]">
                            {seg.localSurfaceData}
                          </td>
                          <td className="py-2.5 px-3 text-[#9CA3AF]">
                            {seg.missingDataSummary}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'sources' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#D9532F]" />
              <h2 className="text-base font-semibold text-white">
                Scientific Data Quality &amp; Provenance Registry
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', 'A', 'B', 'C', 'D', 'E'] as const).map((code) => {
                const active = sourceFilter === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSourceFilter(code)}
                    className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-[#D9532F]/20 border-[#D9532F] text-white'
                        : 'bg-[#111318] border-[#232732] text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    {code === 'ALL' ? 'All Categories' : `Cat ${code}`}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSources.map((src) => (
              <article
                key={src.id}
                className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span
                    className={`font-mono font-semibold ${CLASSIFICATION_TEXT_COLOR[src.classification]}`}
                  >
                    {CLASSIFICATION_SYSTEM[src.classification].shortLabel}
                  </span>
                  <span className="font-mono text-[#8D95A5]">
                    {src.observationPeriod}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-white">
                  {src.datasetOrMission}
                </h3>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <dt className="text-[#8D95A5]">Instrument</dt>
                    <dd className="text-[#E6E8EC] mt-0.5">{src.instrument}</dd>
                  </div>
                  <div>
                    <dt className="text-[#8D95A5]">Location</dt>
                    <dd className="text-[#E6E8EC] mt-0.5">{src.location}</dd>
                  </div>
                  <div>
                    <dt className="text-[#8D95A5]">Measurement Units</dt>
                    <dd className="text-[#E6E8EC] font-mono mt-0.5">{src.units}</dd>
                  </div>
                  <div>
                    <dt className="text-[#8D95A5]">Spatial Resolution</dt>
                    <dd className="text-[#E6E8EC] mt-0.5">{src.spatialResolution}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[#8D95A5]">Limitations</dt>
                    <dd className="text-[#F7B29B] mt-0.5 leading-relaxed">
                      {src.limitations}
                    </dd>
                  </div>
                </dl>

                <div className="pt-2 border-t border-[#232732]">
                  <a
                    href={src.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#60A5FA] hover:text-white"
                  >
                    <span>{src.sourceLabel}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Explicit Fallback Note for Unused Martian Study Sites Reference */}
      <div className="sr-only" aria-hidden="true">
        {MARTIAN_STUDY_SITES.length} sites indexed
      </div>
    </div>
  );
}
