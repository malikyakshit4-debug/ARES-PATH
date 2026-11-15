import { ArrowLeft, Compass, Layers } from 'lucide-react';
import { StatusNotice } from '../components/StatusNotice';
import { DEVELOPMENT_SPECS, JEZERO_CRATER } from '../data/marsData';
import { ModuleId } from '../types/navigation';

interface ModuleDevelopmentPageProps {
  moduleId: 'guide' | 'reports';
  onNavigate: (moduleId: ModuleId) => void;
}

export function ModuleDevelopmentPage({
  moduleId,
  onNavigate,
}: ModuleDevelopmentPageProps) {
  const spec = DEVELOPMENT_SPECS[moduleId];

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#232732] pb-5">
        <div className="space-y-1.5">
          <div className="text-xs font-mono text-[#E5A952]">
            Development State · Target: {spec.targetMilestone}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {spec.title}
          </h1>
          <p className="text-sm text-[#9CA3AF]">{spec.subtitle}</p>
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
            onClick={() => onNavigate('explorer')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#D9532F] hover:bg-[#B64223] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Open Mars Explorer</span>
          </button>
        </div>
      </div>

      {/* Explicit Milestone 1 Status Notice */}
      <StatusNotice
        tone="milestone"
        label={`Not Yet Implemented — ${spec.targetMilestone}`}
        message={spec.scientificGuardrail}
      />

      {/* Module Overview & Anchor Region */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 p-6 bg-[#111318] border border-[#232732] rounded-lg space-y-3">
          <h2 className="text-lg font-semibold text-white">Planned Module Scope</h2>
          <p className="text-sm text-[#C7CCD6] leading-relaxed">{spec.overview}</p>
        </div>

        <div className="md:col-span-4 p-6 bg-[#111318] border border-[#232732] rounded-lg space-y-2.5">
          <div className="text-xs text-[#9CA3AF]">Initial Study Anchor</div>
          <div className="text-base font-semibold text-white">
            {JEZERO_CRATER.name}
          </div>
          <div className="text-sm font-mono tabular-nums text-[#F39C82]">
            {JEZERO_CRATER.coordinateLabel}
          </div>
          <p className="text-xs text-[#8D95A5] leading-relaxed pt-1">
            Approximate coordinates used for Milestone 1 alignment before orbital
            WMTS integration.
          </p>
        </div>
      </section>

      {/* Planned Capabilities */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#D9532F]" />
          <h2 className="text-lg font-semibold text-white">
            Planned Capabilities ({spec.targetMilestone})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {spec.plannedCapabilities.map((cap, index) => (
            <div
              key={cap.title}
              className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-2"
            >
              <div className="text-xs font-mono text-[#8D95A5]">
                0{index + 1}. Planned Feature
              </div>
              <h3 className="text-base font-semibold text-white">{cap.title}</h3>
              <p className="text-sm text-[#B0B6C2] leading-relaxed">
                {cap.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Intended Data Sources */}
      <section className="p-6 bg-[#111318] border border-[#232732] rounded-lg space-y-3">
        <h2 className="text-base font-semibold text-white">
          Intended Data Sources (Not Yet Connected)
        </h2>
        <ul className="space-y-2 text-sm text-[#B0B6C2]">
          {spec.intendedDataSources.map((src) => (
            <li key={src} className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9822B] mt-2 shrink-0" />
              <span>{src}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
