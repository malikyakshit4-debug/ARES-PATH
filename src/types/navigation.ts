export type ModuleId =
  | 'overview'
  | 'explorer'
  | 'map'
  | 'planner'
  | 'guide'
  | 'reports';

export type MilestoneStage =
  | 'Active — Milestone 1'
  | 'Active — Milestone 2'
  | 'Active — Milestone 3'
  | 'Active — Milestone 4'
  | 'Active — Milestone 5'
  | 'Development State — Milestone 2 Planned'
  | 'Development State — Milestone 3 Planned'
  | 'Development State — Milestone 4 Planned';

export interface SharedMapCoordinates {
  lat: number;
  lon: number;
  label?: string;
}

export interface ModuleDefinition {
  id: ModuleId;
  label: string;
  shortTitle: string;
  description: string;
  status: MilestoneStage;
  isImplemented: boolean;
}

export interface MartianRegion {
  id: string;
  name: string;
  approxLat: number;
  approxLon: number;
  coordinateLabel: string;
  approxDiameter: string;
  geologicalAge: string;
  summary: string;
  scientificSignificance: string[];
  caveat: string;
}

export interface IntegrationItem {
  id: string;
  system: string;
  provider: string;
  targetMilestone: string;
  status:
    | 'Integrated (3D Globe)'
    | 'Integrated (2D Map & 3D Globe)'
    | 'Integrated (2D Scientific Map)'
    | 'Integrated (Survival Guide)'
    | 'Integrated (Mission Reports)'
    | 'Not Connected';
  notes: string;
}

export interface DevelopmentModuleSpec {
  id: Exclude<ModuleId, 'overview' | 'explorer'>;
  title: string;
  subtitle: string;
  targetMilestone: string;
  overview: string;
  plannedCapabilities: {
    title: string;
    detail: string;
  }[];
  intendedDataSources: string[];
  scientificGuardrail: string;
}
