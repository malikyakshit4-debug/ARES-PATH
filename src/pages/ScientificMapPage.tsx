import { useCallback, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Compass,
  Copy,
  Database,
  Layers,
  MapPin,
  Navigation,
  SlidersHorizontal,
} from 'lucide-react';
import {
  MapJumpRequest,
  MarsScientificMap,
  OverlayState,
  SelectedMapPoint,
} from '../components/MarsScientificMap';
import { ModuleId, SharedMapCoordinates } from '../types/navigation';
import {
  isPointInExtent,
  JEZERO_CTX_EXTENT,
  JEZERO_HIRISE_EXTENT,
  JEZERO_MAP_CENTER,
  MARS_BASE_LAYERS,
  MARS_OVERLAY_LAYERS,
  MARS_QUICK_LOCATIONS,
  MarsBaseLayerId,
  marsGreatCircleDistanceKm,
  normalizeLongitude,
  THEMIS_CONTROLLED_EXTENT,
} from '../utils/marsMapLayers';

interface ScientificMapPageProps {
  onNavigate: (moduleId: ModuleId) => void;
  sharedCoordinates: SharedMapCoordinates;
  onUpdateSharedCoordinates: (coords: SharedMapCoordinates) => void;
}

const BASE_LAYER_ORDER: MarsBaseLayerId[] = [
  'ctx-jezero',
  'mola-clrshade',
  'themis-day-ir',
  'themis-night-ir',
  'ctx-global',
  'viking-color',
];

export function ScientificMapPage({
  onNavigate,
  sharedCoordinates,
  onUpdateSharedCoordinates,
}: ScientificMapPageProps) {
  const [baseLayerId, setBaseLayerId] = useState<MarsBaseLayerId>('ctx-jezero');
  const [hiriseOverlay, setHiriseOverlay] = useState<OverlayState>({
    enabled: true,
    opacity: 1,
  });
  const [molaOverlay, setMolaOverlay] = useState<OverlayState>({
    enabled: false,
    opacity: 0.45,
  });
  const [themisDayOverlay, setThemisDayOverlay] = useState<OverlayState>({
    enabled: false,
    opacity: 0.5,
  });

  const [selectedPoint, setSelectedPoint] = useState<SelectedMapPoint>({
    lat: sharedCoordinates.lat,
    lon: sharedCoordinates.lon,
  });
  const [jumpRequest, setJumpRequest] = useState<MapJumpRequest | null>(() => ({
    lat: sharedCoordinates.lat,
    lon: sharedCoordinates.lon,
    zoom: 9.2,
    seq: 1,
  }));
  const [copiedCoords, setCopiedCoords] = useState(false);

  const handleSelectBaseLayer = (nextId: MarsBaseLayerId) => {
    setBaseLayerId(nextId);
    // When inspecting global elevation/thermal/color datasets, avoid masking Jezero under opaque HiRISE
    if (nextId === 'ctx-jezero' || nextId === 'ctx-global') {
      setHiriseOverlay((prev) => ({ ...prev, enabled: true }));
    } else {
      setHiriseOverlay((prev) => ({ ...prev, enabled: false }));
    }
    if (nextId === 'mola-clrshade') {
      setMolaOverlay((prev) => ({ ...prev, enabled: false }));
    }
    if (nextId === 'themis-day-ir') {
      setThemisDayOverlay((prev) => ({ ...prev, enabled: false }));
    }
  };

  const handleSelectPoint = useCallback(
    (point: SelectedMapPoint) => {
      setSelectedPoint(point);
      onUpdateSharedCoordinates({
        lat: point.lat,
        lon: point.lon,
        label: 'Selected Map Point',
      });
    },
    [onUpdateSharedCoordinates]
  );

  const handleJump = useCallback((lat: number, lon: number, zoom: number) => {
    setJumpRequest((prev) => ({
      lat,
      lon,
      zoom,
      seq: (prev?.seq ?? 0) + 1,
    }));
  }, []);

  const handleCopyCoords = async () => {
    const latDir = selectedPoint.lat >= 0 ? 'N' : 'S';
    const lon = normalizeLongitude(selectedPoint.lon);
    const lonDir = lon >= 0 ? 'E' : 'W';
    const formatted = `${Math.abs(selectedPoint.lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;

    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 1800);
    } catch {
      // Clipboard API may be restricted in headless contexts
    }
  };

  const activeBaseMeta = MARS_BASE_LAYERS[baseLayerId];

  const pointCoverage = useMemo(() => {
    const inHirise = isPointInExtent(
      selectedPoint.lon,
      selectedPoint.lat,
      JEZERO_HIRISE_EXTENT
    );
    const inJezeroCtx = isPointInExtent(
      selectedPoint.lon,
      selectedPoint.lat,
      JEZERO_CTX_EXTENT
    );
    const inThemis = isPointInExtent(
      selectedPoint.lon,
      selectedPoint.lat,
      THEMIS_CONTROLLED_EXTENT
    );
    const distFromJezeroKm = marsGreatCircleDistanceKm(
      selectedPoint.lat,
      selectedPoint.lon,
      JEZERO_MAP_CENTER.lat,
      JEZERO_MAP_CENTER.lon
    );
    const lon360 = ((selectedPoint.lon % 360) + 360) % 360;

    return {
      inHirise,
      inJezeroCtx,
      inThemis,
      distFromJezeroKm,
      lon360,
    };
  }, [selectedPoint]);

  const activeLayerSummary = useMemo(() => {
    const names = [activeBaseMeta.shortLabel];
    if (hiriseOverlay.enabled) names.push('HiRISE 25 cm');
    if (molaOverlay.enabled && baseLayerId !== 'mola-clrshade')
      names.push('MOLA Tint');
    if (themisDayOverlay.enabled && baseLayerId !== 'themis-day-ir')
      names.push('THEMIS Day IR');
    return names.join(' + ');
  }, [
    activeBaseMeta.shortLabel,
    baseLayerId,
    hiriseOverlay.enabled,
    molaOverlay.enabled,
    themisDayOverlay.enabled,
  ]);

  const normalizedLon = normalizeLongitude(selectedPoint.lon);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-6 space-y-5">
      {/* Compact Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#232732] pb-4">
        <div className="space-y-1">
          <div className="text-xs text-[#9CA3AF]">
            Active Module · 2D Planetary Cartography · EPSG:104905 (Mars Equirectangular, R = 3,396.19 km)
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Scientific Map
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('overview')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#C7CCD6] hover:text-white bg-[#111318] hover:bg-[#191D26] border border-[#232732] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onUpdateSharedCoordinates({
                lat: selectedPoint.lat,
                lon: normalizedLon,
                label: 'Scientific Map Focus',
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

      {/* Main Split Console: Control Sidebar + Large Interactive OpenLayers Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Map Stage (Primary on mobile order-1, right 8/9 cols on desktop) */}
        <div className="order-1 lg:order-2 lg:col-span-8 xl:col-span-9 space-y-3">
          <MarsScientificMap
            baseLayerId={baseLayerId}
            overlays={{
              hirise: hiriseOverlay,
              mola: molaOverlay,
              themisDay: themisDayOverlay,
            }}
            selectedPoint={selectedPoint}
            jumpRequest={jumpRequest}
            onSelectPoint={handleSelectPoint}
          />

          {/* Quick Jump Strip & Active Dataset Provenance */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div className="xl:col-span-5 p-4 bg-[#111318] border border-[#232732] rounded-lg space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#E6E8EC]">
                <Navigation className="w-3.5 h-3.5 text-[#D9532F]" />
                <span>Quick Planetary Regions</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MARS_QUICK_LOCATIONS.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    title={loc.note}
                    onClick={() => {
                      handleJump(loc.lat, loc.lon, loc.zoom);
                      handleSelectPoint({ lat: loc.lat, lon: loc.lon });
                    }}
                    className="px-2.5 py-1.5 text-xs font-medium text-[#C7CCD6] hover:text-white bg-[#161920] hover:bg-[#1E222D] border border-[#232732] rounded transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {loc.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="xl:col-span-7 p-4 bg-[#111318] border border-[#232732] rounded-lg space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#E6E8EC]">
                  <Database className="w-3.5 h-3.5 text-[#D9532F]" />
                  <span>{activeBaseMeta.label}</span>
                </div>
                <span className="text-[11px] font-mono text-[#E5A952]">
                  {activeBaseMeta.dataKind}
                </span>
              </div>
              <p className="text-xs text-[#C7CCD6] leading-relaxed">
                {activeBaseMeta.scientificExplanation}
              </p>
              <div className="pt-1 text-[11px] text-[#8D95A5] space-y-0.5">
                <div className="font-mono break-all">
                  WMTS ID: {activeBaseMeta.wmtsIdentifier}
                </div>
                <div>
                  Attribution: {activeBaseMeta.attribution} · {activeBaseMeta.caveat}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Left Scientific Layer & Location Inspector Sidebar */}
        <aside className="order-2 lg:order-1 lg:col-span-4 xl:col-span-3 space-y-4">
          {/* Base Scientific Layers */}
          <section className="p-4 bg-[#111318] border border-[#232732] rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Layers className="w-4 h-4 text-[#D9532F]" />
                <span>NASA Scientific Base Layers</span>
              </div>
              <span className="text-[11px] font-mono text-[#8D95A5]">
                WMTS
              </span>
            </div>

            <div className="space-y-1.5" role="radiogroup" aria-label="Base scientific layer">
              {BASE_LAYER_ORDER.map((id) => {
                const layer = MARS_BASE_LAYERS[id];
                const isSelected = baseLayerId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectBaseLayer(id)}
                    className={`w-full text-left px-3 py-2.5 rounded border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#191D26] border-[#D9532F] text-white'
                        : 'bg-[#0D0F14] hover:bg-[#151821] border-[#232732] text-[#C7CCD6]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold truncate">
                        {layer.shortLabel}
                      </span>
                      <span className="text-[11px] font-mono text-[#9CA3AF] shrink-0">
                        Z0–Z{layer.maxZoom}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#8D95A5] mt-0.5 truncate">
                      {layer.instrument} · {layer.resolutionLabel}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Compatible Overlays & Opacity */}
          <section className="p-4 bg-[#111318] border border-[#232732] rounded-lg space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <SlidersHorizontal className="w-4 h-4 text-[#D9532F]" />
              <span>Compatible Overlays &amp; Opacity</span>
            </div>

            {/* HiRISE 25cm Overlay */}
            <div className="p-3 bg-[#0D0F14] border border-[#232732] rounded space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-[#E6E8EC]">
                    {MARS_OVERLAY_LAYERS['hirise-jezero'].label}
                  </div>
                  <div className="text-[11px] text-[#8D95A5]">
                    Jezero footprint only (77.22°–77.58° E)
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hiriseOverlay.enabled}
                  onClick={() =>
                    setHiriseOverlay((prev) => ({ ...prev, enabled: !prev.enabled }))
                  }
                  className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    hiriseOverlay.enabled
                      ? 'bg-[#D9532F]/25 border-[#D9532F] text-[#F7B29B]'
                      : 'bg-[#161920] border-[#232732] text-[#9CA3AF]'
                  }`}
                >
                  {hiriseOverlay.enabled ? 'On' : 'Off'}
                </button>
              </div>

              {hiriseOverlay.enabled && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
                    <span>Opacity</span>
                    <span className="font-mono tabular-nums">
                      {Math.round(hiriseOverlay.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={Math.round(hiriseOverlay.opacity * 100)}
                    onChange={(e) =>
                      setHiriseOverlay((prev) => ({
                        ...prev,
                        opacity: Number(e.target.value) / 100,
                      }))
                    }
                    aria-label="HiRISE Jezero overlay opacity"
                    className="w-full accent-[#D9532F] cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => handleJump(18.49, 77.38, 12.8)}
                    className="text-[11px] font-medium text-[#F39C82] hover:text-white transition-colors cursor-pointer"
                  >
                    Zoom to Jezero HiRISE Delta →
                  </button>
                </div>
              )}
            </div>

            {/* MOLA Color Hillshade Overlay */}
            <div className="p-3 bg-[#0D0F14] border border-[#232732] rounded space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-[#E6E8EC]">
                    MOLA Elevation Relief Tint
                  </div>
                  <div className="text-[11px] text-[#8D95A5]">
                    {baseLayerId === 'mola-clrshade'
                      ? 'Active as primary base layer'
                      : 'Drape global 463 m/px hillshade'}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  disabled={baseLayerId === 'mola-clrshade'}
                  aria-checked={molaOverlay.enabled && baseLayerId !== 'mola-clrshade'}
                  onClick={() =>
                    setMolaOverlay((prev) => ({ ...prev, enabled: !prev.enabled }))
                  }
                  className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                    baseLayerId === 'mola-clrshade'
                      ? 'bg-[#161920] border-[#232732] text-[#5B6373] cursor-not-allowed'
                      : molaOverlay.enabled
                      ? 'bg-[#D9532F]/25 border-[#D9532F] text-[#F7B29B] cursor-pointer'
                      : 'bg-[#161920] border-[#232732] text-[#9CA3AF] cursor-pointer'
                  }`}
                >
                  {molaOverlay.enabled && baseLayerId !== 'mola-clrshade' ? 'On' : 'Off'}
                </button>
              </div>

              {molaOverlay.enabled && baseLayerId !== 'mola-clrshade' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
                    <span>Opacity</span>
                    <span className="font-mono tabular-nums">
                      {Math.round(molaOverlay.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={Math.round(molaOverlay.opacity * 100)}
                    onChange={(e) =>
                      setMolaOverlay((prev) => ({
                        ...prev,
                        opacity: Number(e.target.value) / 100,
                      }))
                    }
                    aria-label="MOLA elevation tint overlay opacity"
                    className="w-full accent-[#D9532F] cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* THEMIS Day IR Overlay */}
            <div className="p-3 bg-[#0D0F14] border border-[#232732] rounded space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-[#E6E8EC]">
                    THEMIS Daytime IR Overlay
                  </div>
                  <div className="text-[11px] text-[#8D95A5]">
                    {baseLayerId === 'themis-day-ir'
                      ? 'Active as primary base layer'
                      : '100 m/px IR slope brightness (±65°)'}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  disabled={baseLayerId === 'themis-day-ir'}
                  aria-checked={themisDayOverlay.enabled && baseLayerId !== 'themis-day-ir'}
                  onClick={() =>
                    setThemisDayOverlay((prev) => ({ ...prev, enabled: !prev.enabled }))
                  }
                  className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                    baseLayerId === 'themis-day-ir'
                      ? 'bg-[#161920] border-[#232732] text-[#5B6373] cursor-not-allowed'
                      : themisDayOverlay.enabled
                      ? 'bg-[#D9532F]/25 border-[#D9532F] text-[#F7B29B] cursor-pointer'
                      : 'bg-[#161920] border-[#232732] text-[#9CA3AF] cursor-pointer'
                  }`}
                >
                  {themisDayOverlay.enabled && baseLayerId !== 'themis-day-ir' ? 'On' : 'Off'}
                </button>
              </div>

              {themisDayOverlay.enabled && baseLayerId !== 'themis-day-ir' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
                    <span>Opacity</span>
                    <span className="font-mono tabular-nums">
                      {Math.round(themisDayOverlay.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={Math.round(themisDayOverlay.opacity * 100)}
                    onChange={(e) =>
                      setThemisDayOverlay((prev) => ({
                        ...prev,
                        opacity: Number(e.target.value) / 100,
                      }))
                    }
                    aria-label="THEMIS Daytime IR overlay opacity"
                    className="w-full accent-[#D9532F] cursor-pointer"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Selected Location Inspector */}
          <section className="p-4 bg-[#111318] border border-[#232732] rounded-lg space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <MapPin className="w-4 h-4 text-[#D9532F]" />
                <span>Location Inspector</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCoords}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#E6E8EC] hover:text-white bg-[#161920] hover:bg-[#1E222D] border border-[#232732] rounded transition-colors cursor-pointer"
              >
                {copiedCoords ? (
                  <>
                    <Check className="w-3 h-3 text-[#4ADE80]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="text-[11px] text-[#8D95A5]">Areocentric Lat</div>
                <div className="text-base font-mono font-semibold tabular-nums text-white mt-0.5">
                  {Math.abs(selectedPoint.lat).toFixed(4)}°{' '}
                  {selectedPoint.lat >= 0 ? 'N' : 'S'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#8D95A5]">Areocentric Lon</div>
                <div className="text-base font-mono font-semibold tabular-nums text-white mt-0.5">
                  {Math.abs(normalizedLon).toFixed(4)}°{' '}
                  {normalizedLon >= 0 ? 'E' : 'W'}
                </div>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#232732] space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#8D95A5]">0–360° East Lon</span>
                <span className="font-mono tabular-nums text-[#E6E8EC]">
                  {pointCoverage.lon360.toFixed(4)}° E
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#8D95A5]">Dist. from Jezero Ref</span>
                <span className="font-mono tabular-nums text-[#E6E8EC]">
                  {pointCoverage.distFromJezeroKm.toFixed(2)} km
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#8D95A5] shrink-0">Active Stack</span>
                <span className="text-right text-[#E6E8EC]">{activeLayerSummary}</span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#232732] space-y-1.5 text-[11px]">
              <div className="text-[#9CA3AF] font-medium">
                Dataset Coverage at Point
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8D95A5]">Jezero HiRISE (25 cm)</span>
                <span
                  className={
                    pointCoverage.inHirise
                      ? 'font-mono text-[#F39C82]'
                      : 'font-mono text-[#7E8694]'
                  }
                >
                  {pointCoverage.inHirise ? 'Covered' : 'Outside Footprint'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8D95A5]">Jezero CTX (6 m)</span>
                <span
                  className={
                    pointCoverage.inJezeroCtx
                      ? 'font-mono text-[#E5A952]'
                      : 'font-mono text-[#7E8694]'
                  }
                >
                  {pointCoverage.inJezeroCtx ? 'Covered' : 'Global CTX Fallback'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8D95A5]">THEMIS IR (100 m)</span>
                <span
                  className={
                    pointCoverage.inThemis
                      ? 'font-mono text-[#C7CCD6]'
                      : 'font-mono text-[#7E8694]'
                  }
                >
                  {pointCoverage.inThemis ? 'Covered (±65°)' : 'Outside ±65° Band'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#7E8694] leading-relaxed pt-1">
              Click anywhere on the map to sample Mars coordinates. No synthetic elevation or temperature values are inferred from visual imagery tiles.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
