import {
  ClassificationCode,
  ScientificObservation,
  ScientificSourceMeta,
} from './survival';
import { RouteLeg, PlannerWaypoint } from '../utils/marsRouteMath';

export type ReportType = 'location' | 'route' | 'region' | 'briefing';

export interface ReportKeyValueItem {
  label: string;
  value: string;
  note?: string;
}

export interface ReportTableData {
  columns: string[];
  rows: string[][];
}

export interface ReportSection {
  number: string;
  title: string;
  summaryText?: string;
  keyValues?: ReportKeyValueItem[];
  table?: ReportTableData;
  observations?: ScientificObservation[];
  unavailableReason?: string;
  bulletItems?: string[];
  visualKind?: 'atmosphere-chart' | 'temperature-chart' | 'route-schematic';
}

export interface ReportRouteSnapshot {
  routeName: string;
  waypointCount: number;
  totalDistanceKm: number;
  totalDistanceFormatted: string;
  startLabel: string;
  destinationLabel: string;
  waypoints: PlannerWaypoint[];
  legs: RouteLeg[];
  coveredSites: string[];
  missingDataSummary: string[];
}

export interface ReportLocationSnapshot {
  lat: number;
  lon: number;
  lon360: number;
  label: string;
  matchedSiteId: string | null;
  matchedSiteName: string | null;
  distanceToJezeroKm: number;
  relativeMolaIndex: number | null;
}

export interface MissionReportDocument {
  project: 'ARES PATH';
  reportId: string;
  reportType: ReportType;
  reportTypeLabel: string;
  title: string;
  subtitle: string;
  createdAt: string;
  createdAtDisplay: string;
  planet: 'Mars';
  coordinateReferenceSystem: string;
  selectedLocation?: ReportLocationSnapshot;
  selectedRegionId?: string;
  selectedRegionName?: string;
  routeSnapshot?: ReportRouteSnapshot;
  executiveSummary: string;
  sections: ReportSection[];
  scientificObservations: ScientificObservation[];
  sources: ScientificSourceMeta[];
  missingData: string[];
  limitationsAndDisclaimers: string[];
  classificationLegend: Array<{
    code: ClassificationCode;
    label: string;
    description: string;
  }>;
}
