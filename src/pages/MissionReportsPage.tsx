import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  Compass,
  Copy,
  Download,
  FileJson,
  FileText,
  Globe,
  Layers,
  Map as MapIcon,
  MapPin,
  Printer,
  RefreshCw,
  Route,
} from 'lucide-react';
import {
  MapJumpRequest,
  MarsScientificMap,
  SelectedMapPoint,
} from '../components/MarsScientificMap';
import { MissionReportPreview } from '../components/reports/MissionReportPreview';
import { StatusNotice } from '../components/StatusNotice';
import { MARTIAN_STUDY_SITES } from '../data/survivalKnowledgeBase';
import { ModuleId, SharedMapCoordinates } from '../types/navigation';
import { MissionReportDocument, ReportType } from '../types/reports';
import {
  clampLatitude,
  formatMarsLatLonDetailed,
  MarsBaseLayerId,
  normalizeLongitude,
} from '../utils/marsMapLayers';
import { exportMissionReportToPdf } from '../utils/marsPdfExporter';
import {
  buildMissionReportJsonPayload,
  generateMissionReport,
} from '../utils/marsReportGenerator';
import { computeRouteMetrics } from '../utils/marsRouteMath';
import {
  matchLocationToStudySite,
  sampleRelativeMolaIndex,
} from '../utils/marsSurvivalEngine';
import { PlannerRouteState } from './MarswalkPlannerPage';

interface MissionReportsPageProps {
  onNavigate: (moduleId: ModuleId) => void;
  sharedCoordinates: SharedMapCoordinates;
  onUpdateSharedCoordinates: (coords: SharedMapCoordinates) => void;
  routeState: PlannerRouteState;
  recentReports: MissionReportDocument[];
  onSaveReport: (report: MissionReportDocument) => void;
}

const REPORT_TYPES: Array<{
  id: ReportType;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    id: 'location',
    label: 'Mars Location Intelligence Report',
    shortLabel: 'Location Report',
    description:
      '15-section coordinate intelligence brief combining orbital imagery coverage, geology, atmosphere, temperature, radiation, dust, water evidence, and explicit data gaps.',
  },
  {
    id: 'route',
    label: 'Marswalk Mission Report',
    shortLabel: 'Marswalk Report',
    description:
      '16-section conceptual traverse report connected to Marswalk Planner waypoints, leg distances, route schematic, segment coverage, and non-certification disclaimers.',
  },
  {
    id: 'region',
    label: 'Regional Exploration Report',
    shortLabel: 'Regional Report',
    description:
      '10-section regional dossier for Jezero Crater, Gale Crater, Elysium Planitia, Vastitas Borealis, Valles Marineris, or Olympus Mons.',
  },
  {
    id: 'briefing',
    label: 'Mars Exploration Briefing',
    shortLabel: 'Planetary Briefing',
    description:
      'General Mars exploration briefing synthesizing Category C planetary baselines alongside strictly separated Category A surface mission archives.',
  },
];

const QUICK_LOCATIONS = [
  { label: 'Jezero Crater', lat: 18.38, lon: 77.58 },
  { label: 'Gale Crater', lat: -4.59, lon: 137.44 },
  { label: 'Elysium (InSight)', lat: 4.5, lon: 135.62 },
  { label: 'Phoenix Polar', lat: 68.22, lon: -125.7 },
  { label: 'Valles Marineris', lat: -13.9, lon: -59.2 },
  { label: 'Olympus Mons', lat: 18.65, lon: -133.8 },
  { label: 'Arcadia (No Station)', lat: 46.7, lon: -172.0 },
];

function computeSuggestedTitle(
  reportType: ReportType,
  locationLabel: string | undefined,
  lat: number,
  lon: number,
  routeName: string,
  regionId: string
): string {
  if (reportType === 'location') {
    const clean = locationLabel?.trim();
    return clean
      ? `Location Intelligence Report: ${clean}`
      : `Location Intelligence Report (${formatMarsLatLonDetailed(lat, lon)})`;
  }
  if (reportType === 'route') {
    return `Marswalk Mission Report: ${
      routeName.trim() || 'Conceptual Marswalk Traverse'
    }`;
  }
  if (reportType === 'region') {
    const site =
      MARTIAN_STUDY_SITES.find((s) => s.id === regionId) ??
      MARTIAN_STUDY_SITES[0];
    return `Regional Exploration Report: ${site.name}`;
  }
  return 'Mars Planetary Exploration Scientific Briefing';
}

function sanitizeDownloadFilename(title: string, reportId: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'ares-path-report'}-${reportId.toLowerCase()}`;
}

function doesReportMatchRoute(
  report: MissionReportDocument | undefined | null,
  routeState: PlannerRouteState
): boolean {
  if (!report || report.reportType !== 'route' || !report.routeSnapshot) {
    return false;
  }
  const snap = report.routeSnapshot;
  if (
    snap.routeName !== routeState.routeName ||
    snap.waypoints.length !== routeState.waypoints.length
  ) {
    return false;
  }
  return snap.waypoints.every((wp, idx) => {
    const cur = routeState.waypoints[idx];
    return (
      Boolean(cur) &&
      Math.abs(wp.lat - cur.lat) < 1e-6 &&
      Math.abs(wp.lon - cur.lon) < 1e-6 &&
      (wp.label ?? '') === (cur.label ?? '')
    );
  });
}

export function MissionReportsPage({
  onNavigate,
  sharedCoordinates,
  onUpdateSharedCoordinates,
  routeState,
  recentReports,
  onSaveReport,
}: MissionReportsPageProps) {
  const [reportType, setReportType] = useState<ReportType>(() =>
    routeState.waypoints.length >= 2 ? 'route' : 'location'
  );
  const [selectedRegionId, setSelectedRegionId] = useState<string>(
    'jezero-crater'
  );
  const [customTitle, setCustomTitle] = useState<string>(() =>
    computeSuggestedTitle(
      routeState.waypoints.length >= 2 ? 'route' : 'location',
      sharedCoordinates.label,
      sharedCoordinates.lat,
      sharedCoordinates.lon,
      routeState.routeName,
      'jezero-crater'
    )
  );
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);

  const [latInput, setLatInput] = useState(() =>
    sharedCoordinates.lat.toFixed(4)
  );
  const [lonInput, setLonInput] = useState(() =>
    normalizeLongitude(sharedCoordinates.lon).toFixed(4)
  );
  const [coordError, setCoordError] = useState<string | null>(null);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string>('');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapBaseLayer, setMapBaseLayer] =
    useState<MarsBaseLayerId>('ctx-jezero');
  const [jumpRequest, setJumpRequest] = useState<MapJumpRequest | null>(() => ({
    lat: sharedCoordinates.lat,
    lon: sharedCoordinates.lon,
    zoom: 8.6,
    seq: 1,
  }));

  const [molaIndex, setMolaIndex] = useState<number | null>(null);
  const [activeReport, setActiveReport] = useState<MissionReportDocument | null>(
    () => recentReports[0] ?? null
  );
  const [isDirtySinceGeneration, setIsDirtySinceGeneration] = useState(false);

  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const routeMetrics = useMemo(
    () => computeRouteMetrics(routeState.waypoints),
    [routeState.waypoints]
  );

  const matchedSiteInfo = useMemo(
    () =>
      matchLocationToStudySite(sharedCoordinates.lat, sharedCoordinates.lon),
    [sharedCoordinates.lat, sharedCoordinates.lon]
  );

  // Sync lat/lon input fields with shared coordinates
  useEffect(() => {
    setLatInput(sharedCoordinates.lat.toFixed(4));
    setLonInput(normalizeLongitude(sharedCoordinates.lon).toFixed(4));
  }, [sharedCoordinates.lat, sharedCoordinates.lon]);

  // Sample MOLA 8-bit normalized relief index at selected coordinate
  useEffect(() => {
    let cancelled = false;
    sampleRelativeMolaIndex(sharedCoordinates.lat, sharedCoordinates.lon).then(
      (val) => {
        if (!cancelled) setMolaIndex(val);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [sharedCoordinates.lat, sharedCoordinates.lon]);

  // Keep suggested title synced unless the user manually typed a custom title
  useEffect(() => {
    if (!titleManuallyEdited) {
      setCustomTitle(
        computeSuggestedTitle(
          reportType,
          sharedCoordinates.label,
          sharedCoordinates.lat,
          sharedCoordinates.lon,
          routeState.routeName,
          selectedRegionId
        )
      );
    }
  }, [
    titleManuallyEdited,
    reportType,
    sharedCoordinates.label,
    sharedCoordinates.lat,
    sharedCoordinates.lon,
    routeState.routeName,
    selectedRegionId,
  ]);

  const handleGenerateReport = useCallback(
    (overrideMola?: number | null) => {
      const effectiveTitle =
        customTitle.trim() ||
        computeSuggestedTitle(
          reportType,
          sharedCoordinates.label,
          sharedCoordinates.lat,
          sharedCoordinates.lon,
          routeState.routeName,
          selectedRegionId
        );
      const generated = generateMissionReport({
        reportType,
        customTitle: effectiveTitle,
        lat: sharedCoordinates.lat,
        lon: sharedCoordinates.lon,
        locationLabel: sharedCoordinates.label,
        relativeMolaIndex:
          overrideMola !== undefined ? overrideMola : molaIndex,
        regionId: selectedRegionId,
        routeName: routeState.routeName,
        waypoints: routeState.waypoints,
      });
      setActiveReport(generated);
      onSaveReport(generated);
      setIsDirtySinceGeneration(false);
      setFeedbackNotice(`Generated ${generated.reportTypeLabel} (${generated.reportId}).`);
    },
    [
      customTitle,
      reportType,
      sharedCoordinates.lat,
      sharedCoordinates.lon,
      sharedCoordinates.label,
      molaIndex,
      selectedRegionId,
      routeState.routeName,
      routeState.waypoints,
      onSaveReport,
    ]
  );

  // Auto-generate an initial report if none exists, OR regenerate a fresh route report
  // when returning from Marswalk Planner with a newly built/updated multi-waypoint route.
  useEffect(() => {
    const hasPlannerRoute = routeState.waypoints.length >= 2;
    const needsFreshRouteReport =
      hasPlannerRoute && !doesReportMatchRoute(activeReport, routeState);

    if (!activeReport || needsFreshRouteReport) {
      const targetType: ReportType = needsFreshRouteReport ? 'route' : reportType;
      const targetTitle =
        needsFreshRouteReport && !titleManuallyEdited
          ? computeSuggestedTitle(
              'route',
              sharedCoordinates.label,
              sharedCoordinates.lat,
              sharedCoordinates.lon,
              routeState.routeName,
              selectedRegionId
            )
          : customTitle;
      const initial = generateMissionReport({
        reportType: targetType,
        customTitle: targetTitle,
        lat: sharedCoordinates.lat,
        lon: sharedCoordinates.lon,
        locationLabel: sharedCoordinates.label,
        relativeMolaIndex: molaIndex,
        regionId: selectedRegionId,
        routeName: routeState.routeName,
        waypoints: routeState.waypoints,
      });
      setActiveReport(initial);
      onSaveReport(initial);
      setIsDirtySinceGeneration(false);
    }
    // Only evaluate synchronization on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss transient feedback notice
  useEffect(() => {
    if (!feedbackNotice) return;
    const timer = window.setTimeout(() => setFeedbackNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedbackNotice]);

  const selectCoordinates = useCallback(
    (lat: number, lon: number, label?: string) => {
      const clamped = clampLatitude(lat);
      const wrapped = normalizeLongitude(lon);
      setCoordError(null);
      setIsDirtySinceGeneration(true);
      onUpdateSharedCoordinates({ lat: clamped, lon: wrapped, label });
      setJumpRequest((prev) => ({
        lat: clamped,
        lon: wrapped,
        zoom: 8.6,
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
    selectCoordinates(parsedLat, parsedLon, 'Custom Coordinate');
  };

  const handleSelectWaypoint = (wpId: string) => {
    setSelectedWaypointId(wpId);
    const wp = routeState.waypoints.find((w) => w.id === wpId);
    if (!wp) return;
    selectCoordinates(wp.lat, wp.lon, wp.label);
  };

  const handleMapSelect = useCallback(
    (pt: SelectedMapPoint) => {
      setSelectedWaypointId('');
      setIsDirtySinceGeneration(true);
      onUpdateSharedCoordinates({
        lat: pt.lat,
        lon: pt.lon,
        label: 'Map Selection',
      });
    },
    [onUpdateSharedCoordinates]
  );

  const handleExportPdf = () => {
    if (!activeReport) return;
    exportMissionReportToPdf(activeReport);
    setFeedbackNotice(
      `Exported multi-page PDF for ${activeReport.reportId}.`
    );
  };

  const handleExportJson = () => {
    if (!activeReport) return;
    const payload = buildMissionReportJsonPayload(activeReport);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeDownloadFilename(
      activeReport.title,
      activeReport.reportId
    )}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedbackNotice(
      `Downloaded structured JSON report (${activeReport.reportId}).`
    );
  };

  const handlePrint = () => {
    if (!activeReport) return;
    window.print();
  };

  const handleCopySummary = async () => {
    if (!activeReport) return;
    const lines = [
      `ARES PATH — ${activeReport.reportTypeLabel}`,
      `Title: ${activeReport.title}`,
      `Report ID: ${activeReport.reportId}`,
      `Created: ${activeReport.createdAtDisplay}`,
      `CRS: ${activeReport.coordinateReferenceSystem}`,
      '',
      `Executive Summary: ${activeReport.executiveSummary}`,
      '',
      `Sources Cited: ${activeReport.sources.length}`,
      'Notice: Conceptual mission intelligence only — no location or route is certified safe.',
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setFeedbackNotice('Copied structured report summary to clipboard.');
    } catch {
      setFeedbackNotice('Clipboard access unavailable in this browser frame.');
    }
  };

  const activeTypeMeta =
    REPORT_TYPES.find((t) => t.id === reportType) ?? REPORT_TYPES[0];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 print:p-0 print:max-w-none">
      {/* Page Header (hidden in print) */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b border-[#232732] pb-5 print:hidden">
        <div className="space-y-1.5">
          <div className="text-xs font-mono text-[#D9532F] uppercase tracking-wider">
            Milestone 5 · Mission Reports &amp; Scientific Intelligence Generator
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Mission Reports
          </h1>
          <p className="text-sm text-[#B0B6C2] max-w-3xl leading-relaxed">
            Compile verified NASA orbital coverage, Marswalk Planner traverse
            metrics, and cited NASA/PDS environmental intelligence into
            exportable PDF, JSON, and print-ready scientific mission reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('guide')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#E6E8EC] bg-[#161920] hover:bg-[#1E222B] border border-[#232732] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-[#D9532F]" />
            <span>Survival Guide</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('planner')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#E6E8EC] bg-[#161920] hover:bg-[#1E222B] border border-[#232732] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Route className="w-3.5 h-3.5 text-[#D9532F]" />
            <span>Marswalk Planner</span>
          </button>
        </div>
      </div>

      {/* Report Generator Configuration & Action Console (hidden in print) */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 print:hidden">
        {/* Left: Report Builder Controls */}
        <div className="xl:col-span-8 p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-5">
          {/* 1. Report Type Selector */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                1. Report Type
              </label>
              <span className="text-xs text-[#8D95A5]">
                {activeTypeMeta.description}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {REPORT_TYPES.map((type) => {
                const active = reportType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setReportType(type.id);
                      setIsDirtySinceGeneration(true);
                    }}
                    className={`px-3 py-2.5 rounded border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#D9532F]/15 border-[#D9532F] text-white'
                        : 'bg-[#0D0F14] border-[#232732] text-[#C7CCD6] hover:border-[#383F50]'
                    }`}
                  >
                    <div className="text-xs font-semibold whitespace-nowrap">
                      {type.shortLabel}
                    </div>
                    <div className="text-[11px] text-[#8D95A5] mt-0.5 truncate">
                      {type.id === 'location' && '15 sections · Point'}
                      {type.id === 'route' && '16 sections · Traverse'}
                      {type.id === 'region' && '10 sections · Study Site'}
                      {type.id === 'briefing' && '10 sections · Global'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Editable Report Title + Creation Date/Time */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 border-t border-[#232732]">
            <div className="lg:col-span-8 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="report-title-input"
                  className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]"
                >
                  2. Report Title (Editable)
                </label>
                {titleManuallyEdited && (
                  <button
                    type="button"
                    onClick={() => {
                      setTitleManuallyEdited(false);
                      setIsDirtySinceGeneration(true);
                    }}
                    className="text-[11px] text-[#F39C82] hover:underline cursor-pointer"
                  >
                    Reset to default title
                  </button>
                )}
              </div>
              <input
                id="report-title-input"
                type="text"
                value={customTitle}
                onChange={(e) => {
                  setCustomTitle(e.target.value);
                  setTitleManuallyEdited(true);
                  setIsDirtySinceGeneration(true);
                }}
                placeholder="Enter custom mission report title..."
                className="w-full px-3 py-2 text-sm bg-[#090A0D] border border-[#2C313E] focus:border-[#D9532F] rounded text-white outline-none"
              />
            </div>

            <div className="lg:col-span-4 space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Active Report Timestamp
              </div>
              <div className="px-3 py-2 bg-[#0D0F14] border border-[#232732] rounded text-xs font-mono tabular-nums text-[#C7CCD6] flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#D9532F] shrink-0" />
                <span className="truncate">
                  {activeReport?.createdAtDisplay ?? 'Pending generation'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Contextual Target Configuration */}
          <div className="pt-4 border-t border-[#232732] space-y-4">
            {reportType === 'location' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                    3. Selected Martian Coordinate
                  </div>
                  <div className="text-xs font-mono tabular-nums text-[#F39C82]">
                    {formatMarsLatLonDetailed(
                      sharedCoordinates.lat,
                      sharedCoordinates.lon
                    )}{' '}
                    ·{' '}
                    {matchedSiteInfo.site
                      ? matchedSiteInfo.site.name
                      : 'Uninstrumented Terrain'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-3 space-y-1">
                    <label
                      htmlFor="rep-lat-input"
                      className="text-[11px] text-[#9CA3AF]"
                    >
                      Latitude (°N/°S)
                    </label>
                    <input
                      id="rep-lat-input"
                      type="text"
                      value={latInput}
                      onChange={(e) => setLatInput(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs font-mono tabular-nums bg-[#090A0D] border border-[#2C313E] rounded text-white outline-none focus:border-[#D9532F]"
                    />
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <label
                      htmlFor="rep-lon-input"
                      className="text-[11px] text-[#9CA3AF]"
                    >
                      Longitude (±180° E)
                    </label>
                    <input
                      id="rep-lon-input"
                      type="text"
                      value={lonInput}
                      onChange={(e) => setLonInput(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs font-mono tabular-nums bg-[#090A0D] border border-[#2C313E] rounded text-white outline-none focus:border-[#D9532F]"
                    />
                  </div>
                  <div className="md:col-span-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleApplyManualCoords}
                      className="w-full px-3 py-2 text-xs font-semibold text-white bg-[#1E222B] hover:bg-[#272D39] border border-[#383F50] rounded transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Apply Coords
                    </button>
                  </div>
                  <div className="md:col-span-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMapPicker((v) => !v)}
                      className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                        showMapPicker
                          ? 'bg-[#D9532F]/20 border-[#D9532F] text-white'
                          : 'bg-[#0D0F14] border-[#232732] text-[#C7CCD6] hover:border-[#383F50]'
                      }`}
                    >
                      <MapIcon className="w-3.5 h-3.5" />
                      <span>{showMapPicker ? 'Hide Map Picker' : 'Pick on Mars Map'}</span>
                    </button>
                  </div>
                </div>

                {coordError && (
                  <p className="text-xs text-[#F87171]">{coordError}</p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-[#8D95A5]">
                    Quick Regions:
                  </span>
                  {QUICK_LOCATIONS.map((loc) => (
                    <button
                      key={loc.label}
                      type="button"
                      onClick={() => {
                        setSelectedWaypointId('');
                        selectCoordinates(loc.lat, loc.lon, loc.label);
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium bg-[#0D0F14] hover:bg-[#191D26] text-[#C7CCD6] border border-[#232732] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {loc.label}
                    </button>
                  ))}
                </div>

                {routeState.waypoints.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <label
                      htmlFor="rep-wp-select"
                      className="text-xs text-[#9CA3AF] shrink-0"
                    >
                      Or select Marswalk Waypoint:
                    </label>
                    <select
                      id="rep-wp-select"
                      value={selectedWaypointId}
                      onChange={(e) => handleSelectWaypoint(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-[#090A0D] border border-[#2C313E] rounded text-white outline-none"
                    >
                      <option value="">-- Choose waypoint from planner --</option>
                      {routeState.waypoints.map((wp, idx) => (
                        <option key={wp.id} value={wp.id}>
                          #{idx + 1} · {wp.label || `Waypoint ${idx + 1}`} (
                          {wp.lat.toFixed(3)}°, {wp.lon.toFixed(3)}°)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {showMapPicker && (
                  <div className="space-y-2.5 p-3 bg-[#090A0D] border border-[#232732] rounded-lg">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-[#C7CCD6]">
                        Click anywhere on the Mars Trek map to set report coordinates
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(
                          [
                            ['ctx-jezero', 'CTX'],
                            ['mola-clrshade', 'MOLA'],
                            ['themis-day-ir', 'THEMIS'],
                            ['viking-color', 'Viking'],
                          ] as const
                        ).map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setMapBaseLayer(id)}
                            className={`px-2 py-1 text-[11px] rounded border cursor-pointer ${
                              mapBaseLayer === id
                                ? 'bg-[#D9532F] border-[#D9532F] text-white'
                                : 'bg-[#111318] border-[#232732] text-[#9CA3AF]'
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
                        hirise: { enabled: true, opacity: 0.95 },
                        mola: { enabled: false, opacity: 0.5 },
                        themisDay: { enabled: false, opacity: 0.5 },
                      }}
                      plannerWaypoints={routeState.waypoints}
                      jumpRequest={jumpRequest}
                      selectedPoint={{
                        lat: sharedCoordinates.lat,
                        lon: sharedCoordinates.lon,
                      }}
                      onSelectPoint={handleMapSelect}
                      heightClassName="h-[300px]"
                    />
                  </div>
                )}
              </div>
            )}

            {reportType === 'route' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                    3. Connected Marswalk Planner Route
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('planner')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F39C82] hover:underline cursor-pointer"
                  >
                    <span>Edit Route in Marswalk Planner</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#0D0F14] border border-[#232732] rounded">
                    <div className="text-[11px] text-[#8D95A5]">Route Name</div>
                    <div className="text-sm font-medium text-white mt-0.5 truncate">
                      {routeState.routeName || 'Conceptual Marswalk Traverse'}
                    </div>
                  </div>
                  <div className="p-3 bg-[#0D0F14] border border-[#232732] rounded">
                    <div className="text-[11px] text-[#8D95A5]">
                      Ordered Waypoints
                    </div>
                    <div className="text-sm font-mono tabular-nums font-medium text-white mt-0.5">
                      {routeState.waypoints.length} point
                      {routeState.waypoints.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="p-3 bg-[#0D0F14] border border-[#232732] rounded">
                    <div className="text-[11px] text-[#8D95A5]">
                      Approx. Route Distance
                    </div>
                    <div className="text-sm font-mono tabular-nums font-medium text-[#F39C82] mt-0.5">
                      {routeMetrics.formattedTotalDistance}
                    </div>
                  </div>
                </div>

                {routeState.waypoints.length === 0 ? (
                  <div className="p-3 bg-[#17120E] border border-[#D9822B]/50 rounded flex flex-wrap items-center justify-between gap-3 text-xs text-[#FCD34D]">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        No waypoints exist in Marswalk Planner yet. You can still
                        generate a skeleton route report (missing waypoints marked
                        explicitly), or open Marswalk Planner to sketch a traverse.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('planner')}
                      className="px-3 py-1.5 bg-[#D9532F] hover:bg-[#B64223] text-white font-semibold rounded whitespace-nowrap cursor-pointer"
                    >
                      Plan Marswalk Route
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-[#9CA3AF] font-mono tabular-nums">
                    Sequence:{' '}
                    {routeState.waypoints
                      .map(
                        (w, i) =>
                          `#${i + 1} ${w.label || `WP ${i + 1}`} (${w.lat.toFixed(
                            2
                          )}°, ${w.lon.toFixed(2)}°)`
                      )
                      .join(' → ')}
                  </div>
                )}
              </div>
            )}

            {reportType === 'region' && (
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                  3. Select Documented Martian Region
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {MARTIAN_STUDY_SITES.map((site) => {
                    const selected = selectedRegionId === site.id;
                    return (
                      <button
                        key={site.id}
                        type="button"
                        onClick={() => {
                          setSelectedRegionId(site.id);
                          setIsDirtySinceGeneration(true);
                        }}
                        className={`p-3 rounded border text-left transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#D9532F]/15 border-[#D9532F] text-white'
                            : 'bg-[#0D0F14] border-[#232732] text-[#C7CCD6] hover:border-[#383F50]'
                        }`}
                      >
                        <div className="text-xs font-semibold">{site.name}</div>
                        <div className="text-[11px] font-mono tabular-nums text-[#8D95A5] mt-0.5">
                          {formatMarsLatLonDetailed(site.lat, site.lon)}
                        </div>
                        <div className="text-[11px] text-[#9CA3AF] mt-1 truncate">
                          {site.hasLocalWeatherData
                            ? 'In-situ surface archive'
                            : 'Orbital coverage only'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {reportType === 'briefing' && (
              <div className="p-3.5 bg-[#0D0F14] border border-[#232732] rounded flex items-start gap-3 text-xs text-[#B0B6C2]">
                <Globe className="w-4 h-4 text-[#D9532F] shrink-0 mt-0.5" />
                <div>
                  Compiles a global Mars exploration briefing covering planetary
                  atmosphere, temperature envelopes, GCR/SEP radiation physics,
                  surface geology, dust storms, water/ice evidence,
                  Earth–Mars communications delay, power/equipment constraints,
                  and human exploration challenges across Categories A–E.
                </div>
              </div>
            )}
          </div>

          {/* 4. Generate & Export Toolbar */}
          <div className="pt-4 border-t border-[#232732] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleGenerateReport()}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#D9532F] hover:bg-[#B64223] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Generate Report</span>
              </button>

              {isDirtySinceGeneration && (
                <span className="text-xs text-[#E5A952]">
                  Configuration changed — click Generate Report to refresh preview
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!activeReport}
                onClick={handleExportPdf}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#1E222B] hover:bg-[#272D39] border border-[#383F50] disabled:opacity-40 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#D9532F]" />
                <span>Export PDF</span>
              </button>

              <button
                type="button"
                disabled={!activeReport}
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#E6E8EC] bg-[#161920] hover:bg-[#1E222B] border border-[#232732] disabled:opacity-40 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileJson className="w-3.5 h-3.5 text-[#60A5FA]" />
                <span>Export JSON</span>
              </button>

              <button
                type="button"
                disabled={!activeReport}
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#E6E8EC] bg-[#161920] hover:bg-[#1E222B] border border-[#232732] disabled:opacity-40 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <span>Print Report</span>
              </button>

              <button
                type="button"
                disabled={!activeReport}
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#E6E8EC] bg-[#161920] hover:bg-[#1E222B] border border-[#232732] disabled:opacity-40 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <span>Copy Summary</span>
              </button>
            </div>
          </div>

          {feedbackNotice && (
            <div className="px-3.5 py-2 bg-[#064E3B]/30 border border-[#10B981]/40 rounded flex items-center gap-2 text-xs text-[#6EE7B7]">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{feedbackNotice}</span>
            </div>
          )}
        </div>

        {/* Right: In-Session Recent Reports & Scientific Guardrail */}
        <aside className="xl:col-span-4 space-y-4">
          <div className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-3.5">
            <div className="flex items-center justify-between gap-2 border-b border-[#232732] pb-2.5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#D9532F]" />
                <h2 className="text-sm font-semibold text-white">
                  Recent Reports (Session Only)
                </h2>
              </div>
              <span className="text-xs font-mono tabular-nums text-[#8D95A5]">
                {recentReports.length}
              </span>
            </div>

            <p className="text-xs text-[#8D95A5] leading-relaxed">
              Reports generated during this browser session are listed below for
              quick comparison and export. Session memory is not persisted to a
              database or cloud storage.
            </p>

            {recentReports.length === 0 ? (
              <div className="p-3 bg-[#0D0F14] border border-[#232732] rounded text-xs text-[#8D95A5]">
                No reports generated in this session yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {recentReports.map((item) => {
                  const isCurrent = activeReport?.reportId === item.reportId;
                  return (
                    <button
                      key={item.reportId}
                      type="button"
                      onClick={() => {
                        setActiveReport(item);
                        setFeedbackNotice(
                          `Loaded ${item.reportTypeLabel} (${item.reportId}) into preview.`
                        );
                      }}
                      className={`w-full p-3 rounded border text-left transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#D9532F]/15 border-[#D9532F] text-white'
                          : 'bg-[#0D0F14] border-[#232732] text-[#C7CCD6] hover:border-[#383F50]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#9CA3AF]">
                        <span className="text-[#F39C82] uppercase">
                          {item.reportType}
                        </span>
                        <span className="tabular-nums">{item.reportId}</span>
                      </div>
                      <div className="text-xs font-semibold text-white mt-1 line-clamp-2">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[#8D95A5] font-mono tabular-nums mt-1">
                        {item.createdAtDisplay}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <StatusNotice
            tone="safety"
            label="Scientific Integrity Guardrail"
            message="Every generated report preserves A–E evidence classification, exact NASA/PDS source attribution, and strict mission-site separation. Unmeasured parameters (such as Jezero ionizing radiation or live Mars weather) are explicitly marked unavailable."
          />

          <div className="p-4 bg-[#111318] border border-[#232732] rounded-lg space-y-2 text-xs text-[#9CA3AF]">
            <div className="font-semibold text-[#E6E8EC] flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#D9532F]" />
              <span>Export Format Notes</span>
            </div>
            <p className="leading-relaxed">
              <strong>Export PDF</strong> renders a multi-page A4 vector PDF
              with automatic pagination, wrapped tables, route/climate graphics,
              and clickable NASA/PDS reference links. <strong>Export JSON</strong>{' '}
              outputs machine-readable structured observations, waypoints,
              leg distances, and dataset metadata.
            </p>
          </div>
        </aside>
      </section>

      {/* Active Report Preview Stage */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9CA3AF] print:hidden">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#D9532F]" />
            <span>
              Document Preview ·{' '}
              {activeReport ? activeReport.reportTypeLabel : 'No report loaded'}
            </span>
          </div>
          {activeReport && (
            <span className="font-mono tabular-nums text-[#8D95A5]">
              {activeReport.sections.length} Sections ·{' '}
              {activeReport.scientificObservations.length} Observations ·{' '}
              {activeReport.sources.length} References
            </span>
          )}
        </div>

        {activeReport ? (
          <MissionReportPreview report={activeReport} />
        ) : (
          <div className="p-10 bg-[#111318] border border-[#232732] rounded-lg text-center text-sm text-[#9CA3AF]">
            Configure report parameters above and click{' '}
            <strong className="text-white">Generate Report</strong> to preview.
          </div>
        )}
      </section>
    </div>
  );
}
