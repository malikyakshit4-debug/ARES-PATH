import { JEZERO_CRATER } from '../data/marsData';
import {
  CLASSIFICATION_SYSTEM,
  EXPLORATION_CONSIDERATIONS,
  MARTIAN_STUDY_SITES,
  SCIENTIFIC_SOURCES_REGISTRY,
  SURVIVAL_OBSERVATIONS,
} from '../data/survivalKnowledgeBase';
import {
  MissionReportDocument,
  ReportSection,
  ReportType,
} from '../types/reports';
import {
  ClassificationCode,
  MartianStudySite,
  ScientificObservation,
  ScientificSourceMeta,
} from '../types/survival';
import {
  clampLatitude,
  formatMarsLatLonDetailed,
  JEZERO_MAP_CENTER,
  MARS_BASE_LAYERS,
  MARS_OVERLAY_LAYERS,
  normalizeLongitude,
} from './marsMapLayers';
import {
  computeRouteMetrics,
  MARS_MEAN_RADIUS_KM,
  marsMeanRadiusDistanceKm,
  PlannerWaypoint,
} from './marsRouteMath';
import {
  buildLocationIntelligenceReport,
  buildRouteIntelligenceReport,
  evaluateOrbitalCoverage,
} from './marsSurvivalEngine';

export interface GenerateReportOptions {
  reportType: ReportType;
  customTitle?: string;
  lat: number;
  lon: number;
  locationLabel?: string;
  relativeMolaIndex: number | null;
  regionId: string;
  routeName: string;
  waypoints: PlannerWaypoint[];
}

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  location: 'Mars Location Intelligence Report',
  route: 'Marswalk Mission Report',
  region: 'Regional Exploration Report',
  briefing: 'Mars Exploration Briefing',
};

function createReportId(reportType: ReportType, now: Date): string {
  const prefixMap: Record<ReportType, string> = {
    location: 'LOC',
    route: 'RTE',
    region: 'REG',
    briefing: 'BRF',
  };
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const min = String(now.getUTCMinutes()).padStart(2, '0');
  const sec = String(now.getUTCSeconds()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AP-${prefixMap[reportType]}-${yyyy}${mm}${dd}-${hh}${min}${sec}-${rand}`;
}

function formatCreatedDisplay(now: Date): string {
  return `${now.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

function getDefaultTitle(options: GenerateReportOptions): string {
  if (options.reportType === 'location') {
    const label = options.locationLabel?.trim();
    if (label) return `Location Intelligence Report: ${label}`;
    return `Location Intelligence Report (${formatMarsLatLonDetailed(options.lat, options.lon)})`;
  }
  if (options.reportType === 'route') {
    const cleanRoute = options.routeName.trim() || 'Conceptual Marswalk Traverse';
    return `Marswalk Mission Report: ${cleanRoute}`;
  }
  if (options.reportType === 'region') {
    const site =
      MARTIAN_STUDY_SITES.find((s) => s.id === options.regionId) ??
      MARTIAN_STUDY_SITES[0];
    return `Regional Exploration Report: ${site.name}`;
  }
  return 'Mars Planetary Exploration Scientific Briefing';
}

function buildClassificationLegend(): MissionReportDocument['classificationLegend'] {
  return (['A', 'B', 'C', 'D', 'E'] as ClassificationCode[]).map((code) => ({
    code,
    label: CLASSIFICATION_SYSTEM[code].label,
    description: CLASSIFICATION_SYSTEM[code].description,
  }));
}

function deduplicateObservations(
  list: ScientificObservation[]
): ScientificObservation[] {
  const seen = new Map<string, ScientificObservation>();
  for (const obs of list) {
    if (!seen.has(obs.id)) {
      seen.set(obs.id, obs);
    }
  }
  return Array.from(seen.values());
}

function filterRelevantSources(
  observations: ScientificObservation[],
  includeOrbitalIds: string[] = []
): ScientificSourceMeta[] {
  const matched = new Map<string, ScientificSourceMeta>();
  const obsUrls = new Set(observations.map((o) => o.sourceUrl));

  for (const src of SCIENTIFIC_SOURCES_REGISTRY) {
    if (obsUrls.has(src.sourceUrl) || includeOrbitalIds.includes(src.id)) {
      matched.set(src.id, src);
    }
  }
  if (matched.size === 0) {
    return SCIENTIFIC_SOURCES_REGISTRY;
  }
  return Array.from(matched.values());
}

function padSectionNumber(n: number): string {
  return String(n).padStart(2, '0');
}

function observationToRow(obs: ScientificObservation): string[] {
  return [
    `Cat ${obs.classification} (${CLASSIFICATION_SYSTEM[obs.classification].shortLabel.replace(/^.\s·\s/, '')})`,
    obs.title,
    `${obs.primaryValue}${obs.unit ? ` ${obs.unit}` : ''}`,
    obs.observationLocation,
    obs.observationPeriod,
    `${obs.instrument} / ${obs.datasetOrMission}`,
    obs.limitations,
  ];
}

const OBSERVATION_TABLE_COLUMNS = [
  'Class',
  'Observation / Parameter',
  'Reported Value & Units',
  'Location',
  'Date / Period',
  'Instrument & Dataset',
  'Limitations',
];

function buildLocationReport(
  options: GenerateReportOptions,
  now: Date
): MissionReportDocument {
  const lat = clampLatitude(options.lat);
  const lon = normalizeLongitude(options.lon);
  const locReport = buildLocationIntelligenceReport(
    lat,
    lon,
    options.locationLabel,
    options.relativeMolaIndex,
    options.relativeMolaIndex !== null ? 'loaded' : 'unavailable'
  );

  const site = locReport.matchedSite;
  const allDomainObs = deduplicateObservations([
    ...locReport.localObservations,
    ...locReport.regionalObservations,
    ...locReport.planetaryReferenceObservations,
    ...locReport.interpretationsAndHypotheses,
    ...locReport.comparativeSiteObservations,
  ]);

  const byDomain = (domain: ScientificObservation['domain']) =>
    allDomainObs.filter((o) => o.domain === domain);

  const coveredLayers = locReport.orbitalCoverage.filter((c) => c.covered);
  const missingLayers = locReport.orbitalCoverage.filter((c) => !c.covered);

  const missingData: string[] = [];
  if (!site || !site.hasLocalWeatherData) {
    missingData.push(
      `No in-situ surface meteorology station exists at ${formatMarsLatLonDetailed(lat, lon)}.`
    );
  }
  if (!site || !site.hasLocalRadiationData) {
    missingData.push(
      site
        ? `No in-situ ionizing radiation (GCR/SEP) dosimetry exists at ${site.name} (only Gale Crater carries Curiosity RAD).`
        : 'No in-situ surface radiation dosimetry exists at this coordinate.'
    );
  }
  if (missingLayers.length > 0) {
    missingData.push(
      `Unavailable orbital layers at this coordinate: ${missingLayers.map((m) => m.name).join(', ')}.`
    );
  }
  missingData.push(
    'Per-pixel calibrated metric elevation (meters) and local slope degrees are not derived from shaded-relief or 8-bit normalized DEM tiles.'
  );
  missingData.push(
    'Live Martian weather, active dust-storm status, and real-time solar particle alerts are not connected.'
  );

  const executiveSummary = site
    ? `Location intelligence assessment for ${formatMarsLatLonDetailed(lat, lon)} within the ${site.name} study footprint (${locReport.distanceToMatchedSiteKm?.toFixed(1)} km from site reference). ${coveredLayers.length} of ${locReport.orbitalCoverage.length} NASA Mars Trek orbital datasets cover this coordinate. ${locReport.localAvailabilityNotice}`
    : `Location intelligence assessment for uninstrumented Martian terrain at ${formatMarsLatLonDetailed(lat, lon)} (${locReport.distanceToJezeroKm.toFixed(0)} km from Jezero Crater). No surface lander or rover has operated at this coordinate; local conditions rely exclusively on ${coveredLayers.length} covering orbital datasets and clearly separated Category C planetary reference baselines.`;

  const atmObs = byDomain('atmosphere');
  const tempObs = byDomain('temperature');
  const radObs = byDomain('radiation');
  const dustObs = byDomain('dust');
  const waterObs = byDomain('water');

  const sections: ReportSection[] = [
    {
      number: padSectionNumber(1),
      title: 'Executive Summary',
      summaryText: executiveSummary,
    },
    {
      number: padSectionNumber(2),
      title: 'Location Overview',
      keyValues: [
        { label: 'Target Label', value: locReport.locationLabel },
        {
          label: 'Matched Study Region',
          value: site ? site.name : 'Outside Documented Mission Footprints',
        },
        {
          label: 'Mission Context',
          value: site
            ? site.missionContext
            : 'No landed NASA surface mission has operated within 65–250 km of this coordinate.',
        },
        {
          label: 'Local Surface Data Availability',
          value: site?.hasLocalWeatherData
            ? 'In-situ meteorological archive available (Category A)'
            : 'Unavailable locally (orbital & planetary reference only)',
        },
      ],
    },
    {
      number: padSectionNumber(3),
      title: 'Geographic Coordinates',
      keyValues: [
        {
          label: 'Areocentric Latitude / Longitude (±180°)',
          value: formatMarsLatLonDetailed(lat, lon),
        },
        {
          label: '0–360° East Longitude',
          value: `${locReport.lon360.toFixed(4)}° E`,
        },
        {
          label: 'Coordinate Reference System',
          value: 'EPSG:104905 (Mars 2000 Equirectangular, R_eq = 3,396.19 km)',
        },
        {
          label: 'Great-Circle Distance to Jezero Reference',
          value: `${locReport.distanceToJezeroKm.toFixed(2)} km (mean Mars R = ${MARS_MEAN_RADIUS_KM} km)`,
        },
      ],
    },
    {
      number: padSectionNumber(4),
      title: 'Regional Context',
      summaryText: site
        ? `${site.subtitle}. ${site.geologicalSetting}`
        : `Coordinate lies ${locReport.distanceToJezeroKm.toFixed(0)} km from Jezero Crater (${JEZERO_CRATER.coordinateLabel}). Regional surface geology cannot be inferred locally without a mapped regional study unit; inspect orbital CTX, THEMIS IR, and MOLA hillshade layers in the 2D Scientific Map.`,
      bulletItems: site ? site.surfaceFeatures : undefined,
    },
    {
      number: padSectionNumber(5),
      title: 'Available Orbital Imagery',
      summaryText: `${coveredLayers.length} of ${locReport.orbitalCoverage.length} integrated NASA Mars Trek / USGS / Caltech orbital datasets cover this exact coordinate.`,
      table: {
        columns: ['Dataset', 'Instrument', 'Resolution', 'Data Kind', 'Status at Point', 'Limitations'],
        rows: locReport.orbitalCoverage.map((layer) => [
          layer.name,
          layer.instrument,
          layer.resolution,
          layer.dataKind,
          layer.covered ? 'Covered' : 'Outside Footprint',
          layer.limitations,
        ]),
      },
    },
    {
      number: padSectionNumber(6),
      title: 'Terrain and Geological Information',
      summaryText: site
        ? `${site.elevationSummary} ${site.geologicalSetting}`
        : 'Calibrated metric elevation (m), local slope gradients, and unit-level geological classifications are unavailable in-browser for this unmapped coordinate. Only the uncalibrated 8-bit MOLA relative relief index and orbital hillshade imagery are available.',
      keyValues: [
        {
          label: '8-bit MOLA Relative Relief Index (Cat C)',
          value:
            options.relativeMolaIndex !== null
              ? `${options.relativeMolaIndex.toFixed(3)} / 1.000 (normalized grayscale)`
              : 'Unavailable',
          note: locReport.relativeMolaIndex.caveat,
        },
        {
          label: 'Published Site Elevation Reference',
          value: site ? site.elevationSummary : 'Unavailable at this coordinate',
          note: site ? site.elevationSource : 'Shaded-relief tiles do not supply raw elevation meters.',
        },
      ],
      bulletItems: site ? site.difficultTerrainNotes : undefined,
    },
    {
      number: padSectionNumber(7),
      title: 'Atmospheric Environment',
      summaryText: site?.hasLocalWeatherData
        ? `Includes Category A in-situ atmospheric observations for ${site.name} alongside Category C planetary composition/pressure baselines and clearly separated comparative mission sites.`
        : 'Direct local atmospheric measurements are unavailable at this coordinate. Category C planetary reference baselines and separated mission-site archives are listed for context only.',
      visualKind: 'atmosphere-chart',
      table: {
        columns: OBSERVATION_TABLE_COLUMNS,
        rows: atmObs.map(observationToRow),
      },
      observations: atmObs,
    },
    {
      number: padSectionNumber(8),
      title: 'Temperature Information',
      summaryText:
        'All temperatures are reported in degrees Celsius (°C). Local site measurements are strictly separated from planetary extremes and other landing sites.',
      visualKind: 'temperature-chart',
      table: {
        columns: OBSERVATION_TABLE_COLUMNS,
        rows: tempObs.map(observationToRow),
      },
      observations: tempObs,
    },
    {
      number: padSectionNumber(9),
      title: 'Radiation Information',
      summaryText: site?.hasLocalRadiationData
        ? `Direct Category A ionizing radiation dosimetry from Curiosity RAD applies to ${site.name} alongside Category C planetary shielding physics.`
        : `Direct surface ionizing radiation (GCR/SEP) dosimetry is UNAVAILABLE at ${site ? site.name : 'this coordinate'}. Curiosity RAD data (~0.67 mSv/day) was acquired strictly at Gale Crater (~4.59° S, 137.44° E) and is included solely as a separated comparative site record.`,
      table: {
        columns: OBSERVATION_TABLE_COLUMNS,
        rows: radObs.map(observationToRow),
      },
      observations: radObs,
    },
    {
      number: padSectionNumber(10),
      title: 'Dust and Atmospheric Phenomena',
      summaryText:
        'Historical mission observations and global dust-storm climatology. ARES PATH has no live weather feed and does not report current dust storms at this location.',
      table: {
        columns: OBSERVATION_TABLE_COLUMNS,
        rows: dustObs.map(observationToRow),
      },
      observations: dustObs,
    },
    {
      number: padSectionNumber(11),
      title: 'Water and Resource Evidence',
      summaryText: site
        ? `${site.waterEvidenceSummary} ${site.waterConfirmationNote}`
        : 'No in-situ water or ice confirmation exists at this coordinate. Orbital interpretations (Category D) and unconfirmed hypotheses (Category E) are strictly separated from confirmed measurements.',
      table: {
        columns: OBSERVATION_TABLE_COLUMNS,
        rows: waterObs.map(observationToRow),
      },
      observations: waterObs,
    },
    {
      number: padSectionNumber(12),
      title: 'Exploration Considerations',
      summaryText:
        'Documented planetary engineering and operational challenges derived from NASA archives. No hazard scores or safety certifications are generated.',
      table: {
        columns: ['Consideration', 'Category', 'Class', 'Why It Matters', 'Evidence & Limitations'],
        rows: EXPLORATION_CONSIDERATIONS.map((c) => [
          c.title,
          c.category,
          `Cat ${c.classification}`,
          c.whyItMatters,
          `${c.scientificEvidence} Limitation: ${c.limitations}`,
        ]),
      },
    },
    {
      number: padSectionNumber(13),
      title: 'Scientific Data Availability',
      table: {
        columns: ['Data Domain', 'Status at Selected Coordinate', 'Classification Scope'],
        rows: [
          [
            'Surface Meteorology (Pressure, Air/Ground Temp, Wind)',
            site?.hasLocalWeatherData
              ? `Available (${site.name} archive)`
              : 'Unavailable locally',
            site?.hasLocalWeatherData ? 'Cat A (Local) + Cat C (Ref)' : 'Cat C (Planetary Ref only)',
          ],
          [
            'Surface Ionizing Radiation Dosimetry (GCR / SEP)',
            site?.hasLocalRadiationData
              ? 'Available (Curiosity RAD at Gale Crater)'
              : 'Unavailable locally (Gale RAD shown for comparison only)',
            site?.hasLocalRadiationData ? 'Cat A (Local)' : 'Cat B (Other-Site) + Cat C (Physics)',
          ],
          [
            'Sub-meter Orbital Imagery (HiRISE 25 cm/px)',
            locReport.orbitalCoverage.find((c) => c.layerId === 'hirise-jezero')?.covered
              ? 'Available (Jezero orthomosaic)'
              : 'Unavailable (outside Jezero footprint)',
            'Cat B (Regional Orbital)',
          ],
          [
            'Thermal Infrared Mosaic (THEMIS 100 m/px)',
            locReport.orbitalCoverage.find((c) => c.layerId === 'themis-ir')?.covered
              ? 'Available (±65° latitude band)'
              : 'Unavailable (poleward of ±65°)',
            'Cat B (Regional Orbital)',
          ],
          [
            'Calibrated Metric DEM & Slope Angles',
            'Unavailable per-pixel in browser',
            '8-bit relative MOLA index + published site summary only',
          ],
        ],
      },
    },
    {
      number: padSectionNumber(14),
      title: 'Data Limitations',
      bulletItems: missingData,
    },
    {
      number: padSectionNumber(15),
      title: 'References and Sources',
      table: {
        columns: ['Class', 'Dataset / Mission', 'Instrument', 'Location', 'Period', 'Source URL'],
        rows: filterRelevantSources(allDomainObs, [
          'src-hirise',
          'src-ctx',
          'src-mola',
          'src-themis',
          'src-factsheet',
        ]).map((s) => [
          `Cat ${s.classification}`,
          s.datasetOrMission,
          s.instrument,
          s.location,
          s.observationPeriod,
          s.sourceUrl,
        ]),
      },
    },
  ];

  return {
    project: 'ARES PATH',
    reportId: createReportId('location', now),
    reportType: 'location',
    reportTypeLabel: REPORT_TYPE_LABELS.location,
    title: options.customTitle?.trim() || getDefaultTitle(options),
    subtitle: `Areocentric Coordinate ${formatMarsLatLonDetailed(lat, lon)} · ${
      site ? site.name : 'Uninstrumented Martian Terrain'
    }`,
    createdAt: now.toISOString(),
    createdAtDisplay: formatCreatedDisplay(now),
    planet: 'Mars',
    coordinateReferenceSystem:
      'EPSG:104905 (Mars 2000 Equirectangular; Spherical Great-Circle R = 3,389.5 km)',
    selectedLocation: {
      lat,
      lon,
      lon360: locReport.lon360,
      label: locReport.locationLabel,
      matchedSiteId: site?.id ?? null,
      matchedSiteName: site?.name ?? null,
      distanceToJezeroKm: locReport.distanceToJezeroKm,
      relativeMolaIndex: options.relativeMolaIndex,
    },
    executiveSummary,
    sections,
    scientificObservations: allDomainObs,
    sources: filterRelevantSources(allDomainObs, [
      'src-hirise',
      'src-ctx',
      'src-mola',
      'src-themis',
      'src-factsheet',
    ]),
    missingData,
    limitationsAndDisclaimers: [
      'ARES PATH provides conceptual mission intelligence only; no location is certified safe for human exploration.',
      'Historical mission datasets (MEDA, REMS, RAD, APSS, Phoenix) are not live telemetry.',
      'Category C planetary references and separated mission sites must never be treated as local measurements.',
    ],
    classificationLegend: buildClassificationLegend(),
  };
}

function buildRouteReport(
  options: GenerateReportOptions,
  now: Date
): MissionReportDocument {
  const waypoints = options.waypoints;
  const routeName = options.routeName.trim() || 'Conceptual Marswalk Traverse';
  const metrics = computeRouteMetrics(waypoints);
  const routeIntel = buildRouteIntelligenceReport(routeName, waypoints);

  const hasWaypoints = waypoints.length > 0;
  const startWp = hasWaypoints ? routeIntel.waypoints[0] : null;
  const destWp =
    waypoints.length >= 2
      ? routeIntel.waypoints[routeIntel.waypoints.length - 1]
      : startWp;

  const selectedRegionText =
    routeIntel.coveredSites.length > 0
      ? routeIntel.coveredSites.join(', ')
      : hasWaypoints
      ? 'Outside documented NASA landing study sites'
      : 'No waypoints defined';

  // Collect observations strictly belonging to sites touched by the route + planetary reference
  const touchedSiteIds = new Set(
    MARTIAN_STUDY_SITES.filter((s) =>
      routeIntel.coveredSites.includes(s.name)
    ).map((s) => s.id)
  );

  const routeObservations = deduplicateObservations(
    SURVIVAL_OBSERVATIONS.filter(
      (obs) =>
        obs.scope === 'planetary-reference' ||
        obs.scope === 'regional-orbital' ||
        (obs.siteId && touchedSiteIds.has(obs.siteId))
    )
  );

  const executiveSummary = hasWaypoints
    ? `Conceptual surface traverse report for "${routeName}" comprising ${waypoints.length} ordered waypoint${
        waypoints.length === 1 ? '' : 's'
      } with an approximate spherical great-circle distance of ${metrics.formattedTotalDistance} (mean Mars radius 3,389.5 km). ${routeIntel.routeScientificSummary}`
    : 'No Marswalk waypoints are currently present in the Marswalk Planner. Create waypoints in the Marswalk Planner to generate a route-specific traverse breakdown.';

  const limitationsList = [
    'CONCEPTUAL TRAVERSE ONLY: This route has NOT undergone validated hazard-aware route assessment and is NOT certified safe, optimal, or astronaut-approved for an actual crewed or robotic mission.',
    'Distances are spherical great-circle estimates (mean Mars radius 3,389.5 km) that ignore topographic elevation gain, micro-slope grade, boulder fields, and regolith sinkage.',
    'No EVA suit consumables, metabolic rate, thermal, or real-time radiation storm shelter modeling is performed.',
    ...routeIntel.missingDataSummary,
  ];

  const sections: ReportSection[] = [
    {
      number: padSectionNumber(1),
      title: 'Mission Overview',
      summaryText: executiveSummary,
      visualKind: hasWaypoints ? 'route-schematic' : undefined,
    },
    {
      number: padSectionNumber(2),
      title: 'Route Name',
      keyValues: [
        { label: 'Conceptual Traverse Name', value: routeName },
        {
          label: 'Route Classification',
          value: 'Conceptual surface traverse (not validated for human safety)',
        },
      ],
    },
    {
      number: padSectionNumber(3),
      title: 'Selected Region',
      keyValues: [
        { label: 'Intersected NASA Study Regions', value: selectedRegionText },
        {
          label: 'Coordinate Projection',
          value: 'EPSG:104905 (Mars 2000 Equirectangular)',
        },
      ],
    },
    {
      number: padSectionNumber(4),
      title: 'Starting Point',
      keyValues: startWp
        ? [
            { label: 'Start Waypoint', value: `#1 · ${startWp.label}` },
            {
              label: 'Coordinates',
              value: formatMarsLatLonDetailed(startWp.lat, startWp.lon),
            },
            {
              label: 'Matched Study Site',
              value: startWp.matchedSiteName ?? 'Uninstrumented terrain',
            },
          ]
        : [{ label: 'Starting Point', value: 'Unavailable (no waypoints planned)' }],
    },
    {
      number: padSectionNumber(5),
      title: 'Destination',
      keyValues:
        destWp && waypoints.length >= 2
          ? [
              {
                label: 'Destination Waypoint',
                value: `#${destWp.order} · ${destWp.label}`,
              },
              {
                label: 'Coordinates',
                value: formatMarsLatLonDetailed(destWp.lat, destWp.lon),
              },
              {
                label: 'Matched Study Site',
                value: destWp.matchedSiteName ?? 'Uninstrumented terrain',
              },
            ]
          : [
              {
                label: 'Destination',
                value:
                  waypoints.length === 1
                    ? 'Unavailable (at least 2 waypoints are required to define a destination leg)'
                    : 'Unavailable (no waypoints planned)',
              },
            ],
    },
    {
      number: padSectionNumber(6),
      title: 'Ordered Waypoint List',
      summaryText: hasWaypoints
        ? `${waypoints.length} ordered waypoints sequenced from Start (#1) to ${
            waypoints.length >= 2 ? `Destination (#${waypoints.length})` : 'single point'
          }.`
        : undefined,
      unavailableReason: hasWaypoints
        ? undefined
        : 'No waypoints defined in Marswalk Planner.',
      table: hasWaypoints
        ? {
            columns: ['Order', 'Role', 'Label', 'Study Site Match', 'HiRISE 25 cm'],
            rows: routeIntel.waypoints.map((wp, idx) => [
              String(wp.order),
              idx === 0
                ? 'Start'
                : idx === routeIntel.waypoints.length - 1
                ? 'Destination'
                : 'Intermediate',
              wp.label,
              wp.matchedSiteName ?? 'Uninstrumented',
              wp.hasHirise25cm ? 'Covered' : 'Unavailable',
            ]),
          }
        : undefined,
    },
    {
      number: padSectionNumber(7),
      title: 'Latitude and Longitude of Each Waypoint',
      unavailableReason: hasWaypoints
        ? undefined
        : 'No waypoints available to tabulate coordinates.',
      table: hasWaypoints
        ? {
            columns: ['Order', 'Waypoint', 'Areocentric Lat (°)', 'Areocentric Lon (±180°)', '0–360° East Lon'],
            rows: routeIntel.waypoints.map((wp) => {
              const lon360 = ((wp.lon % 360) + 360) % 360;
              return [
                String(wp.order),
                wp.label,
                `${Math.abs(wp.lat).toFixed(4)}° ${wp.lat >= 0 ? 'N' : 'S'}`,
                `${Math.abs(wp.lon).toFixed(4)}° ${wp.lon >= 0 ? 'E' : 'W'}`,
                `${lon360.toFixed(4)}° E`,
              ];
            }),
          }
        : undefined,
    },
    {
      number: padSectionNumber(8),
      title: 'Distance Between Consecutive Waypoints',
      unavailableReason:
        metrics.legs.length === 0
          ? 'At least two waypoints are required to compute consecutive leg distances.'
          : undefined,
      table:
        metrics.legs.length > 0
          ? {
              columns: ['Leg', 'From', 'To', 'Approx. Surface Distance', 'Cumulative Distance'],
              rows: (() => {
                let cum = 0;
                return metrics.legs.map((leg) => {
                  cum += leg.distanceKm;
                  return [
                    `Leg ${leg.index}`,
                    leg.fromWaypoint.label?.trim() || `Waypoint ${leg.index}`,
                    leg.toWaypoint.label?.trim() || `Waypoint ${leg.index + 1}`,
                    leg.formattedDistance,
                    cum < 1 ? `${Math.round(cum * 1000)} m` : `${cum.toFixed(2)} km`,
                  ];
                });
              })(),
            }
          : undefined,
    },
    {
      number: padSectionNumber(9),
      title: 'Total Approximate Route Distance',
      keyValues: [
        {
          label: 'Total Great-Circle Distance',
          value: metrics.formattedTotalDistance,
          note: `Computed across ${metrics.legs.length} leg(s) using mean Mars radius R = ${MARS_MEAN_RADIUS_KM} km.`,
        },
        {
          label: 'Exact Numerical Value',
          value: `${metrics.totalDistanceKm.toFixed(4)} km`,
        },
      ],
    },
    {
      number: padSectionNumber(10),
      title: 'Available Map Imagery and Terrain Datasets',
      table: {
        columns: ['Dataset', 'Instrument', 'Resolution', 'Coverage Scope', 'Limitations'],
        rows: [
          [
            MARS_OVERLAY_LAYERS['hirise-jezero'].label,
            MARS_OVERLAY_LAYERS['hirise-jezero'].instrument,
            '25 cm/px',
            MARS_OVERLAY_LAYERS['hirise-jezero'].coverageLabel,
            MARS_OVERLAY_LAYERS['hirise-jezero'].caveat,
          ],
          [
            MARS_BASE_LAYERS['ctx-jezero'].label,
            MARS_BASE_LAYERS['ctx-jezero'].instrument,
            '6 m/px (Jezero) · ~5 m/px (Global)',
            MARS_BASE_LAYERS['ctx-jezero'].coverageLabel,
            MARS_BASE_LAYERS['ctx-jezero'].caveat,
          ],
          [
            MARS_BASE_LAYERS['mola-clrshade'].label,
            MARS_BASE_LAYERS['mola-clrshade'].instrument,
            '463 m/px',
            MARS_BASE_LAYERS['mola-clrshade'].coverageLabel,
            MARS_BASE_LAYERS['mola-clrshade'].caveat,
          ],
          [
            'THEMIS Controlled Day & Night IR Mosaics',
            MARS_BASE_LAYERS['themis-day-ir'].instrument,
            '100 m/px',
            MARS_BASE_LAYERS['themis-day-ir'].coverageLabel,
            MARS_BASE_LAYERS['themis-day-ir'].caveat,
          ],
          [
            MARS_BASE_LAYERS['viking-color'].label,
            MARS_BASE_LAYERS['viking-color'].instrument,
            '232 m/px',
            MARS_BASE_LAYERS['viking-color'].coverageLabel,
            MARS_BASE_LAYERS['viking-color'].caveat,
          ],
        ],
      },
    },
    {
      number: padSectionNumber(11),
      title: 'Scientific Information Along the Route',
      summaryText:
        touchedSiteIds.size > 0
          ? `Observations below correspond strictly to intersected study site(s) (${selectedRegionText}) and Category C planetary baselines.`
          : 'No waypoints intersect an instrumented NASA landing site; only Category C planetary reference baselines apply along this route.',
      table: {
        columns: OBSERVATION_TABLE_COLUMNS,
        rows: routeObservations.map(observationToRow),
      },
      observations: routeObservations,
    },
    {
      number: padSectionNumber(12),
      title: 'Segment-by-Segment Data Coverage',
      unavailableReason:
        routeIntel.segments.length === 0
          ? 'At least two waypoints are required for segment coverage analysis.'
          : undefined,
      table:
        routeIntel.segments.length > 0
          ? {
              columns: [
                'Segment',
                'Approx. Distance',
                'HiRISE 25 cm',
                'CTX Coverage',
                'THEMIS ±65°',
                'Local Station',
                'Missing Data',
              ],
              rows: routeIntel.segments.map((seg) => [
                `Leg ${seg.legIndex}: ${seg.fromLabel} -> ${seg.toLabel}`,
                seg.distanceFormatted,
                seg.hiriseCoverage,
                seg.ctx6mCoverage,
                seg.themisCoverage,
                seg.localSurfaceData,
                seg.missingDataSummary,
              ]),
            }
          : undefined,
    },
    {
      number: padSectionNumber(13),
      title: 'Missing Scientific Data',
      bulletItems: routeIntel.missingDataSummary,
    },
    {
      number: padSectionNumber(14),
      title: 'Environmental Considerations',
      table: {
        columns: ['Consideration', 'Class', 'Challenge Summary', 'Limitations'],
        rows: EXPLORATION_CONSIDERATIONS.map((c) => [
          c.title,
          `Cat ${c.classification}`,
          c.challenge,
          c.limitations,
        ]),
      },
    },
    {
      number: padSectionNumber(15),
      title: 'Mission Planning Limitations',
      bulletItems: limitationsList,
    },
    {
      number: padSectionNumber(16),
      title: 'Scientific References',
      table: {
        columns: ['Class', 'Dataset / Mission', 'Instrument', 'Location', 'Period', 'Source URL'],
        rows: filterRelevantSources(routeObservations, [
          'src-hirise',
          'src-ctx',
          'src-mola',
          'src-themis',
          'src-factsheet',
        ]).map((s) => [
          `Cat ${s.classification}`,
          s.datasetOrMission,
          s.instrument,
          s.location,
          s.observationPeriod,
          s.sourceUrl,
        ]),
      },
    },
  ];

  return {
    project: 'ARES PATH',
    reportId: createReportId('route', now),
    reportType: 'route',
    reportTypeLabel: REPORT_TYPE_LABELS.route,
    title: options.customTitle?.trim() || getDefaultTitle(options),
    subtitle: `${routeName} · ${waypoints.length} Waypoints · ${metrics.formattedTotalDistance} (Conceptual Traverse)`,
    createdAt: now.toISOString(),
    createdAtDisplay: formatCreatedDisplay(now),
    planet: 'Mars',
    coordinateReferenceSystem:
      'EPSG:104905 (Mars 2000 Equirectangular; Mean R = 3,389.5 km)',
    routeSnapshot: {
      routeName,
      waypointCount: waypoints.length,
      totalDistanceKm: metrics.totalDistanceKm,
      totalDistanceFormatted: metrics.formattedTotalDistance,
      startLabel: startWp?.label ?? 'None',
      destinationLabel: destWp?.label ?? 'None',
      waypoints: waypoints.map((w, idx) => ({
        ...w,
        label: w.label?.trim() || `Waypoint ${idx + 1}`,
      })),
      legs: metrics.legs,
      coveredSites: routeIntel.coveredSites,
      missingDataSummary: routeIntel.missingDataSummary,
    },
    executiveSummary,
    sections,
    scientificObservations: routeObservations,
    sources: filterRelevantSources(routeObservations, [
      'src-hirise',
      'src-ctx',
      'src-mola',
      'src-themis',
      'src-factsheet',
    ]),
    missingData: routeIntel.missingDataSummary,
    limitationsAndDisclaimers: limitationsList,
    classificationLegend: buildClassificationLegend(),
  };
}

function buildRegionReport(
  options: GenerateReportOptions,
  now: Date
): MissionReportDocument {
  const site: MartianStudySite =
    MARTIAN_STUDY_SITES.find((s) => s.id === options.regionId) ??
    MARTIAN_STUDY_SITES[0];

  const orbital = evaluateOrbitalCoverage(site.lat, site.lon);
  const localObs = SURVIVAL_OBSERVATIONS.filter(
    (o) => o.siteId === site.id && o.scope === 'local-site'
  );
  const planetaryObs = SURVIVAL_OBSERVATIONS.filter(
    (o) => o.scope === 'planetary-reference'
  );
  const regionalObs = SURVIVAL_OBSERVATIONS.filter(
    (o) =>
      o.scope === 'regional-orbital' &&
      (o.id !== 'temp-themis-ir' ||
        orbital.find((l) => l.layerId === 'themis-ir')?.covered)
  );
  const combinedObs = deduplicateObservations([
    ...localObs,
    ...regionalObs,
    ...planetaryObs,
  ]);

  const missingData: string[] = [];
  if (!site.hasLocalWeatherData) {
    missingData.push(
      `No surface weather station or atmospheric lander measurements exist inside ${site.name}.`
    );
  }
  if (!site.hasLocalRadiationData) {
    missingData.push(
      `No surface ionizing radiation (GCR/SEP) dosimeter has operated in ${site.name}.`
    );
  }
  if (site.localDataGapNote) {
    missingData.push(site.localDataGapNote);
  }
  missingData.push(
    'Sub-meter 25 cm/px HiRISE mosaic coverage in ARES PATH is restricted exclusively to Jezero Crater.'
  );

  const executiveSummary = `Regional scientific exploration assessment for ${site.name} (${formatMarsLatLonDetailed(site.lat, site.lon)}). ${site.missionContext} ${
    localObs.length > 0
      ? `${localObs.length} Category A local observation datasets are documented for this region.`
      : 'No direct Category A surface mission observations exist for this region; environmental context is strictly restricted to orbital remote sensing and Category C planetary reference values.'
  }`;

  const sections: ReportSection[] = [
    {
      number: padSectionNumber(1),
      title: 'Geographic Overview',
      summaryText: executiveSummary,
      keyValues: [
        { label: 'Region Name', value: site.name },
        { label: 'Region Subtitle', value: site.subtitle },
        {
          label: 'Reference Coordinates',
          value: formatMarsLatLonDetailed(site.lat, site.lon),
        },
        {
          label: 'Published Elevation Context',
          value: site.elevationSummary,
          note: site.elevationSource,
        },
      ],
    },
    {
      number: padSectionNumber(2),
      title: 'Relevant NASA Missions',
      summaryText: site.missionContext,
      keyValues: [
        {
          label: 'Local Meteorological Telemetry Archive',
          value: site.hasLocalWeatherData ? 'Available (Category A)' : 'Unavailable (No surface station)',
        },
        {
          label: 'Local Ionizing Radiation Dosimetry (RAD)',
          value: site.hasLocalRadiationData ? 'Available (Curiosity RAD)' : 'Unavailable at this region',
        },
      ],
    },
    {
      number: padSectionNumber(3),
      title: 'Available Orbital Datasets',
      table: {
        columns: ['Dataset', 'Instrument', 'Resolution', 'Coverage at Region Ref', 'Limitations'],
        rows: orbital.map((l) => [
          l.name,
          l.instrument,
          l.resolution,
          l.covered ? 'Covered' : 'Outside Footprint',
          l.limitations,
        ]),
      },
    },
    {
      number: padSectionNumber(4),
      title: 'Surface Exploration History',
      summaryText: site.missionContext,
      bulletItems: [
        `Water & mineralogical record: ${site.waterEvidenceSummary}`,
        `Resource confirmation status: ${site.waterConfirmationNote}`,
      ],
    },
    {
      number: padSectionNumber(5),
      title: 'Geological Context',
      summaryText: site.geologicalSetting,
      bulletItems: [...site.surfaceFeatures, ...site.difficultTerrainNotes],
    },
    {
      number: padSectionNumber(6),
      title: 'Environmental Information',
      summaryText:
        localObs.length > 0
          ? `Direct Category A local environmental measurements for ${site.name} are tabulated alongside Category C global reference baselines (labeled separately).`
          : `No in-situ environmental measurements have been collected at ${site.name}. Only orbital remote sensing and Category C global reference figures are presented.`,
      visualKind: site.id === 'jezero-crater' || site.id === 'gale-crater' || site.id === 'vastitas-phoenix' ? 'temperature-chart' : undefined,
      table: {
        columns: OBSERVATION_TABLE_COLUMNS,
        rows: combinedObs.map(observationToRow),
      },
      observations: combinedObs,
    },
    {
      number: padSectionNumber(7),
      title: 'Relevant Scientific Observations',
      summaryText:
        localObs.length > 0
          ? `${localObs.length} in-situ site observation record(s) confirmed for ${site.name}.`
          : undefined,
      unavailableReason:
        localObs.length === 0
          ? `No direct Category A surface observations exist for ${site.name}; orbital observations only.`
          : undefined,
      table:
        localObs.length > 0
          ? {
              columns: OBSERVATION_TABLE_COLUMNS,
              rows: localObs.map(observationToRow),
            }
          : undefined,
    },
    {
      number: padSectionNumber(8),
      title: 'Known Uncertainties',
      bulletItems: [
        site.waterConfirmationNote,
        ...site.difficultTerrainNotes,
        'Interannual dust storm variability and local wind gust statistics cannot be forecast live.',
      ],
    },
    {
      number: padSectionNumber(9),
      title: 'Data Coverage and Limitations',
      bulletItems: missingData,
    },
    {
      number: padSectionNumber(10),
      title: 'Scientific References',
      table: {
        columns: ['Class', 'Dataset / Mission', 'Instrument', 'Location', 'Period', 'Source URL'],
        rows: filterRelevantSources(combinedObs, [
          'src-ctx',
          'src-mola',
          'src-themis',
          'src-factsheet',
        ]).map((s) => [
          `Cat ${s.classification}`,
          s.datasetOrMission,
          s.instrument,
          s.location,
          s.observationPeriod,
          s.sourceUrl,
        ]),
      },
    },
  ];

  return {
    project: 'ARES PATH',
    reportId: createReportId('region', now),
    reportType: 'region',
    reportTypeLabel: REPORT_TYPE_LABELS.region,
    title: options.customTitle?.trim() || getDefaultTitle(options),
    subtitle: `${site.name} · ${site.subtitle}`,
    createdAt: now.toISOString(),
    createdAtDisplay: formatCreatedDisplay(now),
    planet: 'Mars',
    coordinateReferenceSystem: 'EPSG:104905 (Mars 2000 Equirectangular)',
    selectedRegionId: site.id,
    selectedRegionName: site.name,
    selectedLocation: {
      lat: site.lat,
      lon: site.lon,
      lon360: ((site.lon % 360) + 360) % 360,
      label: site.name,
      matchedSiteId: site.id,
      matchedSiteName: site.name,
      distanceToJezeroKm:
        site.id === 'jezero-crater'
          ? 0
          : marsMeanRadiusDistanceKm(
              site.lat,
              site.lon,
              JEZERO_MAP_CENTER.lat,
              JEZERO_MAP_CENTER.lon
            ),
      relativeMolaIndex: null,
    },
    executiveSummary,
    sections,
    scientificObservations: combinedObs,
    sources: filterRelevantSources(combinedObs, [
      'src-ctx',
      'src-mola',
      'src-themis',
      'src-factsheet',
    ]),
    missingData,
    limitationsAndDisclaimers: [
      `Observations in this report are scoped specifically to ${site.name}; data from other craters is excluded from local tables.`,
      'No region is certified safe or mission-ready for human landing.',
    ],
    classificationLegend: buildClassificationLegend(),
  };
}

function buildBriefingReport(
  options: GenerateReportOptions,
  now: Date
): MissionReportDocument {
  const allObs = deduplicateObservations(SURVIVAL_OBSERVATIONS);
  const atmObs = allObs.filter((o) => o.domain === 'atmosphere');
  const tempObs = allObs.filter((o) => o.domain === 'temperature');
  const radObs = allObs.filter((o) => o.domain === 'radiation');
  const dustObs = allObs.filter((o) => o.domain === 'dust');
  const waterObs = allObs.filter((o) => o.domain === 'water');

  const executiveSummary =
    'General planetary Mars exploration briefing synthesizing Category C global reference baselines alongside clearly labeled Category A mission-site observations (Jezero Crater MEDA, Gale Crater REMS/RAD, Elysium Planitia InSight, Vastitas Borealis Phoenix), Category B orbital mosaics, Category D interpretations, and Category E hypotheses.';

  const sections: ReportSection[] = [
    {
      number: padSectionNumber(1),
      title: 'Briefing Scope & Evidence Classification',
      summaryText:
        'Planetary reference baselines (Category C) describe global averages and extremes and must not be mistaken for current local weather or uniform surface conditions across Mars. Site-specific measurements (Category A) retain their exact mission location and dates.',
      table: {
        columns: ['Class Code', 'Classification Name', 'Scientific Meaning'],
        rows: buildClassificationLegend().map((c) => [
          `Cat ${c.code}`,
          c.label,
          c.description,
        ]),
      },
    },
    {
      number: padSectionNumber(2),
      title: 'Atmospheric Environment',
      summaryText:
        'Thin CO₂-dominated atmosphere (~95.32% CO₂, ~610 Pa mean datum pressure, ~11.1 km scale height) below the human Armstrong limit.',
      visualKind: 'atmosphere-chart',
      table: {
        columns: OBSERVATION_TABLE_COLUMNS,
        rows: atmObs.map(observationToRow),
      },
    },
    {
      number: padSectionNumber(3),
      title: 'Temperature Conditions',
      summaryText:
        'Planetary mean temperature near -63 °C with global surface extremes from -143 °C (polar winter) to +35 °C (equatorial sunlit regolith), plus site-specific diurnal swings.',
      visualKind: 'temperature-chart',
      table: {
        columns: OBSERVATION_TABLE_COLUMNS,
        rows: tempObs.map(observationToRow),
      },
    },
    {
      number: padSectionNumber(4),
      title: 'Radiation Environment',
      summaryText:
        'Mars lacks a global dipole magnetic field and possesses only ~16–20 g/cm² of atmospheric column shielding. Curiosity RAD measured ~0.67 mSv/day specifically inside Gale Crater (-4.5 km); other sites lack in-situ ionizing dosimeters.',
      table: {
        columns: OBSERVATION_TABLE_COLUMNS,
        rows: radObs.map(observationToRow),
      },
    },
    {
      number: padSectionNumber(5),
      title: 'Surface Geology',
      summaryText:
        'Strong north–south crustal dichotomy: heavily cratered southern highlands and ancient Noachian paleolake basins (Jezero, Gale) contrast with low-lying northern plains (Vastitas Borealis) and massive Tharsis volcanic shields (Olympus Mons +21.2 km) and rift canyons (Valles Marineris -7 to -10 km relief).',
      table: {
        columns: ['Region', 'Published Elevation Context', 'Geological Summary'],
        rows: MARTIAN_STUDY_SITES.map((s) => [
          s.name,
          s.elevationSummary,
          s.geologicalSetting,
        ]),
      },
    },
    {
      number: padSectionNumber(6),
      title: 'Dust Phenomena',
      summaryText:
        'Dust devils, local/regional storms, and multi-month global dust storms (τ > 5–10) attenuate solar power and coat hardware in fine 1–3 µm electrostatic dust.',
      table: {
        columns: OBSERVATION_TABLE_COLUMNS,
        rows: dustObs.map(observationToRow),
      },
    },
    {
      number: padSectionNumber(7),
      title: 'Water and Ice Evidence',
      summaryText:
        'Strong latitudinal contrast: low latitudes preserve ancient paleolake deposits and hydrated minerals (no confirmed drinking water), mid-latitudes host interpreted buried ice sheets (SHARAD), and high latitudes (>60°) preserve confirmed shallow water ice (Phoenix, with toxic perchlorates).',
      table: {
        columns: OBSERVATION_TABLE_COLUMNS,
        rows: waterObs.map(observationToRow),
      },
    },
    {
      number: padSectionNumber(8),
      title: 'Communication Challenges',
      summaryText:
        'Earth–Mars orbital geometry imposes 3 to 22 minutes one-way light-time latency (6–44 minutes round-trip) and ~2-week solar conjunction communication blackouts every ~26 months, requiring high crew and system autonomy.',
    },
    {
      number: padSectionNumber(9),
      title: 'Energy, Equipment & Human Exploration Challenges',
      table: {
        columns: ['Consideration', 'Category', 'Class', 'Challenge', 'Why It Matters'],
        rows: EXPLORATION_CONSIDERATIONS.map((c) => [
          c.title,
          c.category,
          `Cat ${c.classification}`,
          c.challenge,
          c.whyItMatters,
        ]),
      },
    },
    {
      number: padSectionNumber(10),
      title: 'Scientific References',
      table: {
        columns: ['Class', 'Dataset / Mission', 'Instrument', 'Location', 'Period', 'Source URL'],
        rows: SCIENTIFIC_SOURCES_REGISTRY.map((s) => [
          `Cat ${s.classification}`,
          s.datasetOrMission,
          s.instrument,
          s.location,
          s.observationPeriod,
          s.sourceUrl,
        ]),
      },
    },
  ];

  return {
    project: 'ARES PATH',
    reportId: createReportId('briefing', now),
    reportType: 'briefing',
    reportTypeLabel: REPORT_TYPE_LABELS.briefing,
    title: options.customTitle?.trim() || getDefaultTitle(options),
    subtitle: 'Planetary Environmental Baselines, Mission Observations & Human Exploration Constraints',
    createdAt: now.toISOString(),
    createdAtDisplay: formatCreatedDisplay(now),
    planet: 'Mars',
    coordinateReferenceSystem: 'EPSG:104905 (Planetary Reference)',
    executiveSummary,
    sections,
    scientificObservations: allObs,
    sources: SCIENTIFIC_SOURCES_REGISTRY,
    missingData: [
      'No real-time planetary weather, active dust storm tracking, or live solar particle event telemetry is connected.',
      'Direct surface radiation dosimetry exists at Gale Crater only; no human crew survival threshold certification is claimed.',
    ],
    limitationsAndDisclaimers: [
      'Planetary reference baselines (Category C) represent global averages/extremes and must not be treated as local site conditions.',
      'ARES PATH is an educational and mission-concept intelligence system; no route or landing site is certified safe.',
    ],
    classificationLegend: buildClassificationLegend(),
  };
}

export function generateMissionReport(
  options: GenerateReportOptions
): MissionReportDocument {
  const now = new Date();
  switch (options.reportType) {
    case 'location':
      return buildLocationReport(options, now);
    case 'route':
      return buildRouteReport(options, now);
    case 'region':
      return buildRegionReport(options, now);
    case 'briefing':
      return buildBriefingReport(options, now);
  }
}

export function buildMissionReportJsonPayload(doc: MissionReportDocument) {
  return {
    project: doc.project,
    reportId: doc.reportId,
    reportTitle: doc.title,
    reportType: doc.reportType,
    reportTypeLabel: doc.reportTypeLabel,
    createdAt: doc.createdAt,
    planet: doc.planet,
    coordinateReferenceSystem: doc.coordinateReferenceSystem,
    selectedCoordinatesOrRoute: doc.routeSnapshot
      ? {
          kind: 'marswalk-route',
          routeName: doc.routeSnapshot.routeName,
          start: doc.routeSnapshot.startLabel,
          destination: doc.routeSnapshot.destinationLabel,
        }
      : doc.selectedLocation
      ? {
          kind: 'martian-location',
          ...doc.selectedLocation,
        }
      : {
          kind: 'planetary-briefing',
          regionId: doc.selectedRegionId ?? null,
          regionName: doc.selectedRegionName ?? null,
        },
    waypoints: doc.routeSnapshot?.waypoints ?? null,
    distances: doc.routeSnapshot
      ? {
          totalApproximateDistanceKm: Number(
            doc.routeSnapshot.totalDistanceKm.toFixed(6)
          ),
          totalApproximateDistanceFormatted:
            doc.routeSnapshot.totalDistanceFormatted,
          legs: doc.routeSnapshot.legs.map((l) => ({
            leg: l.index,
            fromOrder: l.index,
            toOrder: l.index + 1,
            approximateDistanceKm: Number(l.distanceKm.toFixed(6)),
            approximateDistanceFormatted: l.formattedDistance,
          })),
        }
      : null,
    executiveSummary: doc.executiveSummary,
    sections: doc.sections.map((s) => ({
      number: s.number,
      title: s.title,
      summaryText: s.summaryText ?? null,
      keyValues: s.keyValues ?? null,
      table: s.table ?? null,
      bulletItems: s.bulletItems ?? null,
      unavailableReason: s.unavailableReason ?? null,
    })),
    scientificObservations: doc.scientificObservations.map((obs) => ({
      id: obs.id,
      domain: obs.domain,
      title: obs.title,
      primaryValue: obs.primaryValue,
      unit: obs.unit,
      evidenceClassification: obs.classification,
      classificationLabel: CLASSIFICATION_SYSTEM[obs.classification].label,
      scope: obs.scope,
      datasetOrMission: obs.datasetOrMission,
      instrument: obs.instrument,
      observationLocation: obs.observationLocation,
      observationPeriod: obs.observationPeriod,
      measurementUnits: obs.measurementUnits,
      spatialResolution: obs.spatialResolution,
      sourceUrl: obs.sourceUrl,
      limitations: obs.limitations,
    })),
    evidenceClassifications: doc.classificationLegend,
    datasetMetadata: doc.sources.map((src) => ({
      id: src.id,
      datasetOrMission: src.datasetOrMission,
      instrument: src.instrument,
      location: src.location,
      observationPeriod: src.observationPeriod,
      units: src.units,
      spatialResolution: src.spatialResolution,
      classification: src.classification,
      limitations: src.limitations,
    })),
    sourceReferences: doc.sources.map((src) => ({
      label: src.sourceLabel,
      url: src.sourceUrl,
      classification: src.classification,
    })),
    missingData: doc.missingData,
    limitationsAndDisclaimers: doc.limitationsAndDisclaimers,
  };
}
