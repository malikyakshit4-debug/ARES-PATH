import { ArrowLeft, ArrowRight, Compass, Map } from 'lucide-react';
import { MarsGlobe } from '../components/MarsGlobe';
import { StatusNotice } from '../components/StatusNotice';
import { JEZERO_CRATER } from '../data/marsData';
import { ModuleId, SharedMapCoordinates } from '../types/navigation';

interface MarsExplorerPageProps {
  onNavigate: (moduleId: ModuleId) => void;
  sharedCoordinates?: SharedMapCoordinates;
  onUpdateSharedCoordinates?: (coords: SharedMapCoordinates) => void;
}

export function MarsExplorerPage({
  onNavigate,
  sharedCoordinates,
  onUpdateSharedCoordinates,
}: MarsExplorerPageProps) {
  const activeCoords = sharedCoordinates ?? {
    lat: JEZERO_CRATER.approxLat,
    lon: JEZERO_CRATER.approxLon,
    label: JEZERO_CRATER.name,
  };
  const isCustomPoint =
    Math.abs(activeCoords.lat - JEZERO_CRATER.approxLat) > 0.01 ||
    Math.abs(activeCoords.lon - JEZERO_CRATER.approxLon) > 0.01;
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#232732] pb-4">
        <div className="space-y-1">
          <div className="text-xs text-[#9CA3AF]">
            Active Module · Spherical Planetary Inspection
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Mars Explorer
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
            onClick={() => onNavigate('map')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#D9532F] hover:bg-[#B64223] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Map className="w-3.5 h-3.5" />
            <span>Open Scientific Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Explorer Workspace: Large 3D Globe + Jezero Crater Reference Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <MarsGlobe
            heightClassName="h-[440px] sm:h-[540px] lg:h-[640px]"
            initialFocusJezero
            showInspectReadout
          />
        </div>

        <aside className="lg:col-span-4 space-y-4">
          {/* Coordinates Display Card */}
          <div className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium text-[#9CA3AF]">
              <Compass className="w-4 h-4 text-[#D9532F]" />
              <span>Target Study Coordinates (Approximate)</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <div className="text-[11px] text-[#8D95A5]">Latitude</div>
                <div className="text-2xl font-mono font-semibold tabular-nums text-white mt-0.5">
                  {JEZERO_CRATER.approxLat.toFixed(1)}° N
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#8D95A5]">Longitude</div>
                <div className="text-2xl font-mono font-semibold tabular-nums text-white mt-0.5">
                  {JEZERO_CRATER.approxLon.toFixed(1)}° E
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#232732] grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#8D95A5] block">Region</span>
                <span className="text-[#E6E8EC] font-medium">
                  {JEZERO_CRATER.name}
                </span>
              </div>
              <div>
                <span className="text-[#8D95A5] block">Approx. Diameter</span>
                <span className="text-[#E6E8EC] font-mono tabular-nums">
                  {JEZERO_CRATER.approxDiameter}
                </span>
              </div>
            </div>

            {isCustomPoint && (
              <div className="pt-3 border-t border-[#232732] flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[#8D95A5] block">Synced 2D Map Point</span>
                  <span className="font-mono tabular-nums text-[#F39C82]">
                    {Math.abs(activeCoords.lat).toFixed(3)}° {activeCoords.lat >= 0 ? 'N' : 'S'},{' '}
                    {Math.abs(activeCoords.lon).toFixed(3)}° {activeCoords.lon >= 0 ? 'E' : 'W'}
                  </span>
                </div>
                {onUpdateSharedCoordinates && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSharedCoordinates({
                        lat: JEZERO_CRATER.approxLat,
                        lon: JEZERO_CRATER.approxLon,
                        label: JEZERO_CRATER.name,
                      })
                    }
                    className="px-2.5 py-1 text-[11px] font-medium text-[#C7CCD6] hover:text-white bg-[#161920] border border-[#232732] rounded cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Jezero Crater Region Information */}
          <div className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-3">
            <h2 className="text-base font-semibold text-white">
              Jezero Crater Region Context
            </h2>
            <p className="text-sm text-[#C7CCD6] leading-relaxed">
              {JEZERO_CRATER.summary}
            </p>

            <div className="space-y-2 pt-1">
              <div className="text-xs font-semibold text-[#E6E8EC]">
                Key Planetary Science Context
              </div>
              <ul className="space-y-2 text-sm text-[#B0B6C2]">
                {JEZERO_CRATER.scientificSignificance.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D9532F] mt-2 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-[#232732] flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('map')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#D9532F] hover:bg-[#B64223] rounded transition-colors cursor-pointer"
              >
                <span>Proceed to Scientific Map</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-xs text-[#8D95A5] leading-relaxed">
                {JEZERO_CRATER.caveat}
              </p>
            </div>
          </div>

          <StatusNotice
            tone="milestone"
            label="Surface Dataset Attribution"
            message="Surface imagery combines a local NASA Mars Trek baseline (Viking MDIM 2.1 + MGS MOLA DEM, 2048×1024) with progressive regional tile streaming on zoom: Viking color (Z3–Z7), Caltech Murray Lab Global MRO CTX Beta01 (Z3–Z12), MOLA relief (Z3–Z5), and Jezero Crater HiRISE 25 cm OrthoMosaic (Z9–Z14). Atmospheric limb glow is illustrative."
          />
        </aside>
      </div>
    </div>
  );
}
