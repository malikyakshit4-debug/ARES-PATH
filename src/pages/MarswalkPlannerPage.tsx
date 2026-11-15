import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Compass,
  Copy,
  Download,
  FileText,
  Layers,
  Map as MapIcon,
  MapPin,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import {
  MapJumpRequest,
  MarsScientificMap,
  SelectedMapPoint,
} from '../components/MarsScientificMap';
import { StatusNotice } from '../components/StatusNotice';
import { ModuleId, SharedMapCoordinates } from '../types/navigation';
import {
  clampLatitude,
  formatMarsLatLonDetailed,
  JEZERO_MAP_CENTER,
  MARS_BASE_LAYERS,
  MarsBaseLayerId,
  normalizeLongitude,
} from '../utils/marsMapLayers';
import {
  buildRouteExportPayload,
  computeRouteMetrics,
  MARS_MEAN_RADIUS_KM,
  PlannerWaypoint,
  wrapLongitudeDeg,
} from '../utils/marsRouteMath';

export interface PlannerRouteState {
  routeName: string;
  waypoints: PlannerWaypoint[];
}

interface MarswalkPlannerPageProps {
  onNavigate: (moduleId: ModuleId) => void;
  sharedCoordinates: SharedMapCoordinates;
  onUpdateSharedCoordinates: (coords: SharedMapCoordinates) => void;
  routeState: PlannerRouteState;
  onChangeRouteState: (
    updater: (prev: PlannerRouteState) => PlannerRouteState
  ) => void;
}

const DEFAULT_ROUTE_NAME = 'Jezero Crater Conceptual Traverse';

const JEZERO_EXAMPLE_ROUTE: {
  routeName: string;
  waypoints: Array<{ lat: number; lon: number; label: string }>;
} = {
  routeName: 'Jezero Crater Delta Concept Traverse',
  waypoints: [
    { lat: 18.4446, lon: 77.4509, label: 'Octavia E. Butler Landing' },
    { lat: 18.431, lon: 77.434, label: 'Séítah Bedrock Margin' },
    { lat: 18.472, lon: 77.402, label: 'Three Forks Delta Base' },
    { lat: 18.491, lon: 77.381, label: 'Western Fan-Delta Scarp' },
  ],
};

const PLANNER_BASE_LAYERS: { id: MarsBaseLayerId; label: string }[] = [
  { id: 'ctx-jezero', label: 'CTX Imagery' },
  { id: 'mola-clrshade', label: 'MOLA Relief' },
  { id: 'themis-day-ir', label: 'THEMIS Day IR' },
  { id: 'themis-night-ir', label: 'THEMIS Night IR' },
  { id: 'viking-color', label: 'Viking Color' },
];

function createWaypointId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `wp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeFilename(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'ares-path-marswalk-route';
}

interface WaypointEditorRowProps {
  waypoint: PlannerWaypoint;
  index: number;
  totalCount: number;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (patch: { lat?: number; lon?: number; label?: string }) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

function WaypointEditorRow({
  waypoint,
  index,
  totalCount,
  isActive,
  onSelect,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
}: WaypointEditorRowProps) {
  const [latDraft, setLatDraft] = useState(() => waypoint.lat.toFixed(4));
  const [lonDraft, setLonDraft] = useState(() => waypoint.lon.toFixed(4));
  const [labelDraft, setLabelDraft] = useState(() => waypoint.label ?? '');
  const [coordError, setCoordError] = useState<string | null>(null);

  useEffect(() => {
    setLatDraft(waypoint.lat.toFixed(4));
    setLonDraft(waypoint.lon.toFixed(4));
    setLabelDraft(waypoint.label ?? '');
    setCoordError(null);
  }, [waypoint.lat, waypoint.lon, waypoint.label]);

  const role: 'start' | 'intermediate' | 'destination' =
    index === 0
      ? 'start'
      : totalCount >= 2 && index === totalCount - 1
      ? 'destination'
      : 'intermediate';

  const roleText =
    role === 'start' ? 'Start' : role === 'destination' ? 'Destination' : 'Waypoint';

  const badgeClass =
    role === 'start'
      ? 'bg-[#059669] border-[#6EE7B7] text-white'
      : role === 'destination'
      ? 'bg-[#D9532F] border-[#FCD34D] text-white'
      : 'bg-[#161920] border-[#E5A952] text-[#E6E8EC]';

  const applyCoordinates = () => {
    const latStr = latDraft.trim();
    const lonStr = lonDraft.trim();
    const parsedLat = Number(latStr);
    const parsedLon = Number(lonStr);

    if (!latStr || !lonStr || !Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) {
      setCoordError('Enter valid numeric latitude and longitude values.');
      return;
    }
    if (parsedLat < -90 || parsedLat > 90) {
      setCoordError('Latitude must be between -90° and +90°.');
      return;
    }

    const wrappedLon = wrapLongitudeDeg(parsedLon);
    setCoordError(null);
    setLatDraft(parsedLat.toFixed(4));
    setLonDraft(wrappedLon.toFixed(4));
    onUpdate({
      lat: parsedLat,
      lon: wrappedLon,
      label: labelDraft.trim() || undefined,
    });
  };

  return (
    <div
      className={`p-3 rounded-lg border transition-colors space-y-2.5 ${
        isActive
          ? 'bg-[#161922] border-[#D9532F]'
          : 'bg-[#0D0F14] border-[#232732] hover:border-[#323848]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onSelect}
          className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
        >
          <span
            className={`w-6 h-6 rounded-full border text-[11px] font-mono font-semibold flex items-center justify-center shrink-0 ${badgeClass}`}
          >
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white group-hover:text-[#F39C82] transition-colors truncate">
                {waypoint.label?.trim() || `Waypoint ${index + 1}`}
              </span>
              <span className="text-[11px] font-mono text-[#9CA3AF]">
                · {roleText}
              </span>
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#8D95A5]">
              {formatMarsLatLonDetailed(waypoint.lat, waypoint.lon)}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            title="Move waypoint earlier"
            aria-label={`Move waypoint ${index + 1} up`}
            className="w-7 h-7 flex items-center justify-center rounded border border-[#232732] text-[#9CA3AF] hover:text-white hover:bg-[#191D26] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalCount - 1}
            title="Move waypoint later"
            aria-label={`Move waypoint ${index + 1} down`}
            className="w-7 h-7 flex items-center justify-center rounded border border-[#232732] text-[#9CA3AF] hover:text-white hover:bg-[#191D26] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Remove waypoint"
            aria-label={`Remove waypoint ${index + 1}`}
            className="w-7 h-7 flex items-center justify-center rounded border border-[#232732] text-[#9CA3AF] hover:text-[#F39C82] hover:border-[#D9532F]/60 hover:bg-[#191210] cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inline editable label & coordinates */}
      <div className="grid grid-cols-12 gap-2 pt-1">
        <div className="col-span-12">
          <label className="sr-only" htmlFor={`wp-label-${waypoint.id}`}>
            Waypoint {index + 1} label
          </label>
          <input
            id={`wp-label-${waypoint.id}`}
            type="text"
            value={labelDraft}
            placeholder={`Waypoint ${index + 1} label (optional)`}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={() =>
              onUpdate({ label: labelDraft.trim() || undefined })
            }
            className="w-full px-2.5 py-1 text-xs bg-[#111318] border border-[#232732] focus:border-[#D9532F] focus:outline-none rounded text-[#E6E8EC] placeholder:text-[#5E6676]"
          />
        </div>

        <div className="col-span-5">
          <label
            htmlFor={`wp-lat-${waypoint.id}`}
            className="block text-[10px] text-[#8D95A5] mb-0.5"
          >
            Lat (°)
          </label>
          <input
            id={`wp-lat-${waypoint.id}`}
            type="number"
            step="0.0001"
            min={-90}
            max={90}
            value={latDraft}
            onChange={(e) => setLatDraft(e.target.value)}
            onBlur={applyCoordinates}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyCoordinates();
            }}
            className="w-full px-2 py-1 text-xs font-mono tabular-nums bg-[#111318] border border-[#232732] focus:border-[#D9532F] focus:outline-none rounded text-white"
          />
        </div>

        <div className="col-span-5">
          <label
            htmlFor={`wp-lon-${waypoint.id}`}
            className="block text-[10px] text-[#8D95A5] mb-0.5"
          >
            Lon (°)
          </label>
          <input
            id={`wp-lon-${waypoint.id}`}
            type="number"
            step="0.0001"
            value={lonDraft}
            onChange={(e) => setLonDraft(e.target.value)}
            onBlur={applyCoordinates}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyCoordinates();
            }}
            className="w-full px-2 py-1 text-xs font-mono tabular-nums bg-[#111318] border border-[#232732] focus:border-[#D9532F] focus:outline-none rounded text-white"
          />
        </div>

        <div className="col-span-2 flex items-end">
          <button
            type="button"
            onClick={applyCoordinates}
            className="w-full py-1 text-[11px] font-medium text-[#E6E8EC] hover:text-white bg-[#161920] hover:bg-[#1F2430] border border-[#232732] rounded transition-colors cursor-pointer"
          >
            Set
          </button>
        </div>
      </div>

      {coordError && (
        <div className="text-[11px] text-[#F7B29B] flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-[#D9532F] shrink-0" />
          <span>{coordError}</span>
        </div>
      )}
    </div>
  );
}

export function MarswalkPlannerPage({
  onNavigate,
  sharedCoordinates,
  onUpdateSharedCoordinates,
  routeState,
  onChangeRouteState,
}: MarswalkPlannerPageProps) {
  const [baseLayerId, setBaseLayerId] = useState<MarsBaseLayerId>('ctx-jezero');
  const [hiriseEnabled, setHiriseEnabled] = useState(true);
  const [addWaypointMode, setAddWaypointMode] = useState(false);
  const [activeWaypointId, setActiveWaypointId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<PlannerRouteState[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<SelectedMapPoint>({
    lat: sharedCoordinates.lat,
    lon: sharedCoordinates.lon,
  });
  const [jumpRequest, setJumpRequest] = useState<MapJumpRequest | null>(() => ({
    lat: sharedCoordinates.lat,
    lon: sharedCoordinates.lon,
    zoom: 9.8,
    seq: 1,
  }));

  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmLoadExample, setConfirmLoadExample] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const routeStateRef = useRef(routeState);
  routeStateRef.current = routeState;
  const undoStackRef = useRef(undoStack);
  undoStackRef.current = undoStack;

  const commitRouteMutation = useCallback(
    (mutator: (prev: PlannerRouteState) => PlannerRouteState) => {
      const prev = routeStateRef.current;
      const next = mutator(prev);
      if (next === prev) return;
      routeStateRef.current = next;
      const nextStack = [...undoStackRef.current.slice(-24), prev];
      undoStackRef.current = nextStack;
      setUndoStack(nextStack);
      onChangeRouteState(() => next);
    },
    [onChangeRouteState]
  );

  const handleSelectBaseLayer = (nextId: MarsBaseLayerId) => {
    setBaseLayerId(nextId);
    if (nextId === 'ctx-jezero' || nextId === 'ctx-global') {
      setHiriseEnabled(true);
    } else {
      setHiriseEnabled(false);
    }
  };

  const handleAddWaypointAt = useCallback(
    (point: SelectedMapPoint, customLabel?: string) => {
      const lat = clampLatitude(point.lat);
      const lon = wrapLongitudeDeg(point.lon);
      const newWp: PlannerWaypoint = {
        id: createWaypointId(),
        lat,
        lon,
        label: customLabel,
      };
      commitRouteMutation((prev) => ({
        ...prev,
        waypoints: [...prev.waypoints, newWp],
      }));
      setActiveWaypointId(newWp.id);
      onUpdateSharedCoordinates({
        lat,
        lon,
        label: customLabel || 'Marswalk Waypoint',
      });
      setStatusMessage(null);
    },
    [commitRouteMutation, onUpdateSharedCoordinates]
  );

  const handleManualAdd = () => {
    const latStr = manualLat.trim();
    const lonStr = manualLon.trim();
    const lat = Number(latStr);
    const lon = Number(lonStr);
    if (!latStr || !lonStr || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      setManualError('Enter numeric latitude and longitude values.');
      return;
    }
    if (lat < -90 || lat > 90) {
      setManualError('Latitude must be between -90° and +90°.');
      return;
    }
    const wrappedLon = wrapLongitudeDeg(lon);
    setManualError(null);
    handleAddWaypointAt({ lat, lon: wrappedLon });
    setJumpRequest((prev) => ({
      lat,
      lon: wrappedLon,
      zoom: 10.5,
      seq: (prev?.seq ?? 0) + 1,
    }));
    setManualLat('');
    setManualLon('');
  };

  const handleUpdateWaypoint = useCallback(
    (id: string, patch: { lat?: number; lon?: number; label?: string }) => {
      commitRouteMutation((prev) => ({
        ...prev,
        waypoints: prev.waypoints.map((wp) =>
          wp.id === id
            ? {
                ...wp,
                lat: patch.lat !== undefined ? clampLatitude(patch.lat) : wp.lat,
                lon: patch.lon !== undefined ? wrapLongitudeDeg(patch.lon) : wp.lon,
                label: 'label' in patch ? patch.label : wp.label,
              }
            : wp
        ),
      }));
    },
    [commitRouteMutation]
  );

  const handleMoveWaypoint = useCallback(
    (index: number, direction: -1 | 1) => {
      const targetIndex = index + direction;
      commitRouteMutation((prev) => {
        if (targetIndex < 0 || targetIndex >= prev.waypoints.length) return prev;
        const copy = [...prev.waypoints];
        const [item] = copy.splice(index, 1);
        copy.splice(targetIndex, 0, item);
        return { ...prev, waypoints: copy };
      });
    },
    [commitRouteMutation]
  );

  const handleRemoveWaypoint = useCallback(
    (id: string) => {
      commitRouteMutation((prev) => ({
        ...prev,
        waypoints: prev.waypoints.filter((wp) => wp.id !== id),
      }));
      if (activeWaypointId === id) {
        setActiveWaypointId(null);
      }
    },
    [commitRouteMutation, activeWaypointId]
  );

  const handleUndo = () => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const previous = stack[stack.length - 1];
    const nextStack = stack.slice(0, -1);
    undoStackRef.current = nextStack;
    routeStateRef.current = previous;
    setUndoStack(nextStack);
    onChangeRouteState(() => previous);
  };

  const handleClearWaypoints = () => {
    if (routeState.waypoints.length === 0) return;
    commitRouteMutation((prev) => ({ ...prev, waypoints: [] }));
    setActiveWaypointId(null);
    setStatusMessage('All waypoints cleared.');
  };

  const handleResetRoute = () => {
    const nextState: PlannerRouteState = {
      routeName: DEFAULT_ROUTE_NAME,
      waypoints: [],
    };
    undoStackRef.current = [];
    routeStateRef.current = nextState;
    setUndoStack([]);
    onChangeRouteState(() => nextState);
    setActiveWaypointId(null);
    setAddWaypointMode(false);
    setConfirmLoadExample(false);
    setManualError(null);
    setStatusMessage('Route reset to Jezero Crater default.');
    setSelectedPoint({ lat: JEZERO_MAP_CENTER.lat, lon: JEZERO_MAP_CENTER.lon });
    setJumpRequest((prev) => ({
      lat: JEZERO_MAP_CENTER.lat,
      lon: JEZERO_MAP_CENTER.lon,
      zoom: 9.2,
      seq: (prev?.seq ?? 0) + 1,
    }));
  };

  const handleLoadJezeroExample = (forceReplace = false) => {
    if (routeStateRef.current.waypoints.length > 0 && !forceReplace) {
      setConfirmLoadExample(true);
      return;
    }
    const createdWaypoints: PlannerWaypoint[] = JEZERO_EXAMPLE_ROUTE.waypoints.map((wp) => ({
      id: createWaypointId(),
      lat: wp.lat,
      lon: wp.lon,
      label: wp.label,
    }));
    commitRouteMutation(() => ({
      routeName: JEZERO_EXAMPLE_ROUTE.routeName,
      waypoints: createdWaypoints,
    }));
    setConfirmLoadExample(false);
    setAddWaypointMode(false);
    setActiveWaypointId(createdWaypoints[0]?.id ?? null);
    setSelectedPoint({
      lat: createdWaypoints[0].lat,
      lon: createdWaypoints[0].lon,
    });
    onUpdateSharedCoordinates({
      lat: createdWaypoints[0].lat,
      lon: createdWaypoints[0].lon,
      label: createdWaypoints[0].label,
    });
    setJumpRequest((prev) => ({
      lat: 18.46,
      lon: 77.42,
      zoom: 11.4,
      seq: (prev?.seq ?? 0) + 1,
    }));
    setStatusMessage(
      'Loaded 4-waypoint Jezero Crater demo traverse (within HiRISE 25 cm coverage).'
    );
  };

  const metrics = useMemo(
    () => computeRouteMetrics(routeState.waypoints),
    [routeState.waypoints]
  );

  const activeBaseMeta = MARS_BASE_LAYERS[baseLayerId];
  const attributionSummary = hiriseEnabled
    ? `${activeBaseMeta.attribution} + NASA/JPL/UofA HiRISE 25 cm`
    : activeBaseMeta.attribution;

  const exportPayload = useMemo(
    () =>
      buildRouteExportPayload(
        routeState.routeName,
        routeState.waypoints,
        attributionSummary
      ),
    [routeState.routeName, routeState.waypoints, attributionSummary]
  );

  const handleExportJson = () => {
    if (routeState.waypoints.length === 0) return;
    const jsonString = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizeFilename(routeState.routeName)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMessage(`Exported ${sanitizeFilename(routeState.routeName)}.json`);
  };

  const printableTextSummary = useMemo(() => {
    const lines = [
      `ARES PATH — CONCEPTUAL MARSWALK TRAVERSE SUMMARY`,
      `Route Name: ${exportPayload.routeName}`,
      `Planet: Mars (${exportPayload.coordinateReferenceSystem.code})`,
      `Created: ${exportPayload.createdAt}`,
      `Waypoints: ${exportPayload.waypointCount}`,
      `Total Approximate Surface Distance: ${exportPayload.totalApproximateDistanceFormatted} (Mean Mars R = ${MARS_MEAN_RADIUS_KM} km)`,
      ``,
      `WAYPOINT SEQUENCE:`,
      ...exportPayload.waypoints.map(
        (wp) =>
          `  ${wp.order}. [${wp.role.toUpperCase()}] ${wp.label} — ${formatMarsLatLonDetailed(
            wp.latitudeDeg,
            wp.longitudeDeg
          )}${wp.order > 1 ? ` (+${wp.distanceFromPreviousFormatted})` : ''}`
      ),
      ``,
      `SAFETY & SCIENTIFIC NOTICE:`,
      `  ${exportPayload.safetyNotice}`,
      `  Map Attribution: ${exportPayload.mapLayerAttribution}`,
    ];
    return lines.join('\n');
  }, [exportPayload]);

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(printableTextSummary);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 1800);
    } catch {
      // Clipboard API may be restricted in headless contexts
    }
  };

  const handleSelectWaypointFromMap = useCallback(
    (wpId: string) => {
      setActiveWaypointId(wpId);
    },
    []
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#232732] pb-4 print:hidden">
        <div className="space-y-1">
          <div className="text-xs text-[#9CA3AF]">
            Active Module · Conceptual Surface Traverse Planning · EPSG:104905 (Mean Mars R = 3,389.5 km)
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Marswalk Planner
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#C7CCD6] hover:text-white bg-[#111318] hover:bg-[#191D26] border border-[#232732] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Scientific Map</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const target =
                routeState.waypoints[0] ?? {
                  lat: selectedPoint.lat,
                  lon: selectedPoint.lon,
                };
              onUpdateSharedCoordinates({
                lat: target.lat,
                lon: normalizeLongitude(target.lon),
                label: routeState.routeName,
              });
              onNavigate('explorer');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#D9532F] hover:bg-[#B64223] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Open 3D Mars Explorer</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start print:hidden">
        {/* Map Stage (order-1 on mobile, right 7/8 cols on desktop) */}
        <div className="order-1 lg:order-2 lg:col-span-7 xl:col-span-8 space-y-3">
          {/* Compact Basemap & HiRISE Toolbar */}
          <div className="p-2.5 bg-[#111318] border border-[#232732] rounded-lg flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] px-1.5">
                <Layers className="w-3.5 h-3.5 text-[#D9532F]" />
                <span className="hidden sm:inline">Basemap:</span>
              </span>
              {PLANNER_BASE_LAYERS.map((layer) => {
                const active = baseLayerId === layer.id;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => handleSelectBaseLayer(layer.id)}
                    aria-pressed={active}
                    className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-[#191D26] border-[#D9532F] text-white'
                        : 'bg-[#0D0F14] border-[#232732] text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    {layer.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={hiriseEnabled}
                onClick={() => setHiriseEnabled((prev) => !prev)}
                className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                  hiriseEnabled
                    ? 'bg-[#D9532F]/20 border-[#D9532F]/70 text-[#F7B29B]'
                    : 'bg-[#0D0F14] border-[#232732] text-[#9CA3AF] hover:text-white'
                }`}
              >
                HiRISE 25 cm: {hiriseEnabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          <MarsScientificMap
            baseLayerId={baseLayerId}
            overlays={{
              hirise: { enabled: hiriseEnabled, opacity: 1 },
              mola: { enabled: false, opacity: 0.45 },
              themisDay: { enabled: false, opacity: 0.5 },
            }}
            selectedPoint={selectedPoint}
            jumpRequest={jumpRequest}
            onSelectPoint={(pt) => {
              setSelectedPoint(pt);
              onUpdateSharedCoordinates({
                lat: pt.lat,
                lon: pt.lon,
                label: 'Marswalk Map Point',
              });
            }}
            plannerWaypoints={routeState.waypoints}
            addWaypointMode={addWaypointMode}
            activeWaypointId={activeWaypointId}
            onAddWaypoint={handleAddWaypointAt}
            onSelectWaypoint={handleSelectWaypointFromMap}
            onToggleAddWaypointMode={() => setAddWaypointMode((prev) => !prev)}
            heightClassName="h-[480px] sm:h-[580px] lg:h-[calc(100vh-15.5rem)] min-h-[520px]"
          />

          {/* Legend & NASA Attribution */}
          <div className="p-3.5 bg-[#111318] border border-[#232732] rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-[#C7CCD6]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#059669] border border-[#6EE7B7]" />
                <span>Start</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#161920] border border-[#E5A952]" />
                <span>Intermediate</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D9532F] border border-[#FCD34D]" />
                <span>Destination</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-[2px] bg-[#F59E0B]" />
                <span>Conceptual Traverse</span>
              </span>
            </div>
            <div className="text-[11px] text-[#8D95A5]">
              Layer Attribution: {attributionSummary}
            </div>
          </div>
        </div>

        {/* Left Planner Control Panel */}
        <aside className="order-2 lg:order-1 lg:col-span-5 xl:col-span-4 space-y-4">
          {/* Route Header, Mode Toggle, Distance Metrics, & Export */}
          <section className="p-4 bg-[#111318] border border-[#232732] rounded-lg space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="marswalk-route-name"
                className="block text-xs font-medium text-[#9CA3AF]"
              >
                Conceptual Route Name
              </label>
              <input
                id="marswalk-route-name"
                type="text"
                value={routeState.routeName}
                onChange={(e) =>
                  onChangeRouteState((prev) => ({
                    ...prev,
                    routeName: e.target.value,
                  }))
                }
                placeholder="Enter conceptual traverse name"
                className="w-full px-3 py-2 text-sm font-medium bg-[#0D0F14] border border-[#232732] focus:border-[#D9532F] focus:outline-none rounded text-white"
              />
            </div>

            {/* Mode & Quick Route Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAddWaypointMode((prev) => !prev)}
                aria-pressed={addWaypointMode}
                className={`flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded border transition-colors whitespace-nowrap cursor-pointer ${
                  addWaypointMode
                    ? 'bg-[#D9532F] border-[#D9532F] text-white'
                    : 'bg-[#191D26] hover:bg-[#222836] border-[#323848] text-white'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>
                  {addWaypointMode ? 'Add Waypoint: Active' : 'Add Waypoint'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                title="Undo last waypoint or edit"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#C7CCD6] hover:text-white bg-[#0D0F14] hover:bg-[#191D26] border border-[#232732] rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>

              <button
                type="button"
                onClick={handleClearWaypoints}
                disabled={routeState.waypoints.length === 0}
                title="Clear all waypoints"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#C7CCD6] hover:text-[#F39C82] bg-[#0D0F14] hover:bg-[#191210] border border-[#232732] rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>

              <button
                type="button"
                onClick={handleResetRoute}
                title="Reset route and return to Jezero Crater"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#C7CCD6] hover:text-white bg-[#0D0F14] hover:bg-[#191D26] border border-[#232732] rounded transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={() => handleLoadJezeroExample(false)}
                title="Load reproducible 4-waypoint Jezero Crater demo route"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#F39C82] hover:text-white bg-[#0D0F14] hover:bg-[#191D26] border border-[#232732] hover:border-[#D9532F]/60 rounded transition-colors cursor-pointer whitespace-nowrap"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Load Jezero Demo</span>
              </button>
            </div>

            {confirmLoadExample && (
              <div className="p-3 bg-[#17120E] border border-[#D9822B]/60 rounded text-xs text-[#FCD34D] space-y-2">
                <div className="leading-relaxed">
                  Replace your current {routeState.waypoints.length}-waypoint route with the 4-waypoint Jezero Crater demo traverse? (Undo remains available.)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadJezeroExample(true)}
                    className="px-2.5 py-1 text-xs font-semibold text-white bg-[#D9532F] hover:bg-[#B64223] rounded transition-colors cursor-pointer"
                  >
                    Replace Route
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmLoadExample(false)}
                    className="px-2.5 py-1 text-xs font-medium text-[#C7CCD6] hover:text-white bg-[#111318] border border-[#232732] rounded transition-colors cursor-pointer"
                  >
                    Keep Existing
                  </button>
                </div>
              </div>
            )}

            {/* Route Distance Summary */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#232732]">
              <div>
                <div className="text-[11px] text-[#8D95A5]">Total Waypoints</div>
                <div className="text-2xl font-mono font-semibold tabular-nums text-white mt-0.5">
                  {metrics.waypointCount}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#8D95A5]">
                  Approx. Surface Distance
                </div>
                <div className="text-2xl font-mono font-semibold tabular-nums text-[#F39C82] mt-0.5">
                  {metrics.formattedTotalDistance}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-[#8D95A5] leading-relaxed">
              Great-circle surface distance computed using mean Mars radius (3,389.5 km) in EPSG:104905. Distance calculations are independent of terrain suitability.
            </div>

            {/* Export Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#232732]">
              <button
                type="button"
                onClick={handleExportJson}
                disabled={routeState.waypoints.length === 0}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#D9532F] hover:bg-[#B64223] rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSummaryModal(true)}
                disabled={routeState.waypoints.length === 0}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#E6E8EC] hover:text-white bg-[#161920] hover:bg-[#1F2430] border border-[#232732] rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Route Summary</span>
              </button>
            </div>

            {statusMessage && (
              <div className="text-xs text-[#9CA3AF] font-mono">
                {statusMessage}
              </div>
            )}
          </section>

          {/* Waypoint List & Manual Entry */}
          <section className="p-4 bg-[#111318] border border-[#232732] rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <MapPin className="w-4 h-4 text-[#D9532F]" />
                <span>Waypoint Sequence</span>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-[#8D95A5]">
                {metrics.legs.length} {metrics.legs.length === 1 ? 'leg' : 'legs'}
              </span>
            </div>

            {routeState.waypoints.length === 0 ? (
              <div className="p-4 bg-[#0D0F14] border border-dashed border-[#2B3140] rounded-lg text-center space-y-2">
                <p className="text-xs text-[#E6E8EC] font-medium">
                  No waypoints planned yet
                </p>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Activate Add Waypoint, then select locations on the Martian surface.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {!addWaypointMode && (
                    <button
                      type="button"
                      onClick={() => setAddWaypointMode(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#D9532F] hover:bg-[#B64223] rounded transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Activate Add Waypoint</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleLoadJezeroExample(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#E6E8EC] hover:text-white bg-[#161920] hover:bg-[#1F2430] border border-[#232732] rounded transition-colors cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5 text-[#D9532F]" />
                    <span>Load Jezero Demo Route</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {routeState.waypoints.map((wp, idx) => {
                  const legBefore = idx > 0 ? metrics.legs[idx - 1] : null;
                  return (
                    <div key={wp.id} className="space-y-2">
                      {legBefore && (
                        <div className="flex items-center justify-between px-3 py-1 text-[11px] font-mono tabular-nums text-[#E5A952] bg-[#0B0D12] border border-[#232732] rounded">
                          <span>
                            Leg {idx} → {idx + 1} (approx.)
                          </span>
                          <span>{legBefore.formattedDistance}</span>
                        </div>
                      )}
                      <WaypointEditorRow
                        waypoint={wp}
                        index={idx}
                        totalCount={routeState.waypoints.length}
                        isActive={activeWaypointId === wp.id}
                        onSelect={() => {
                          setActiveWaypointId(wp.id);
                          setJumpRequest((prev) => ({
                            lat: wp.lat,
                            lon: wp.lon,
                            zoom: 11.5,
                            seq: (prev?.seq ?? 0) + 1,
                          }));
                        }}
                        onUpdate={(patch) => handleUpdateWaypoint(wp.id, patch)}
                        onMoveUp={() => handleMoveWaypoint(idx, -1)}
                        onMoveDown={() => handleMoveWaypoint(idx, 1)}
                        onRemove={() => handleRemoveWaypoint(wp.id)}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Manual Coordinate Add Form */}
            <div className="pt-3 border-t border-[#232732] space-y-2">
              <div className="text-[11px] font-medium text-[#9CA3AF]">
                Add Waypoint by Coordinates
              </div>
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="number"
                  step="0.0001"
                  min={-90}
                  max={90}
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="Lat (e.g. 18.42)"
                  aria-label="New waypoint latitude"
                  className="col-span-5 px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[#0D0F14] border border-[#232732] focus:border-[#D9532F] focus:outline-none rounded text-white placeholder:text-[#5E6676]"
                />
                <input
                  type="number"
                  step="0.0001"
                  value={manualLon}
                  onChange={(e) => setManualLon(e.target.value)}
                  placeholder="Lon (e.g. 77.41)"
                  aria-label="New waypoint longitude"
                  className="col-span-5 px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[#0D0F14] border border-[#232732] focus:border-[#D9532F] focus:outline-none rounded text-white placeholder:text-[#5E6676]"
                />
                <button
                  type="button"
                  onClick={handleManualAdd}
                  className="col-span-2 py-1.5 text-xs font-semibold text-white bg-[#191D26] hover:bg-[#D9532F] border border-[#232732] hover:border-[#D9532F] rounded transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>
              {manualError && (
                <div className="text-[11px] text-[#F7B29B]">{manualError}</div>
              )}
            </div>
          </section>

          {/* Scientific & Safety Disclaimer */}
          <StatusNotice
            tone="safety"
            label="Conceptual Traverse Only — Safety Not Assessed"
            message="Routes planned here are conceptual surface traverses. Route safety assessment is not yet supported: no terrain slope, boulder hazard, dust, or EVA life-support validation is performed, and no route is certified safe, approved, or optimal."
          />
        </aside>
      </div>

      {/* Printable Mission-Route Summary Modal */}
      {showSummaryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 print:static print:bg-white print:p-0 print:block"
          role="dialog"
          aria-modal="true"
          aria-labelledby="printable-summary-title"
        >
          <div className="w-full max-w-2xl bg-[#111318] border border-[#232732] rounded-lg overflow-hidden shadow-xl print:max-w-none print:shadow-none print:border-0 print:bg-white print:text-black">
            <div className="px-5 py-4 border-b border-[#232732] flex items-center justify-between gap-3 print:hidden">
              <h2
                id="printable-summary-title"
                className="text-base font-semibold text-white"
              >
                Conceptual Marswalk Route Summary
              </h2>
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                aria-label="Close route summary"
                className="w-8 h-8 flex items-center justify-center rounded text-[#9CA3AF] hover:text-white hover:bg-[#191D26] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0">
              <pre className="text-xs font-mono text-[#E6E8EC] print:text-black whitespace-pre-wrap leading-relaxed bg-[#0B0D12] print:bg-white p-4 rounded border border-[#232732] print:border-gray-300">
                {printableTextSummary}
              </pre>
            </div>

            <div className="px-5 py-3.5 border-t border-[#232732] flex flex-wrap items-center justify-end gap-2.5 print:hidden">
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#E6E8EC] hover:text-white bg-[#161920] hover:bg-[#1F2430] border border-[#232732] rounded transition-colors cursor-pointer"
              >
                {copiedSummary ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                    <span>Copied Summary</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#E6E8EC] hover:text-white bg-[#161920] hover:bg-[#1F2430] border border-[#232732] rounded transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#D9532F] hover:bg-[#B64223] rounded transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
