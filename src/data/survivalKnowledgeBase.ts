import {
  ClassificationCode,
  ClassificationMeta,
  ExplorationConsideration,
  MartianStudySite,
  ScientificObservation,
  ScientificSourceMeta,
} from '../types/survival';

export const CLASSIFICATION_SYSTEM: Record<ClassificationCode, ClassificationMeta> = {
  A: {
    code: 'A',
    label: 'Category A — Direct Local Observation',
    shortLabel: 'A · Direct Local',
    description:
      'In-situ instrument measurement acquired directly at the selected landing site or local study footprint.',
  },
  B: {
    code: 'B',
    label: 'Category B — Regional Observation',
    shortLabel: 'B · Regional',
    description:
      'Orbital remote sensing or localized surface observation tied to a specific Martian region or another mission site.',
  },
  C: {
    code: 'C',
    label: 'Category C — Planetary / Global Reference',
    shortLabel: 'C · Planetary Ref',
    description:
      'Planet-wide reference statistics, Mars Fact Sheet baselines, or global orbital climatology.',
  },
  D: {
    code: 'D',
    label: 'Category D — Scientific Interpretation',
    shortLabel: 'D · Interpretation',
    description:
      'Peer-reviewed geological, hydrological, or environmental interpretation inferred from multiple measurements.',
  },
  E: {
    code: 'E',
    label: 'Category E — Hypothesis / Unconfirmed Evidence',
    shortLabel: 'E · Hypothesis',
    description:
      'Plausible scientific hypothesis or unresolved observation lacking direct confirmation at the target site.',
  },
};

export const MARTIAN_STUDY_SITES: MartianStudySite[] = [
  {
    id: 'jezero-crater',
    name: 'Jezero Crater',
    subtitle: 'Mars 2020 Perseverance Study Region · Western Isidis Rim',
    lat: 18.38,
    lon: 77.58,
    matchRadiusKm: 65,
    missionContext:
      'Primary landing and sampling region for NASA Mars 2020 Perseverance (landed Feb 18, 2021) and Ingenuity.',
    elevationSummary:
      'Crater floor lies near -2,500 m to -2,700 m relative to the MOLA datum; western fan-delta scarp rises ~40–60 m above the crater floor, while surrounding crater rims rise >500 m.',
    elevationClassification: 'B',
    elevationSource: 'MGS MOLA + Mars 2020 HiRISE/CTX Stereo DEMs (USGS/JPL)',
    geologicalSetting:
      'Noachian (~3.5–3.9 Ga) ~45 km impact basin breached by Neretva Vallis on the western rim, preserving a lacustrine fan-delta, olivine-carbonate units, and mafic crater-floor rocks.',
    surfaceFeatures: [
      'Western fan-delta complex with layered mudstones, sandstones, and boulder-bearing conglomerate beds.',
      'Crater floor units (Máaz and Séítah formations) containing igneous olivine/pyroxene and secondary carbonate/sulfate alteration.',
      'Aeolian sand ripples, lag gravels, steep delta scarps, and crater-wall slopes exceeding 15°–25° locally.',
    ],
    difficultTerrainNotes: [
      'Steep scarp edges along the western delta front and Neretva Vallis rim margins.',
      'Loose aeolian sand bedforms (megaripples) capable of inducing wheel/boot sinkage.',
      'Dense boulder fields around fresh secondary craters resolved in HiRISE 25 cm/px imagery.',
    ],
    waterEvidenceSummary:
      'Confirmed past liquid water activity (~3.5–3.8 Ga) preserved in river delta stratigraphy, paleolake sediments, and hydrated phyllosilicate/carbonate minerals.',
    waterConfirmationNote:
      'No shallow subsurface water ice or accessible liquid/drinking water has been confirmed at Jezero Crater (18.4° N low-latitude thermal regime).',
    hasLocalWeatherData: true,
    hasLocalRadiationData: false,
    localDataGapNote:
      'Perseverance carries MEDA for meteorology, dust, and UV/IR irradiance, but does not carry a dedicated ionizing radiation (GCR/SEP) dosimeter. Direct surface radiation dosimetry is unavailable for Jezero Crater.',
  },
  {
    id: 'gale-crater',
    name: 'Gale Crater',
    subtitle: 'Mars Science Laboratory Curiosity Site · Aeolis Mons',
    lat: -4.59,
    lon: 137.44,
    matchRadiusKm: 85,
    missionContext:
      'Active surface science site for NASA Curiosity rover (landed Aug 6, 2012), equipped with REMS and RAD.',
    elevationSummary:
      'Crater floor (Aeolis Palus) lies near -4,500 m below MOLA datum; central peak Aeolis Mons (Mount Sharp) rises ~5,500 m above the northern floor.',
    elevationClassification: 'B',
    elevationSource: 'MGS MOLA / Mars Science Laboratory Landing Site Cartography',
    geologicalSetting:
      '~154 km diameter impact basin containing a 5 km thick sequence of ancient fluvio-lacustrine mudstones, cross-bedded sandstones, and sulfate-bearing strata.',
    surfaceFeatures: [
      'Aeolis Palus alluvial fans and ancient lakebed mudstones (Yellowknife Bay, Murray formation).',
      'Bagnold Dunes active dark basaltic dune field along the northwest flank of Mount Sharp.',
      'Steep stratified pediment and sulfate-bearing ridge terrain on upper Mount Sharp.',
    ],
    difficultTerrainNotes: [
      'Sharp wind-eroded ventifacts and cemented bedrock ridges that caused rover wheel wear.',
      'Active dark sand dunes (Bagnold Dunes) presenting slip and mobility hazards.',
      'Steep erosional escarpments (e.g., Vera Rubin Ridge and Greenheugh Pediment).',
    ],
    waterEvidenceSummary:
      'Extensive fluvio-lacustrine sediments, clay minerals, and hydrated sulfates confirm long-lived ancient lakes and groundwater ~3.5 Ga.',
    waterConfirmationNote:
      'No usable liquid or shallow ice drinking water is confirmed at Gale Crater; water exists primarily chemically bound inside hydrated minerals.',
    hasLocalWeatherData: true,
    hasLocalRadiationData: true,
  },
  {
    id: 'elysium-insight',
    name: 'Elysium Planitia (InSight)',
    subtitle: 'InSight Lander Site · Smooth Volcanic Plain',
    lat: 4.5,
    lon: 135.62,
    matchRadiusKm: 65,
    missionContext:
      'Stationary geophysical lander site for NASA InSight (Nov 2018 – Dec 2022), operating APSS pressure/TWINS wind sensors and SEIS seismometer.',
    elevationSummary:
      'Smooth equatorial volcanic plain situated near -2,650 m relative to the MOLA datum with low regional topographic relief.',
    elevationClassification: 'B',
    elevationSource: 'MGS MOLA / InSight Landing Site Characterization (Golombek et al.)',
    geologicalSetting:
      'Early Amazonian–Hesperian volcanic plains covered by impact-gardened sandy regolith (duricrust and fine basaltic sand).',
    surfaceFeatures: [
      'Relatively flat, low-rock-abundance regolith plain ("Homestead hollow" degraded crater depression).',
      'Cohesive surface duricrust layer documented by HP3 mole resistance.',
    ],
    difficultTerrainNotes: [
      'Fine wind-blown dust accumulation degraded InSight solar arrays over ~4 years of operations.',
    ],
    waterEvidenceSummary:
      'No surface water-ice confirmed at this equatorial site; seismic data constrains upper crustal porosity and absence of widespread shallow liquid aquifers.',
    waterConfirmationNote:
      'Equatorial Elysium Planitia lacks confirmed accessible surface or shallow subsurface water ice.',
    hasLocalWeatherData: true,
    hasLocalRadiationData: false,
    localDataGapNote:
      'InSight did not carry an ionizing radiation particle dosimeter.',
  },
  {
    id: 'vastitas-phoenix',
    name: 'Vastitas Borealis (Phoenix)',
    subtitle: 'North Polar Plains · Subsurface Ice Confirmation Site',
    lat: 68.22,
    lon: -125.7,
    matchRadiusKm: 75,
    missionContext:
      'NASA Phoenix Mars Lander site (May–Nov 2008, northern summer), directly trenching into shallow water ice.',
    elevationSummary:
      'Low-lying northern plains situated near -4,100 m relative to the MOLA datum.',
    elevationClassification: 'B',
    elevationSource: 'MGS MOLA / Phoenix Mission Site Characterization',
    geologicalSetting:
      'High-latitude northern lowland plains exhibiting polygonal patterned ground from seasonal thermal contraction over ice-cemented soil.',
    surfaceFeatures: [
      'Polygonal patterned ground typical of permafrost landscapes.',
      'Shallow water-ice table excavated ~3–5 cm beneath dry surface regolith.',
    ],
    difficultTerrainNotes: [
      'Seasonal CO₂ dry-ice frost accumulation during polar autumn/winter (>1 m seasonal frost).',
      'Extreme polar winter darkness preventing solar power generation for months.',
    ],
    waterEvidenceSummary:
      'Confirmed shallow subsurface water ice directly exposed by the Phoenix robotic arm scoop and verified by TEGA thermal/mass spectrometry (2008).',
    waterConfirmationNote:
      'Subsurface water ice is confirmed centimeters below the surface, though perchlorate salts (~0.4–0.6 wt%) were also measured in local soil, requiring purification before human use.',
    hasLocalWeatherData: true,
    hasLocalRadiationData: false,
    localDataGapNote:
      'Phoenix operated during northern summer 2008 only and did not carry a GCR/SEP ionizing radiation dosimeter.',
  },
  {
    id: 'valles-marineris',
    name: 'Valles Marineris (Coprates / Melas)',
    subtitle: 'Equatorial Tectonic Canyon System',
    lat: -13.9,
    lon: -59.2,
    matchRadiusKm: 180,
    missionContext:
      'Orbital remote-sensing region only; no surface lander or rover has operated inside Valles Marineris.',
    elevationSummary:
      'Canyon floors drop 7,000 m to 10,000 m below adjacent Tharsis/plateau rims (approx. -4,500 m to -5,500 m MOLA datum on deep floors vs +3,000 m+ on rims).',
    elevationClassification: 'B',
    elevationSource: 'MGS MOLA Global Altimetry',
    geologicalSetting:
      'Planet-scale tectonic rift canyon system exposing kilometers of layered volcanic crust, massive landslides, and sulfate-rich interior layered deposits.',
    surfaceFeatures: [
      'Kilometer-high canyon scarps, spur-and-gully wall morphology, and massive talus aprons.',
      'Interior layered deposits (ILDs) containing hydrated polyhydrated and monohydrated sulfates.',
    ],
    difficultTerrainNotes: [
      'Extreme topographic relief with cliffs exceeding 25°–40° slopes.',
      'High-velocity katabatic slope winds and trapped canyon dust hazes inferred from orbital models.',
    ],
    waterEvidenceSummary:
      'Orbital CRISM/OMEGA detections of hydrated sulfates and outflow channels indicate past aqueous alteration and episodic flooding.',
    waterConfirmationNote:
      'No in-situ surface measurements exist; accessible drinking water is unconfirmed.',
    hasLocalWeatherData: false,
    hasLocalRadiationData: false,
    localDataGapNote:
      'No surface weather station or radiation detector has ever landed in Valles Marineris. Only orbital imagery and planetary reference data are available.',
  },
  {
    id: 'olympus-mons',
    name: 'Olympus Mons',
    subtitle: 'Tharsis Shield Volcano Summit Region',
    lat: 18.65,
    lon: -133.8,
    matchRadiusKm: 250,
    missionContext:
      'Orbital remote-sensing region only; no surface mission has operated on Olympus Mons.',
    elevationSummary:
      'Summit caldera reaches ~+21,229 m above MOLA datum; basal scarp rises 4–8 km above surrounding plains.',
    elevationClassification: 'B',
    elevationSource: 'MGS MOLA Global Altimetry',
    geologicalSetting:
      'Largest known shield volcano in the Solar System (~600 km wide), composed of stacked Amazonian basaltic lava flows and nested summit calderas.',
    surfaceFeatures: [
      'Nested summit collapse calderas and gentle ~5° shield flanks.',
      'Steep basal escarpment up to 8 km tall with surrounding aureole landslide lobes.',
    ],
    difficultTerrainNotes: [
      'Extreme altitude dramatically lowers atmospheric pressure (~0.3–1.0 mbar at summit vs ~6.1 mbar datum), further reducing aerodynamic braking and atmospheric radiation shielding.',
    ],
    waterEvidenceSummary:
      'Distant flanks show minor glacial-like lobate deposits interpreted as possible ancient cold-based ice-rich debris (D), with no confirmed surface liquid water.',
    waterConfirmationNote:
      'No in-situ surface observations; usable water is unconfirmed.',
    hasLocalWeatherData: false,
    hasLocalRadiationData: false,
    localDataGapNote:
      'No surface meteorological or radiation measurements exist at Olympus Mons. Surface pressure at +21 km altitude is far lower than the planetary datum average.',
  },
];

export const ATMOSPHERIC_COMPOSITION_DATA = [
  { gas: 'Carbon Dioxide (CO₂)', percent: 95.32, color: '#D9532F' },
  { gas: 'Nitrogen (N₂)', percent: 2.7, color: '#E5A952' },
  { gas: 'Argon (Ar)', percent: 1.6, color: '#60A5FA' },
  { gas: 'Oxygen (O₂)', percent: 0.13, color: '#34D399' },
  { gas: 'Carbon Monoxide (CO)', percent: 0.08, color: '#A78BFA' },
  { gas: 'Other Trace (H₂O, NO, Ne, Kr)', percent: 0.17, color: '#6B7280' },
];

export const TEMPERATURE_BENCHMARKS = [
  {
    id: 'jezero-meda',
    label: 'Jezero Crater (MEDA Air 1.45 m)',
    siteId: 'jezero-crater',
    minC: -83,
    maxC: -17,
    typicalDayC: -25,
    typicalNightC: -78,
    classification: 'A' as ClassificationCode,
    note: 'Mars 2020 Perseverance MEDA, Sols 1–400 (2021–2022)',
  },
  {
    id: 'jezero-ground',
    label: 'Jezero Crater (MEDA Ground TIRS)',
    siteId: 'jezero-crater',
    minC: -98,
    maxC: 2,
    typicalDayC: -10,
    typicalNightC: -92,
    classification: 'A' as ClassificationCode,
    note: 'Brightness temperature of dark regolith/bedrock, Sols 1–400',
  },
  {
    id: 'gale-rems',
    label: 'Gale Crater (REMS Air)',
    siteId: 'gale-crater',
    minC: -89,
    maxC: 4,
    typicalDayC: -12,
    typicalNightC: -75,
    classification: 'A' as ClassificationCode,
    note: 'Curiosity REMS, 2012–2023 (separate site at 4.6° S, 137.4° E)',
  },
  {
    id: 'phoenix-polar',
    label: 'Vastitas Borealis (Phoenix TEGA/MET)',
    siteId: 'vastitas-phoenix',
    minC: -96,
    maxC: -17,
    typicalDayC: -30,
    typicalNightC: -80,
    classification: 'A' as ClassificationCode,
    note: 'Northern summer only (May–Nov 2008, 68.2° N); winter drops <-125 °C',
  },
  {
    id: 'global-ref',
    label: 'Global Martian Surface Extremes',
    siteId: 'global',
    minC: -143,
    maxC: 35,
    typicalDayC: -20,
    typicalNightC: -80,
    classification: 'C' as ClassificationCode,
    note: 'NASA Mars Fact Sheet (polar winter CO₂ frost to equatorial noon dark soil)',
  },
];

export const SURVIVAL_OBSERVATIONS: ScientificObservation[] = [
  // ======================== ATMOSPHERE ========================
  {
    id: 'atm-comp-global',
    domain: 'atmosphere',
    title: 'Bulk Atmospheric Composition',
    primaryValue: '95.32%',
    unit: 'CO₂ by volume',
    summary:
      'Mars has a thin, unbreathable carbon-dioxide dominated atmosphere with 2.7% N₂, 1.6% Ar, and only ~0.13% O₂.',
    classification: 'C',
    scope: 'planetary-reference',
    datasetOrMission: 'NASA Mars Fact Sheet / Viking & Curiosity SAM Reference',
    instrument: 'Viking Mass Spectrometer / MSL SAM TLS',
    observationLocation: 'Planetary Global Reference (well-mixed lower atmosphere)',
    observationPeriod: '1976–Present (Reference Standard)',
    measurementUnits: '% volume mixing ratio',
    spatialResolution: 'Global atmospheric column',
    sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
    sourceLabel: 'NASA NSSDC Mars Fact Sheet',
    limitations:
      'Trace water vapor (typically <0.03%) and ozone vary strongly with season and latitude; CO₂ percentage fluctuates slightly at polar caps during winter condensation.',
    details: [
      'Carbon dioxide (CO₂): 95.32% · Nitrogen (N₂): 2.7% · Argon (Ar): 1.6% · Oxygen (O₂): 0.13% · Carbon monoxide (CO): 0.08%.',
      'Requires closed-loop life-support oxygen generation and CO₂ scrubbing for any crewed habitat or EVA suit.',
    ],
  },
  {
    id: 'atm-pressure-jezero',
    domain: 'atmosphere',
    title: 'Jezero Crater Surface Atmospheric Pressure',
    primaryValue: '610 – 780',
    unit: 'Pa (6.1–7.8 mbar)',
    summary:
      'Direct Perseverance MEDA barometric observations show surface pressure ~0.6%–0.77% of Earth sea-level pressure, oscillating ~25% annually as CO₂ condenses onto polar caps.',
    classification: 'A',
    scope: 'local-site',
    siteId: 'jezero-crater',
    datasetOrMission: 'Mars 2020 Perseverance MEDA PDS Bundle',
    instrument: 'MEDA Pressure Sensor (PS)',
    observationLocation: 'Jezero Crater (~18.38° N, 77.58° E)',
    observationPeriod: 'Feb 2021 – 2023 (Sols 1–700+)',
    measurementUnits: 'Pascals (Pa)',
    spatialResolution: 'Point station along Perseverance traverse',
    sourceUrl: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/mars2020.html',
    sourceLabel: 'NASA PDS Atmospheres — Mars 2020 MEDA',
    limitations:
      'Historical published mission range, not live current pressure. Diurnal thermal tides cause ~5%–10% daily pressure swings (~40–80 Pa).',
    details: [
      'Average pressure at Jezero (-2,570 m elevation) sits slightly higher than the global 610 Pa datum.',
      'Well below the ~6.25 kPa Armstrong limit where human body fluids boil at 37 °C; full pressurized suits are mandatory.',
    ],
  },
  {
    id: 'atm-density-jezero',
    domain: 'atmosphere',
    title: 'Surface Atmospheric Density & Wind Conditions (Jezero)',
    primaryValue: '~0.014 – 0.020',
    unit: 'kg/m³ · Wind 2–10 m/s (gusts >18 m/s)',
    summary:
      'Air density at Jezero Crater is roughly 1.2%–1.6% of Earth sea-level air density (~1.225 kg/m³), producing very low dynamic wind force even during 15–20 m/s gusts.',
    classification: 'A',
    scope: 'local-site',
    siteId: 'jezero-crater',
    datasetOrMission: 'Mars 2020 Perseverance MEDA Wind & ATS Observations',
    instrument: 'MEDA Wind Sensor (WS) & Air Temperature Sensor (ATS)',
    observationLocation: 'Jezero Crater (~18.38° N, 77.58° E)',
    observationPeriod: '2021–2022 (Newman et al., Science Advances 2022)',
    measurementUnits: 'kg/m³ (density), m/s (wind speed)',
    spatialResolution: 'Local rover boom height (~1.5 m)',
    sourceUrl: 'https://www.science.org/doi/10.1126/sciadv.abn3783',
    sourceLabel: 'Newman et al., Science Advances (2022)',
    limitations:
      'One MEDA wind sensor arm sustained sand-grain damage during early operations (2022), limiting multi-directional wind retrieval in later sols.',
    details: [
      'Typical daytime convective winds average 2–10 m/s; convective vortices (dust devils) briefly spike above 15–20 m/s.',
      'Because density is ~1.5% of Earth’s, a 20 m/s Martian wind exerts dynamic pressure comparable to a gentle ~2.5 m/s breeze on Earth—yet lifts micron-scale dust.',
    ],
  },
  {
    id: 'atm-pressure-gale',
    domain: 'atmosphere',
    title: 'Gale Crater Atmospheric Pressure & Winds (REMS)',
    primaryValue: '700 – 925',
    unit: 'Pa · Winds typically 1–12 m/s',
    summary:
      'Located deeper (-4,500 m below datum) than Jezero, Gale Crater records slightly higher seasonal surface pressures alongside strong crater-wall slope winds.',
    classification: 'A',
    scope: 'local-site',
    siteId: 'gale-crater',
    datasetOrMission: 'Mars Science Laboratory (MSL) Curiosity REMS PDS',
    instrument: 'Rover Environmental Monitoring Station (REMS)',
    observationLocation: 'Gale Crater (~4.59° S, 137.44° E)',
    observationPeriod: 'Aug 2012 – 2023',
    measurementUnits: 'Pascals (Pa), m/s',
    spatialResolution: 'Point measurements along Curiosity traverse',
    sourceUrl: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/curiosity.html',
    sourceLabel: 'NASA PDS Atmospheres — MSL REMS',
    limitations:
      'Applies strictly to Gale Crater (~3,700 km from Jezero). REMS wind sensor boom #1 was damaged during landing in 2012, reducing wind azimuth coverage.',
    details: [
      'Demonstrates how basin elevation strongly controls local atmospheric pressure on Mars.',
    ],
  },
  {
    id: 'atm-pressure-elysium',
    domain: 'atmosphere',
    title: 'Elysium Planitia Pressure & Aeolian Vortex Record (InSight)',
    primaryValue: '630 – 840',
    unit: 'Pa (2018–2022)',
    summary:
      'Continuous high-frequency pressure measurements from InSight captured seasonal CO₂ cycles, gravity waves, and passing dust-devil pressure drops.',
    classification: 'A',
    scope: 'local-site',
    siteId: 'elysium-insight',
    datasetOrMission: 'InSight APSS / TWINS PDS Archive',
    instrument: 'Auxiliary Payload Sensor Suite (APSS) & TWINS',
    observationLocation: 'Elysium Planitia (~4.50° N, 135.62° E)',
    observationPeriod: 'Nov 2018 – Dec 2022',
    measurementUnits: 'Pascals (Pa)',
    spatialResolution: 'Stationary lander site',
    sourceUrl: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/insight.html',
    sourceLabel: 'NASA PDS Atmospheres — InSight APSS',
    limitations:
      'InSight ended operations in December 2022 due to dust accumulation on solar panels; NASA’s InSight weather API is retired.',
    details: [
      'Historical 4-year archive provides benchmark barometric tides for equatorial volcanic plains.',
    ],
  },
  {
    id: 'atm-global-ref',
    domain: 'atmosphere',
    title: 'Planetary Mean Surface Pressure & Scale Height',
    primaryValue: '~610',
    unit: 'Pa (6.1 mbar) · Scale height ~11.1 km',
    summary:
      'Global reference atmospheric pressure at the 0 m Mars datum is ~610 Pa—under 1% of Earth’s 101,325 Pa—varying drastically with elevation from ~30 Pa on Olympus Mons to ~1,200 Pa in Hellas.',
    classification: 'C',
    scope: 'planetary-reference',
    datasetOrMission: 'NASA Planetary Fact Sheet — Mars',
    instrument: 'Multi-mission Planetary Reference Synthesis',
    observationLocation: 'Global Mars Datum (0 m reference areoid)',
    observationPeriod: 'Reference Standard',
    measurementUnits: 'Pascals (Pa), km',
    spatialResolution: 'Planetary mean',
    sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
    sourceLabel: 'NASA NSSDC Mars Fact Sheet',
    limitations:
      'Global datum mean only; actual local surface pressure depends heavily on MOLA elevation (scale height ~11.1 km) and season (Ls).',
    details: [
      'Surface atmospheric density averages ~0.020 kg/m³ at datum temperatures.',
      'Seasonal condensation of ~25%–30% of atmospheric CO₂ onto winter poles drives global pressure cycles.',
    ],
  },

  // ======================== TEMPERATURE ========================
  {
    id: 'temp-jezero-meda',
    domain: 'temperature',
    title: 'Jezero Crater Diurnal Air & Ground Temperature Swings',
    primaryValue: '-98 °C to +2 °C',
    unit: 'Ground · Air: -83 °C to -17 °C',
    summary:
      'Direct Perseverance MEDA observations show rapid ~60–90 °C daily thermal swings driven by low atmospheric thermal inertia and thin dry air.',
    classification: 'A',
    scope: 'local-site',
    siteId: 'jezero-crater',
    datasetOrMission: 'Mars 2020 MEDA (Rodriguez-Manfredi et al., Nature Geoscience 2023)',
    instrument: 'MEDA Air Temp Sensor (ATS) & Thermal Infrared Sensor (TIRS)',
    observationLocation: 'Jezero Crater (~18.38° N, 77.58° E)',
    observationPeriod: 'Feb 2021 – 2022 (First Martian Year)',
    measurementUnits: 'Degrees Celsius (°C)',
    spatialResolution: 'Local rover mast (0.84 m / 1.45 m) & nearby ground footprint',
    sourceUrl: 'https://www.nature.com/articles/s41561-022-01084-0',
    sourceLabel: 'Rodriguez-Manfredi et al., Nature Geoscience (2023)',
    limitations:
      'Historical first-year mission statistics; ground TIRS values depend on local regolith albedo and rock thermal inertia.',
    details: [
      'Peak afternoon ground brightness temperature reaches ~-5 °C to +2 °C in warm season; pre-dawn surface plunges below -90 °C.',
      'Strong vertical temperature gradient exists in the lowest 1.5 m above the sun-heated ground.',
    ],
  },
  {
    id: 'temp-gale-rems',
    domain: 'temperature',
    title: 'Gale Crater Air & Ground Temperature Record (Curiosity REMS)',
    primaryValue: '-89 °C to +4 °C',
    unit: 'Air · Ground up to +20 °C',
    summary:
      'Curiosity REMS recorded over a decade of diurnal and seasonal cycles at Gale Crater, showing warm afternoon sunlit regolith exceeding 0 °C alongside freezing -80 °C nights.',
    classification: 'A',
    scope: 'local-site',
    siteId: 'gale-crater',
    datasetOrMission: 'MSL Curiosity REMS Archive',
    instrument: 'REMS Air & Ground Temperature Sensors',
    observationLocation: 'Gale Crater (~4.59° S, 137.44° E)',
    observationPeriod: '2012–2023 (Multiple Martian Years)',
    measurementUnits: 'Degrees Celsius (°C)',
    spatialResolution: 'Local rover site in Gale Crater',
    sourceUrl: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/curiosity.html',
    sourceLabel: 'NASA PDS — MSL REMS',
    limitations:
      'Strictly represents Gale Crater in the southern tropics (-4.59° S); must not be used as a Jezero Crater measurement.',
    details: [
      'Air temperatures remain below freezing most of the sol, even when dark basaltic soil momentarily warms above 0 °C at midday.',
    ],
  },
  {
    id: 'temp-phoenix-polar',
    domain: 'temperature',
    title: 'North Polar Plains Summer Thermal Regime (Phoenix)',
    primaryValue: '-96 °C to -17 °C',
    unit: 'Northern summer only',
    summary:
      'At 68.2° N, Phoenix measured summer air temperatures between -96 °C and -17 °C before polar winter darkness dropped temperatures below CO₂ condensation (~-125 °C).',
    classification: 'A',
    scope: 'local-site',
    siteId: 'vastitas-phoenix',
    datasetOrMission: 'NASA Phoenix MET / TEGA PDS Archive',
    instrument: 'Phoenix Meteorological Station (MET)',
    observationLocation: 'Vastitas Borealis (~68.22° N, 125.70° W)',
    observationPeriod: 'May–Nov 2008 (Northern Summer, Sols 0–151)',
    measurementUnits: 'Degrees Celsius (°C)',
    spatialResolution: 'Single polar lander station',
    sourceUrl: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/phoenix.html',
    sourceLabel: 'NASA PDS — Phoenix Meteorology',
    limitations:
      'Operated only during sunlit polar summer; ceased operations as seasonal CO₂ frost covered the lander in winter.',
    details: [
      'High-latitude sites experience extreme seasonal contrast and prolonged polar night.',
    ],
  },
  {
    id: 'temp-global-ref',
    domain: 'temperature',
    title: 'Planetary Mars Temperature Reference Range',
    primaryValue: '-63 °C mean',
    unit: 'Global extremes: -143 °C to +35 °C',
    summary:
      'With an orbital distance ~1.52 AU from the Sun and negligible greenhouse warming (~5 K), Mars’s planetary mean surface temperature is ~-63 °C, spanning polar winter lows near -143 °C to sunlit equatorial soil highs near +35 °C.',
    classification: 'C',
    scope: 'planetary-reference',
    datasetOrMission: 'NASA Mars Fact Sheet & Mars Global Surveyor TES',
    instrument: 'Orbital Thermal Emission Spectrometers (TES / THEMIS)',
    observationLocation: 'Global Mars Reference (All Latitudes)',
    observationPeriod: '1997–Present',
    measurementUnits: 'Degrees Celsius (°C)',
    spatialResolution: 'Planetary range',
    sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
    sourceLabel: 'NASA NSSDC Mars Fact Sheet',
    limitations:
      'Planetary reference only; actual local temperatures depend strongly on latitude, season (Ls), orbital eccentricity (perihelion vs aphelion), dust opacity, and surface thermal inertia.',
    details: [
      'Mars’s orbital eccentricity (0.0934) makes southern summers shorter and warmer than northern summers.',
      'Global dust storms damp daytime highs and slightly warm nighttime air temperatures by trapping thermal IR.',
    ],
  },
  {
    id: 'temp-themis-ir',
    domain: 'temperature',
    title: 'Orbital Thermal Infrared Brightness Context (±65°)',
    primaryValue: '100 m/px',
    unit: 'Relative Day/Night IR contrast',
    summary:
      'Mars Odyssey THEMIS Day and Night IR mosaics highlight rock-vs-dust thermal inertia contrast: rocky crater rims and bedrock outcrops stay warmer overnight than fine dust blankets.',
    classification: 'B',
    scope: 'regional-orbital',
    datasetOrMission: 'THEMIS Controlled Mosaics v2 (Oct 2018) via NASA Mars Trek',
    instrument: 'Mars Odyssey THEMIS Band 9 (12.57 µm)',
    observationLocation: 'Regional Mars (±65° Latitude Band)',
    observationPeriod: '2002–2018 Controlled Mosaic Compilation',
    measurementUnits: 'Relative qualitative IR brightness (DN)',
    spatialResolution: '100 m/px',
    sourceUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml',
    sourceLabel: 'ASU / USGS / NASA Mars Trek WMTS',
    limitations:
      'Mosaic tiles visualize relative thermal inertia contrast, NOT calibrated surface temperatures in °C, and exclude polar latitudes >65°.',
    details: [
      'Inspectable directly in the ARES PATH 2D Scientific Map via the THEMIS Day IR and THEMIS Night IR layers.',
    ],
  },

  // ======================== RADIATION ========================
  {
    id: 'rad-gale-rad',
    domain: 'radiation',
    title: 'Surface Ionizing Radiation Dose Equivalent (Gale Crater — Curiosity RAD)',
    primaryValue: '~0.67',
    unit: 'mSv/day (GCR ~0.64 mSv/day + SEP spikes)',
    summary:
      'Curiosity’s Radiation Assessment Detector (RAD) measured an average Martian surface dose equivalent of ~0.67 mSv/day during 2012–2013—over 100× higher than Earth’s sea-level background (~0.006 mSv/day).',
    classification: 'A',
    scope: 'local-site',
    siteId: 'gale-crater',
    datasetOrMission: 'MSL Curiosity RAD (Hassler et al., Science 2014)',
    instrument: 'Radiation Assessment Detector (RAD)',
    observationLocation: 'Gale Crater (~4.59° S, 137.44° E, -4.5 km elevation)',
    observationPeriod: 'Aug 2012 – Jun 2013 (solar maximum period) & ongoing',
    measurementUnits: 'mSv/day (dose equivalent) · µGy/day (absorbed dose ~210 µGy/day)',
    spatialResolution: 'Local rover deck at Gale Crater floor',
    sourceUrl: 'https://www.science.org/doi/10.1126/science.1244797',
    sourceLabel: 'Hassler et al., Science (2014) · NASA MSL RAD',
    limitations:
      'Applies strictly to Gale Crater (-4.5 km elevation) during solar maximum/moderate conditions. During solar minimum, GCR flux increases (~20%–30% higher). Must NEVER be treated as a direct Jezero Crater measurement.',
    details: [
      'Galactic Cosmic Rays (GCRs) are continuous high-energy protons and heavy ions; Solar Energetic Particle (SEP) events can add acute multi-mSv spikes over hours to days.',
      'A 500-day surface stay at Gale-equivalent shielding yields ~335 mSv (plus ~300–400 mSv during round-trip interplanetary cruise).',
    ],
  },
  {
    id: 'rad-shielding-global',
    domain: 'radiation',
    title: 'Planetary Atmospheric & Magnetic Shielding Deficit',
    primaryValue: '~16 – 20',
    unit: 'g/cm² atmospheric column (vs 1,030 g/cm² Earth)',
    summary:
      'Mars lacks a global dipole magnetosphere and possesses less than 2% of Earth’s atmospheric column mass, providing minimal protection against GCRs, secondary neutrons, and UV-C (200–280 nm).',
    classification: 'C',
    scope: 'planetary-reference',
    datasetOrMission: 'NASA Mars Radiation Physics / MAVEN & Mars Odyssey MARIE',
    instrument: 'Orbital & Reference Physics (MARIE / MAVEN)',
    observationLocation: 'Planetary Global Reference',
    observationPeriod: '2001–Present',
    measurementUnits: 'g/cm² (column mass), nm (UV band)',
    spatialResolution: 'Planetary vertical column (elevation-dependent)',
    sourceUrl: 'https://science.nasa.gov/mission/mars-2020-perseverance/',
    sourceLabel: 'NASA Mars Science & Radiation Reference',
    limitations:
      'Column shielding varies inversely with elevation: deep basins (Hellas, Gale) receive noticeably more atmospheric shielding than high volcanoes (Olympus Mons).',
    details: [
      'Secondary neutrons generated when GCRs strike Martian regolith contribute ~15%–20% of the surface biological dose equivalent.',
      'Lack of a stratospheric ozone layer allows biologically damaging UV-B and UV-C solar radiation directly to the surface (modulated by dust optical depth).',
    ],
  },
  {
    id: 'rad-uv-jezero',
    domain: 'radiation',
    title: 'Jezero Crater Surface UV & Downwelling Solar Flux (MEDA RDS)',
    primaryValue: '200 – 400',
    unit: 'nm UV bands monitored (no GCR dosimeter)',
    summary:
      'Perseverance’s MEDA Radiation and Dust Sensor (RDS) directly measures UV/visible/NIR solar irradiance and sky scattering at Jezero Crater, confirming intense surface UV-C/UV-B flux modulated by airborne dust.',
    classification: 'A',
    scope: 'local-site',
    siteId: 'jezero-crater',
    datasetOrMission: 'Mars 2020 MEDA Radiation & Dust Sensor (RDS)',
    instrument: 'MEDA RDS Photodiodes & SkyCam',
    observationLocation: 'Jezero Crater (~18.38° N, 77.58° E)',
    observationPeriod: '2021–2023',
    measurementUnits: 'W/m² spectral irradiance, optical depth (τ)',
    spatialResolution: 'Local rover deck at Jezero Crater',
    sourceUrl: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/mars2020.html',
    sourceLabel: 'NASA PDS — Mars 2020 MEDA RDS',
    limitations:
      'MEDA RDS measures electromagnetic solar/UV photons and dust scattering ONLY—it does NOT measure ionizing particle radiation (GCR or SEP).',
    details: [
      'High UV flux degrades exposed polymers, seals, and spacesuit outer layers over long surface durations.',
    ],
  },

  // ======================== DUST & WEATHER ========================
  {
    id: 'dust-devils-jezero',
    domain: 'dust',
    title: 'Convective Vortices & Dust Devils at Jezero Crater',
    primaryValue: '1 – 4+',
    unit: 'vortex encounters/sol (active seasons)',
    summary:
      'Perseverance MEDA and cameras documented frequent daytime convective vortices and dust devils across Jezero’s floor, lifting fine dust and causing brief pressure drops (0.5–3+ Pa).',
    classification: 'A',
    scope: 'local-site',
    siteId: 'jezero-crater',
    datasetOrMission: 'Mars 2020 MEDA & Navcam Vortex Catalog (Newman et al. 2022)',
    instrument: 'MEDA PS / RDS / Navcam',
    observationLocation: 'Jezero Crater (~18.38° N, 77.58° E)',
    observationPeriod: '2021–2022 (Sols 1–216+)',
    measurementUnits: 'Events per sol, Pa pressure drop',
    spatialResolution: 'Local Jezero Crater floor',
    sourceUrl: 'https://www.science.org/doi/10.1126/sciadv.abn3783',
    sourceLabel: 'Newman et al., Science Advances (2022)',
    limitations:
      'Historical seasonal observation rate; does not indicate whether a dust devil or storm is currently active right now.',
    details: [
      'Convective vortices peak around local midday (11:00–15:00 LMST) when ground-to-air thermal contrast is steepest.',
      'Passing vortices can intermittently clear or redistribute dust on horizontal surfaces, though net deposition dominates in calm seasons.',
    ],
  },
  {
    id: 'dust-storms-global',
    domain: 'dust',
    title: 'Dust Storm Hierarchy & Global Dust Storm Climatology',
    primaryValue: 'τ = 0.3 to >5.0',
    unit: 'Atmospheric dust optical depth',
    summary:
      'Martian dust activity spans local storms (<10⁵ km²), regional storms, and planet-encircling Global Dust Storms (e.g., 2001, 2007, 2018) occurring roughly every 3–5 Martian years near southern spring/summer (Ls ~180°–330°).',
    classification: 'C',
    scope: 'planetary-reference',
    datasetOrMission: 'MRO MCS / Mars Odyssey THEMIS / Opportunity & Curiosity Dust Archive',
    instrument: 'MRO Mars Climate Sounder (MCS) & Surface Photometry',
    observationLocation: 'Planetary Global Climatology',
    observationPeriod: '1971–Present (Multi-decade orbital & surface record)',
    measurementUnits: 'Dimensionless column optical depth (τ)',
    spatialResolution: 'Local (<100 km) to Global (planet-wide)',
    sourceUrl: 'https://science.nasa.gov/mission/mars-reconnaissance-orbiter/',
    sourceLabel: 'NASA MRO MCS / Planetary Dust Climatology',
    limitations:
      'Climatological reference only. ARES PATH has no live orbital weather feed and cannot determine if a storm is occurring today.',
    details: [
      'Background clear-sky optical depth τ ≈ 0.3–0.6; regional storms reach τ ≈ 1.5–3.0; the 2018 global dust storm exceeded τ > 8–10 at Opportunity’s site, cutting direct sunlight by >99%.',
      'Fine airborne dust (typical radius ~1–3 µm) settles onto solar arrays, optical lenses, bearings, and airlock seals, and becomes triboelectrically charged.',
    ],
  },
  {
    id: 'dust-deposition-insight',
    domain: 'dust',
    title: 'Solar Power Attenuation from Dust Deposition & Storms',
    primaryValue: '>90% loss',
    unit: 'observed multi-year array degradation (InSight)',
    summary:
      'Empirical lander records (Opportunity, Spirit, InSight) show steady dust accumulation reduces solar power ~0.1%–0.3% per sol during dusty seasons, while severe global storms can halt solar-powered missions.',
    classification: 'B',
    scope: 'other-site-comparison',
    siteId: 'elysium-insight',
    datasetOrMission: 'InSight Solar Array Telemetry & Opportunity 2018 Storm Record',
    instrument: 'Spacecraft Solar Array Current / Tau Sensors',
    observationLocation: 'Elysium Planitia (InSight) & Meridiani Planum (Opportunity)',
    observationPeriod: '2004–2022',
    measurementUnits: '% power reduction, optical depth (τ)',
    spatialResolution: 'Stationary/rover lander sites',
    sourceUrl: 'https://mars.nasa.gov/insight/',
    sourceLabel: 'NASA InSight & MER Solar Performance Archives',
    limitations:
      'Rate of dust clearing by wind gusts ("cleaning events") varies unpredictably by location and local wind stress.',
    details: [
      'Demonstrates why nuclear fission/RTG power or active dust-mitigation (electrodynamic shields, mechanical wipers) is critical for long-duration human missions.',
    ],
  },

  // ======================== WATER & RESOURCES ========================
  {
    id: 'water-jezero-paleolake',
    domain: 'water',
    title: 'Jezero Crater Paleolake & Hydrated Minerals',
    primaryValue: 'Confirmed',
    unit: 'Past liquid water (~3.5–3.8 Ga) · Bound clays/carbonates',
    summary:
      'Orbital CRISM spectroscopy and Perseverance rover observations confirm Jezero hosted a Noachian river-delta lake system, preserving hydrated phyllosilicates (smectite clays) and carbonates.',
    classification: 'A',
    scope: 'local-site',
    siteId: 'jezero-crater',
    datasetOrMission: 'MRO CRISM + Mars 2020 Mastcam-Z / SuperCam / PIXL',
    instrument: 'CRISM, Mastcam-Z, SuperCam, PIXL',
    observationLocation: 'Jezero Crater (~18.38° N, 77.58° E)',
    observationPeriod: '2006–2024',
    measurementUnits: 'Mineralogy & sedimentary stratigraphy',
    spatialResolution: 'Orbital 18 m/px (CRISM) to mm-scale (rover)',
    sourceUrl: 'https://www.science.org/doi/10.1126/science.abo2196',
    sourceLabel: 'Mangold et al., Science (2021) / NASA Mars 2020',
    limitations:
      'Confirms ANCIENT liquid water and chemically bound OH/H₂O inside minerals—NOT modern liquid water or shallow ice sheets. Usable drinking water is NOT confirmed at Jezero.',
    details: [
      'Water chemically locked in phyllosilicates/sulfates (~3–10 wt% H₂O) would require energy-intensive thermal baking (>300–600 °C) to extract.',
    ],
  },
  {
    id: 'water-phoenix-ice',
    domain: 'water',
    title: 'Shallow Subsurface Water Ice (North Polar Plains)',
    primaryValue: '3 – 5 cm depth',
    unit: 'Confirmed exposed water-ice table',
    summary:
      'NASA’s Phoenix Lander directly excavated and verified pure water ice just 3–5 cm beneath dry regolith at 68.2° N, matching orbital Mars Odyssey Neutron Spectrometer predictions.',
    classification: 'A',
    scope: 'local-site',
    siteId: 'vastitas-phoenix',
    datasetOrMission: 'NASA Phoenix Lander & Mars Odyssey GRS/NS',
    instrument: 'Phoenix Robotic Arm / TEGA / Odyssey Neutron Spectrometer',
    observationLocation: 'Vastitas Borealis (~68.22° N, 125.70° W)',
    observationPeriod: 'May–Nov 2008',
    measurementUnits: 'Depth (cm), wt% water-equivalent hydrogen',
    spatialResolution: 'Trench scale (~0.5 m) & orbital ~300–500 km footprint',
    sourceUrl: 'https://www.science.org/doi/10.1126/science.1172339',
    sourceLabel: 'Smith et al., Science (2009) · NASA Phoenix',
    limitations:
      'Confirmed at 68.2° N polar latitude; shallow water ice is thermally unstable at equatorial/tropical sites like Jezero Crater (18.4° N). Local soil also contained ~0.5% perchlorate salts.',
    details: [
      'Perchlorates (ClO₄⁻) are toxic to human thyroid function and must be removed or chemically destroyed in any ISRU water processing system.',
    ],
  },
  {
    id: 'water-midlat-sharad',
    domain: 'water',
    title: 'Mid-Latitude Buried Ice Sheets & Glaciers',
    primaryValue: '35° – 60°',
    unit: 'Latitude band · meters to >100 m thick',
    summary:
      'MRO SHARAD radar sounding and HiRISE impact-crater monitoring interpret widespread buried water-ice sheets and debris-covered glaciers across Martian mid-latitudes.',
    classification: 'D',
    scope: 'planetary-reference',
    datasetOrMission: 'MRO SHARAD & HiRISE Fresh Impact Ice Exposures',
    instrument: 'Shallow Radar (SHARAD, 20 MHz) & HiRISE',
    observationLocation: 'Mid-latitude belts (35°–60° N/S, e.g., Arcadia & Utopia Planitia)',
    observationPeriod: '2006–Present (Dundas et al., Science 2018)',
    measurementUnits: 'Dielectric permittivity (ε ≈ 3.0–3.2), depth (m)',
    spatialResolution: 'SHARAD horizontal ~0.3–3 km; vertical ~15 m in rock/ice',
    sourceUrl: 'https://www.science.org/doi/10.1126/science.aao1619',
    sourceLabel: 'Dundas et al., Science (2018) · MRO SHARAD/HiRISE',
    limitations:
      'Radar permittivity and scarp imagery represent scientific interpretations of buried ice; direct drilling confirmation at mid-latitudes (35°–55°) has not yet been performed.',
    details: [
      'Exposed scarps in mid-latitudes reveal layered ice beginning just 1–2 m below dry regolith.',
    ],
  },
  {
    id: 'water-rsl-brines',
    domain: 'water',
    title: 'Recurring Slope Lineae (RSL) & Deep Subsurface Brines',
    primaryValue: 'Unconfirmed',
    unit: 'Hypothesis / Dry granular flow debate',
    summary:
      'Dark seasonal streaks on steep warm slopes (RSL) and proposed deep subglacial radar reflections near the south pole remain actively debated; recent studies strongly favor dry granular flows or clay/brine ambiguity.',
    classification: 'E',
    scope: 'planetary-reference',
    datasetOrMission: 'MRO HiRISE / CRISM / Mars Express MARSIS Literature',
    instrument: 'HiRISE, CRISM, MARSIS',
    observationLocation: 'Steep warm slopes & South Polar Layered Deposits',
    observationPeriod: '2011–Present (Dundas et al., Nature Geoscience 2017)',
    measurementUnits: 'Qualitative slope darkening / radar reflection power',
    spatialResolution: 'Sub-meter slopes (HiRISE) to km-scale radar',
    sourceUrl: 'https://www.nature.com/articles/s41561-017-0012-5',
    sourceLabel: 'Dundas et al., Nature Geoscience (2017)',
    limitations:
      'Unconfirmed hypothesis; liquid water cannot be assumed available for extraction at any tropical or crater-wall site.',
    details: [
      'ARES PATH explicitly classifies modern liquid brines and RSL water as Category E (unconfirmed).',
    ],
  },
];

export const EXPLORATION_CONSIDERATIONS: ExplorationConsideration[] = [
  {
    id: 'cons-pressure',
    title: 'Near-Vacuum Atmospheric Pressure',
    category: 'Atmosphere & Life Support',
    challenge:
      'Surface pressure (~610–800 Pa) is less than 1% of Earth’s sea-level pressure and lies far below the human Armstrong limit (~6.25 kPa).',
    whyItMatters:
      'Unpressurized human exposure causes immediate hypoxia and ebullism; all habitats, rovers, and EVA suits must maintain rigid or constant-volume pressure differentials.',
    scientificEvidence:
      'Confirmed by Viking, Curiosity REMS, InSight APSS, and Perseverance MEDA (~610–780 Pa at Jezero Crater).',
    classification: 'A',
    sourceLabel: 'NASA PDS Atmospheres — Mars 2020 MEDA / Mars Fact Sheet',
    sourceUrl: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/mars2020.html',
    limitations:
      'Pressure varies ~25% seasonally and decreases exponentially with elevation (scale height ~11.1 km).',
  },
  {
    id: 'cons-thermal',
    title: 'Extreme Diurnal & Seasonal Thermal Swings',
    category: 'Thermal Engineering',
    challenge:
      'Rapid 60–90 °C daily temperature swings between sunlit afternoon ground (~0 °C) and pre-dawn night (-90 °C to -100 °C).',
    whyItMatters:
      'Thermal cycling fatigues seals, batteries, cables, and lubricants; suits and rovers require continuous active thermal management and insulation.',
    scientificEvidence:
      'Perseverance MEDA recorded -83 °C to -17 °C air swings and -98 °C to +2 °C ground brightness temperatures at Jezero Crater.',
    classification: 'A',
    sourceLabel: 'Rodriguez-Manfredi et al., Nature Geoscience (2023)',
    sourceUrl: 'https://www.nature.com/articles/s41561-022-01084-0',
    limitations:
      'Low air density reduces convective cooling compared to Earth, shifting thermal control toward radiative and conductive losses.',
  },
  {
    id: 'cons-radiation',
    title: 'Chronic Galactic Cosmic Rays & Solar Particle Events',
    category: 'Radiation Protection',
    challenge:
      'Minimal atmospheric mass (~16–20 g/cm²) and no global dipole magnetic field expose surface crews to continuous GCRs, secondary neutrons, and unpredictable SEP bursts.',
    whyItMatters:
      'Increases long-term carcinogenesis, central nervous system, and cardiovascular risk, while acute SEP events require rapid storm-shelter access.',
    scientificEvidence:
      'Curiosity RAD at Gale Crater measured ~0.67 mSv/day (~0.64 mSv/day GCR + SEP spikes). No direct ionizing dosimeter exists at Jezero Crater.',
    classification: 'B',
    sourceLabel: 'Hassler et al., Science (2014) — MSL RAD at Gale Crater',
    sourceUrl: 'https://www.science.org/doi/10.1126/science.1244797',
    limitations:
      'Gale Crater RAD values cannot be assumed identical at higher/lower elevations or different solar-cycle phases; Jezero lacks direct dosimetry.',
  },
  {
    id: 'cons-dust',
    title: 'Fine Electrostatic Dust & Global Dust Storms',
    category: 'Dust & Power Mitigation',
    challenge:
      'Micron-scale abrasive dust (1–3 µm) carries electrostatic charge, contains oxidizing perchlorates, and can remain suspended globally for months.',
    whyItMatters:
      'Degrades solar arrays, obscures optical sensors, abrades EVA suit bearings/seals, and poses respiratory/chemical toxicity risks if tracked into habitats.',
    scientificEvidence:
      'Observed across MER Spirit/Opportunity, Phoenix soil chemistry (~0.5 wt% perchlorates), InSight solar degradation, and Perseverance MEDA dust devils.',
    classification: 'A',
    sourceLabel: 'NASA Mars 2020 MEDA / InSight / Phoenix Archives',
    sourceUrl: 'https://www.science.org/doi/10.1126/sciadv.abn3783',
    limitations:
      'Dust storm onset and intensity vary interannually; no predictive live storm warning is available in ARES PATH.',
  },
  {
    id: 'cons-terrain',
    title: 'Unvalidated Slopes, Boulder Fields & Loose Bedforms',
    category: 'Surface Mobility',
    challenge:
      'Martian basins feature steep crater/delta scarps, sub-meter boulders, sharp ventifacts, and loose aeolian ripples that can trap rovers or trip EVA explorers.',
    whyItMatters:
      'Rover wheel damage (Curiosity) and sand entrapment (Spirit) show that orbital resolution limits leave meter-scale hazards invisible outside HiRISE footprints.',
    scientificEvidence:
      'Documented in Jezero HiRISE 25 cm/px orthomosaics (bounded footprint) and global CTX (~5 m/px) / MOLA (463 m/px) datasets.',
    classification: 'B',
    sourceLabel: 'NASA Mars Trek WMTS — HiRISE / CTX / MOLA',
    sourceUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/WMTSCapabilities.xml',
    limitations:
      'ARES PATH does not compute slope stability, soil bearing strength, or traversability ratings; no route is certified safe.',
  },
  {
    id: 'cons-comms',
    title: 'One-Way Light-Time Communication Delays & Solar Conjunctions',
    category: 'Operations & Autonomy',
    challenge:
      'Earth–Mars distance (~55–401 million km) imposes 3 to 22 minutes of one-way light-time delay (6–44 minutes round-trip), plus ~2-week blackouts during solar conjunction every ~26 months.',
    whyItMatters:
      'Real-time Earth-based teleoperation or emergency medical/EVA guidance is physically impossible; surface crews must operate autonomously.',
    scientificEvidence:
      'Orbital mechanics and Deep Space Network (DSN) operational geometry across all Mars missions.',
    classification: 'C',
    sourceLabel: 'NASA Deep Space Network / Mars Exploration Reference',
    sourceUrl: 'https://mars.nasa.gov/mars2020/spacecraft/rover/communications/',
    limitations:
      'Exact latency varies continuously with orbital positions of Earth and Mars.',
  },
  {
    id: 'cons-resources',
    title: 'Scarce Accessible Water & ISRU Energy Demand',
    category: 'In-Situ Resource Utilization',
    challenge:
      'No accessible surface liquid water exists; shallow ice is confirmed at high latitudes (>60°), while equatorial/low-latitude sites like Jezero store water mainly in mineral crystal structures.',
    whyItMatters:
      'Extracting water from low-latitude hydrated clays/sulfates requires excavation, crushing, and high-temperature pyrolysis, demanding substantial power.',
    scientificEvidence:
      'Phoenix confirmed shallow ice at 68.2° N (with perchlorates); Jezero CRISM/Perseverance data confirm hydrated clays/carbonates from ancient water without modern shallow ice.',
    classification: 'D',
    sourceLabel: 'Smith et al., Science (2009) / Dundas et al., Science (2018)',
    sourceUrl: 'https://www.science.org/doi/10.1126/science.aao1619',
    limitations:
      'Usable drinking water is NOT confirmed at Jezero Crater; perchlorate remediation is mandatory where regolith or ice is processed.',
  },
  {
    id: 'cons-power',
    title: 'Reduced Solar Irradiance (~43% of Earth) & Equipment Constraints',
    category: 'Power & Hardware Reliability',
    challenge:
      'Mean solar irradiance at Mars’s top of atmosphere (~589 W/m²) is ~43% of Earth’s (~1,361 W/m²) and drops sharply during dusty seasons and high-latitude winters.',
    whyItMatters:
      'Constrained energy budgets limit heating, ISRU propellant production, and EVA range, while 0.38g gravity alters crew biomechanics and dust settling.',
    scientificEvidence:
      'NASA Mars Fact Sheet solar constant (~586.2–589 W/m² mean) and multi-mission solar vs RTG operational comparisons.',
    classification: 'C',
    sourceLabel: 'NASA NSSDC Mars Fact Sheet',
    sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
    limitations:
      'Surface irradiance varies strongly with solar zenith angle, orbital distance (perihelion 717 W/m² vs aphelion 493 W/m² at TOA), and dust optical depth.',
  },
];

export const SCIENTIFIC_SOURCES_REGISTRY: ScientificSourceMeta[] = [
  {
    id: 'src-meda',
    datasetOrMission: 'Mars 2020 Perseverance — MEDA Bundle',
    instrument: 'MEDA (PS, ATS, TIRS, WS, RDS, HS)',
    location: 'Jezero Crater (~18.38° N, 77.58° E)',
    observationPeriod: 'Feb 2021 – Present (published 2021–2023)',
    units: 'Pa, °C, m/s, W/m², τ',
    spatialResolution: 'Local rover station (~1.5 m mast)',
    sourceUrl: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/mars2020.html',
    sourceLabel: 'NASA PDS Atmospheres — Mars 2020',
    limitations:
      'Historical published archive; does NOT include ionizing particle radiation (GCR/SEP) dosimetry.',
    classification: 'A',
  },
  {
    id: 'src-rad',
    datasetOrMission: 'Mars Science Laboratory (MSL) Curiosity — RAD',
    instrument: 'Radiation Assessment Detector (RAD)',
    location: 'Gale Crater (~4.59° S, 137.44° E, -4.5 km)',
    observationPeriod: 'Aug 2012 – Present (Hassler et al., Science 2014)',
    units: 'mSv/day, µGy/day',
    spatialResolution: 'Local rover deck at Gale Crater',
    sourceUrl: 'https://www.science.org/doi/10.1126/science.1244797',
    sourceLabel: 'Hassler et al., Science (2014)',
    limitations:
      'Valid strictly for Gale Crater under specific solar-cycle conditions; NOT a direct Jezero Crater measurement.',
    classification: 'A',
  },
  {
    id: 'src-rems',
    datasetOrMission: 'Mars Science Laboratory (MSL) Curiosity — REMS',
    instrument: 'Rover Environmental Monitoring Station (REMS)',
    location: 'Gale Crater (~4.59° S, 137.44° E)',
    observationPeriod: 'Aug 2012 – Present',
    units: 'Pa, °C, m/s',
    spatialResolution: 'Local rover traverse in Gale Crater',
    sourceUrl: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/curiosity.html',
    sourceLabel: 'NASA PDS Atmospheres — Curiosity REMS',
    limitations: 'Applies strictly to Gale Crater (-4.5 km basin).',
    classification: 'A',
  },
  {
    id: 'src-insight',
    datasetOrMission: 'NASA InSight — APSS & TWINS Meteorology',
    instrument: 'APSS Pressure Sensor & TWINS Wind/Temp',
    location: 'Elysium Planitia (~4.50° N, 135.62° E)',
    observationPeriod: 'Nov 2018 – Dec 2022 (Mission Ended)',
    units: 'Pa, °C, m/s',
    spatialResolution: 'Stationary lander site',
    sourceUrl: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/insight.html',
    sourceLabel: 'NASA PDS Atmospheres — InSight',
    limitations: 'Mission concluded Dec 2022; no ionizing radiation detector.',
    classification: 'A',
  },
  {
    id: 'src-phoenix',
    datasetOrMission: 'NASA Phoenix Mars Lander — MET & TEGA',
    instrument: 'Meteorology Package (MET) & TEGA / Robotic Arm',
    location: 'Vastitas Borealis (~68.22° N, 125.70° W)',
    observationPeriod: 'May–Nov 2008 (Northern Summer)',
    units: '°C, Pa, cm depth, wt%',
    spatialResolution: 'Single polar site',
    sourceUrl: 'https://www.science.org/doi/10.1126/science.1172339',
    sourceLabel: 'Smith et al., Science (2009)',
    limitations: 'Summer-only operations; polar winter temperatures drop far lower.',
    classification: 'A',
  },
  {
    id: 'src-hirise',
    datasetOrMission: 'Jezero Crater HiRISE 25 cm OrthoMosaic',
    instrument: 'MRO High Resolution Imaging Science Experiment (HiRISE)',
    location: 'Jezero Crater (77.2229°–77.5840° E, 18.3068°–18.6693° N)',
    observationPeriod: 'Mars 2020 Landing Site Orthomosaic Compilation',
    units: 'Visual reflectance (orthorectified)',
    spatialResolution: '0.25 m/px (25 cm/px)',
    sourceUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/WMTSCapabilities.xml',
    sourceLabel: 'NASA Mars Trek WMTS — Jezero HiRISE',
    limitations:
      'Strictly bounded to Jezero Crater landing ellipse; visible imagery only (does not directly output elevation meters).',
    classification: 'B',
  },
  {
    id: 'src-ctx',
    datasetOrMission: 'MRO CTX Jezero 6 m Controlled & Global Beta01 (~5 m)',
    instrument: 'MRO Context Camera (CTX)',
    location: 'Jezero (6 m controlled) & Near-Global Mars (~5 m)',
    observationPeriod: '2006–2023 Mosaic Compilation',
    units: 'Panchromatic visual reflectance',
    spatialResolution: '6 m/px (Jezero) · ~5 m/px (Global Beta01)',
    sourceUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/WMTSCapabilities.xml',
    sourceLabel: 'NASA Mars Trek / Caltech Murray Lab CTX',
    limitations:
      'Global Beta01 is uncontrolled and contains minor seam brightness steps and sparse strip gaps.',
    classification: 'B',
  },
  {
    id: 'src-mola',
    datasetOrMission: 'MGS MOLA Color Hillshade (463 m) & 8-bit DEM Baseline',
    instrument: 'Mars Global Surveyor MOLA Laser Altimeter',
    location: 'Global Mars (-180° to 180°, -90° to 90°)',
    observationPeriod: '1997–2001 Altimetry Archive',
    units: 'Derived hypsometric hillshade RGB / 8-bit relative index',
    spatialResolution: '463 m/px (WMTS ClrShade) · ~10 km/px (2048×1024 baseline)',
    sourceUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml',
    sourceLabel: 'NASA GSFC MOLA / Mars Trek WMTS',
    limitations:
      '2D ClrShade tiles are derived shaded-relief imagery and local 8-bit PNG is uncalibrated; exact metric elevation and slope angles cannot be extracted per pixel in-browser.',
    classification: 'C',
  },
  {
    id: 'src-themis',
    datasetOrMission: 'Mars Odyssey THEMIS Day & Night IR Controlled Mosaics v2',
    instrument: 'Thermal Emission Imaging System (THEMIS)',
    location: 'Regional Mars (±65° Latitude)',
    observationPeriod: '2002–2018 (Oct 2018 v2 release)',
    units: 'Qualitative relative IR radiance brightness',
    spatialResolution: '100 m/px',
    sourceUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml',
    sourceLabel: 'ASU / USGS / NASA Mars Trek WMTS',
    limitations:
      'Coverage terminates at ±65° latitude; qualitative IR brightness only, not absolute surface temperatures in °C.',
    classification: 'B',
  },
  {
    id: 'src-sharad',
    datasetOrMission: 'MRO SHARAD & HiRISE Mid-Latitude Ice Studies',
    instrument: 'SHARAD Radar & HiRISE',
    location: 'Mid-latitude belts (35°–60° N/S)',
    observationPeriod: '2006–2018 (Dundas et al., Science 2018)',
    units: 'Dielectric permittivity, scarp thickness (m)',
    spatialResolution: '0.3–3 km radar footprint; 0.25 m/px scarp imagery',
    sourceUrl: 'https://www.science.org/doi/10.1126/science.aao1619',
    sourceLabel: 'Dundas et al., Science (2018)',
    limitations:
      'Orbital interpretation of buried ice sheets; not yet verified by in-situ drilling in mid-latitudes.',
    classification: 'D',
  },
  {
    id: 'src-factsheet',
    datasetOrMission: 'NASA Planetary Fact Sheet — Mars',
    instrument: 'Multi-mission Synthesis',
    location: 'Planetary / Global Reference',
    observationPeriod: 'Standard Planetary Reference',
    units: 'km, Pa, K/°C, W/m², % volume',
    spatialResolution: 'Global planetary averages',
    sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
    sourceLabel: 'NASA Goddard Space Flight Center NSSDC',
    limitations:
      'Global means and extremes only; must never be substituted for local site measurements.',
    classification: 'C',
  },
];
