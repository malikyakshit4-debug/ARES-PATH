export type ClassificationCode = 'A' | 'B' | 'C' | 'D' | 'E';

export interface ClassificationMeta {
  code: ClassificationCode;
  label: string;
  shortLabel: string;
  description: string;
}

export type SurvivalDomainId =
  | 'atmosphere'
  | 'temperature'
  | 'radiation'
  | 'terrain'
  | 'dust'
  | 'water'
  | 'considerations'
  | 'sources';

export interface ScientificSourceMeta {
  id: string;
  datasetOrMission: string;
  instrument: string;
  location: string;
  observationPeriod: string;
  units: string;
  spatialResolution: string;
  sourceUrl: string;
  sourceLabel: string;
  limitations: string;
  classification: ClassificationCode;
}

export interface ScientificObservation {
  id: string;
  domain: Exclude<SurvivalDomainId, 'considerations' | 'sources'>;
  title: string;
  primaryValue: string;
  unit: string;
  summary: string;
  classification: ClassificationCode;
  scope: 'local-site' | 'other-site-comparison' | 'regional-orbital' | 'planetary-reference';
  siteId?: string;
  datasetOrMission: string;
  instrument: string;
  observationLocation: string;
  observationPeriod: string;
  measurementUnits: string;
  spatialResolution: string;
  sourceUrl: string;
  sourceLabel: string;
  limitations: string;
  details: string[];
}

export interface MartianStudySite {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  matchRadiusKm: number;
  missionContext: string;
  elevationSummary: string;
  elevationClassification: ClassificationCode;
  elevationSource: string;
  geologicalSetting: string;
  surfaceFeatures: string[];
  difficultTerrainNotes: string[];
  waterEvidenceSummary: string;
  waterConfirmationNote: string;
  hasLocalWeatherData: boolean;
  hasLocalRadiationData: boolean;
  localDataGapNote?: string;
}

export interface ExplorationConsideration {
  id: string;
  title: string;
  category: string;
  challenge: string;
  whyItMatters: string;
  scientificEvidence: string;
  classification: ClassificationCode;
  sourceLabel: string;
  sourceUrl: string;
  limitations: string;
}

export interface OrbitalCoverageStatus {
  layerId: string;
  name: string;
  instrument: string;
  resolution: string;
  dataKind: 'Direct Orbital Observation' | 'Derived Shaded-Relief Visualization';
  covered: boolean;
  coverageNote: string;
  extentDescription: string;
  limitations: string;
  capabilitiesUrl: string;
}

export interface LocationIntelligenceReport {
  lat: number;
  lon: number;
  lon360: number;
  locationLabel: string;
  matchedSite: MartianStudySite | null;
  distanceToMatchedSiteKm: number | null;
  distanceToJezeroKm: number;
  orbitalCoverage: OrbitalCoverageStatus[];
  relativeMolaIndex: {
    value: number | null;
    status: 'loaded' | 'loading' | 'unavailable';
    caveat: string;
  };
  localObservations: ScientificObservation[];
  regionalObservations: ScientificObservation[];
  comparativeSiteObservations: ScientificObservation[];
  planetaryReferenceObservations: ScientificObservation[];
  interpretationsAndHypotheses: ScientificObservation[];
  localAvailabilityNotice: string;
}

export interface RouteWaypointSummary {
  order: number;
  id: string;
  label: string;
  lat: number;
  lon: number;
  matchedSiteName: string | null;
  hasLocalSurfaceWeather: boolean;
  hasLocalRadiationData: boolean;
  hasHirise25cm: boolean;
  hasJezeroCtx6m: boolean;
  hasThemis100m: boolean;
  missingDataNotes: string[];
}

export interface RouteSegmentSummary {
  legIndex: number;
  fromLabel: string;
  toLabel: string;
  distanceFormatted: string;
  hiriseCoverage: 'Full endpoints' | 'Partial endpoint' | 'Unavailable';
  ctx6mCoverage: 'Full endpoints' | 'Partial endpoint' | 'Global CTX fallback (~5 m/px)';
  themisCoverage: 'Covered (±65°)' | 'Outside ±65° band';
  localSurfaceData: string;
  missingDataSummary: string;
}

export interface RouteIntelligenceReport {
  routeName: string;
  waypointCount: number;
  totalDistanceFormatted: string;
  waypoints: RouteWaypointSummary[];
  segments: RouteSegmentSummary[];
  coveredSites: string[];
  missingDataSummary: string[];
  routeScientificSummary: string;
}
