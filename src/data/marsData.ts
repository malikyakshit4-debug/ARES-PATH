import {
  DevelopmentModuleSpec,
  IntegrationItem,
  MartianRegion,
  ModuleDefinition,
} from '../types/navigation';

export const JEZERO_CRATER: MartianRegion = {
  id: 'jezero-crater',
  name: 'Jezero Crater',
  approxLat: 18.4,
  approxLon: 77.4,
  coordinateLabel: '~18.4° N, 77.4° E',
  approxDiameter: '~45 km',
  geologicalAge: 'Noachian (~3.5–3.9 billion years)',
  summary:
    'Located on the western edge of Isidis Planitia just northeast of Syrtis Major, Jezero Crater is an ancient impact basin that once held a liquid water paleolake fed by an inflow river channel.',
  scientificSignificance: [
    'Preserves a prominent fan-delta deposit along its western rim where river sediments entered standing water.',
    'Orbital spectroscopy identifies diverse clay minerals and magnesium-rich carbonates capable of preserving ancient biosignatures.',
    'Serves as the primary surface exploration site for NASA’s Mars 2020 Perseverance mission and sample-caching campaign.',
  ],
  caveat:
    'Coordinates and physical dimensions shown in Milestone 1 are approximate planetary reference values, not live spacecraft telemetry.',
};

export const MODULES: ModuleDefinition[] = [
  {
    id: 'overview',
    label: 'Overview',
    shortTitle: 'Mission Overview',
    description:
      'Project briefing, interactive 3D Mars orientation, Jezero Crater context, and Milestone 1 integration status.',
    status: 'Active — Milestone 1',
    isImplemented: true,
  },
  {
    id: 'explorer',
    label: 'Mars Explorer',
    shortTitle: '3D Mars Explorer',
    description:
      'Full-viewport spherical inspection of Mars with Jezero Crater coordinates and surface orientation controls.',
    status: 'Active — Milestone 1',
    isImplemented: true,
  },
  {
    id: 'map',
    label: 'Scientific Map',
    shortTitle: 'Scientific Map',
    description:
      'Interactive 2D Mars Trek WMTS map centered on Jezero Crater with CTX, HiRISE, MOLA relief, and THEMIS IR layers.',
    status: 'Active — Milestone 2',
    isImplemented: true,
  },
  {
    id: 'planner',
    label: 'Marswalk Planner',
    shortTitle: 'Marswalk Planner',
    description:
      'Interactive conceptual surface traverse planner on the 2D Mars map with numbered waypoints, Mars geodesic distances, and JSON export.',
    status: 'Active — Milestone 3',
    isImplemented: true,
  },
  {
    id: 'guide',
    label: 'Survival Guide',
    shortTitle: 'Survival Guide',
    description:
      'Mars Survival Intelligence System covering atmosphere, temperature, radiation, geology, dust, water evidence, and Marswalk route coverage.',
    status: 'Active — Milestone 4',
    isImplemented: true,
  },
  {
    id: 'reports',
    label: 'Mission Reports',
    shortTitle: 'Mission Reports',
    description:
      'Multi-format scientific mission report generator compiling location intelligence, Marswalk routes, regional dossiers, and planetary briefings into PDF, JSON, and print output.',
    status: 'Active — Milestone 5',
    isImplemented: true,
  },
];

export const NASA_INTEGRATION_STATUS: IntegrationItem[] = [
  {
    id: 'viking-mdim21',
    system: 'Viking MDIM 2.1 Global Color Mosaic (232 m/px)',
    provider: 'NASA Mars Trek WMTS (Mars_Viking_MDIM21_ClrMosaic_global_232m)',
    targetMilestone: 'Milestone 1–2',
    status: 'Integrated (2D Map & 3D Globe)',
    notes: 'Equirectangular EPSG:104905 global color mosaic serving both the 3D globe and 2D Scientific Map.',
  },
  {
    id: 'caltech-ctx',
    system: 'MRO CTX Mosaics (Jezero 6 m Controlled & Global ~5 m)',
    provider: 'NASA / USGS Astrogeology & Caltech Murray Lab (JEZ_ctx_B_soc_008 & CTX_beta01)',
    targetMilestone: 'Milestone 1–2',
    status: 'Integrated (2D Map & 3D Globe)',
    notes: 'Controlled 6 m/px Jezero CTX orthomosaic paired with near-global ~5 m/px CTX context in the 2D Scientific Map and 3D globe.',
  },
  {
    id: 'mgs-mola-dem',
    system: 'MGS MOLA Elevation & Color Hillshade (463 m/px)',
    provider: 'NASA GSFC MOLA / Mars Trek (Mars_MGS_MOLA_ClrShade_merge_global_463m)',
    targetMilestone: 'Milestone 1–2',
    status: 'Integrated (2D Map & 3D Globe)',
    notes: 'MOLA DEM displacement on the 3D globe and derived colorized hillshade overlay in the 2D Scientific Map.',
  },
  {
    id: 'jezero-hirise',
    system: 'Jezero Crater HiRISE 25 cm OrthoMosaic',
    provider: 'NASA / JPL / University of Arizona / USGS (JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd)',
    targetMilestone: 'Milestone 1–2',
    status: 'Integrated (2D Map & 3D Globe)',
    notes: 'Strictly bounded to Jezero Crater (77.22°–77.58° E, 18.31°–18.67° N); progressive zoom up to 25 cm/px.',
  },
  {
    id: 'themis-ir',
    system: 'Mars Odyssey THEMIS Daytime & Nighttime IR Mosaics (100 m/px)',
    provider: 'ASU / USGS / NASA Mars Trek WMTS (THEMIS_DayIR & THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018)',
    targetMilestone: 'Milestone 2',
    status: 'Integrated (2D Scientific Map)',
    notes: 'Controlled thermal IR brightness mosaics (±65° latitude) highlighting slope morphology (Day IR) and relative thermal inertia (Night IR).',
  },
  {
    id: 'env-models',
    system: 'Surface Environmental & Radiation Reference Archives',
    provider: 'NASA PDS Atmospheres (MEDA, REMS, APSS, Phoenix), MSL RAD & NSSDC Mars Fact Sheet',
    targetMilestone: 'Milestone 4',
    status: 'Integrated (Survival Guide)',
    notes: 'Cited historical mission observations and global reference baselines separated by A–E evidence classification in Survival Guide.',
  },
  {
    id: 'mission-reports-engine',
    system: 'Scientific Mission Report Generator & Exporter (PDF / JSON / Print)',
    provider: 'ARES PATH Synthesis Engine (Orbital WMTS Metadata, Marswalk Routes & PDS Archives)',
    targetMilestone: 'Milestone 5',
    status: 'Integrated (Mission Reports)',
    notes: 'Generates structured Location, Marswalk Route, Regional, and Planetary Briefing reports with full A–E provenance and vector PDF export.',
  },
];

export const DEVELOPMENT_SPECS: Record<
  DevelopmentModuleSpec['id'],
  DevelopmentModuleSpec
> = {
  map: {
    id: 'map',
    title: 'Scientific Map',
    subtitle: 'Orbital Layer & Elevation Inspection Module',
    targetMilestone: 'Milestone 2',
    overview:
      'The Scientific Map will provide regional 2D and 2.5D cartographic inspection centered initially on Jezero Crater (~18.4° N, 77.4° E). In Milestone 1, no NASA WMTS endpoints or planetary raster layers are connected yet.',
    plannedCapabilities: [
      {
        title: 'NASA Mars Trek WMTS Basemaps',
        detail:
          'Tiled orbital mosaics including global Viking/THEMIS context and regional MRO CTX imagery around Jezero Crater.',
      },
      {
        title: 'Elevation & Slope Overlays',
        detail:
          'MOLA and HiRISE-derived topographic contours to visualize crater rims, delta scarps, and basin floor gradients.',
      },
      {
        title: 'Coordinate & Scale Graticule',
        detail:
          'Areocentric latitude/longitude readout, kilometer scale bar, and region-of-interest bounding frames.',
      },
    ],
    intendedDataSources: [
      'NASA Mars Trek WMTS Service (Planned)',
      'MRO Context Camera (CTX) & HiRISE PDS Products (Planned)',
      'Mars Orbiter Laser Altimeter (MOLA) Elevation Grid (Planned)',
    ],
    scientificGuardrail:
      'Milestone 1 displays architectural scope only. Orbital imagery and elevation datasets are not yet queried or rendered in this module.',
  },
  planner: {
    id: 'planner',
    title: 'Marswalk Planner',
    subtitle: 'Conceptual Extravehicular Traverse Workspace',
    targetMilestone: 'Milestone 3',
    overview:
      'The Marswalk Planner is designed to help students, researchers, and mission-concept teams sketch conceptual surface traverses across Martian terrain using documented slope and distance constraints.',
    plannedCapabilities: [
      {
        title: 'Waypoint Sequencing',
        detail:
          'Place conceptual geological stops across Jezero Crater delta units and calculate great-circle surface distances.',
      },
      {
        title: 'Terrain Gradient Screening',
        detail:
          'Flag steep crater wall segments or loose aeolian bedforms once elevation data is connected in Milestone 2–3.',
      },
      {
        title: 'Traverse Duration Estimates',
        detail:
          'Model conceptual walking speeds and reserve margins using explicit user-configured assumptions rather than fixed claims.',
      },
    ],
    intendedDataSources: [
      'ARES PATH Scientific Map Elevation Layer (Milestone 2 Dependency)',
      'Published Planetary Geologic Unit Maps of Jezero Crater (Planned)',
    ],
    scientificGuardrail:
      'Safety notice: Conceptual routes planned in ARES PATH are for educational and mission-design exploration only. No route is certified safe for human exploration.',
  },
  guide: {
    id: 'guide',
    title: 'Survival Guide',
    subtitle: 'Martian Surface Hazard & Environmental Reference',
    targetMilestone: 'Milestone 3',
    overview:
      'The Survival Guide will pair Martian surface cartography with grounded planetary physics briefings so explorers understand why environmental constraints shape every traverse decision.',
    plannedCapabilities: [
      {
        title: 'Atmospheric & Pressure Context',
        detail:
          'Reference documentation on Mars’s thin carbon-dioxide atmosphere and why full pressure suits are mandatory.',
      },
      {
        title: 'Radiation & Dust Mitigation',
        detail:
          'Summary of galactic cosmic ray, solar energetic particle, and fine electrostatically charged dust hazards documented by NASA missions.',
      },
      {
        title: 'Thermal & Illumination Cycles',
        detail:
          'Context on the ~24.6-hour Martian sol, seasonal dust storms, and wide diurnal surface temperature swings.',
      },
    ],
    intendedDataSources: [
      'NASA Mars Science Laboratory (RAD) & Perseverance MEDA Published Literature (Planned)',
      'NASA Planetary Fact Sheet & PDS Reference Archives (Planned)',
    ],
    scientificGuardrail:
      'Milestone 1 intentionally omits live weather or radiation feeds. All future survival parameters will cite peer-reviewed NASA mission literature.',
  },
  reports: {
    id: 'reports',
    title: 'Mission Reports',
    subtitle: 'Structured Site Briefings & Attribution Logs',
    targetMilestone: 'Milestone 4',
    overview:
      'Mission Reports will compile selected Martian regions, conceptual Marswalk waypoints, and cited NASA dataset provenance into reproducible mission-concept briefs.',
    plannedCapabilities: [
      {
        title: 'Regional Site Briefings',
        detail:
          'Structured summaries combining approximate coordinates, geological context, and observational constraints.',
      },
      {
        title: 'Conceptual Traverse Summaries',
        detail:
          'Printable and structured export of planned waypoints, estimated surface distances, and explicit safety disclaimers.',
      },
      {
        title: 'Data Provenance & Citations',
        detail:
          'Automatic attribution of every NASA instrument, orbital layer, and coordinate system referenced in a report.',
      },
    ],
    intendedDataSources: [
      'ARES PATH Conceptual Traverse State (Milestone 3 Dependency)',
      'NASA PDS Dataset Metadata & Citation Registry (Planned)',
    ],
    scientificGuardrail:
      'No fabricated mission logs or synthetic telemetry reports are generated in Milestone 1.',
  },
};
