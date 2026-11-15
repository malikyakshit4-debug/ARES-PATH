import { ArrowRight, Compass, Database, FileText, Layers, Map, ShieldAlert } from 'lucide-react';
import { MarsGlobe } from '../components/MarsGlobe';
import { StatusNotice } from '../components/StatusNotice';
import { JEZERO_CRATER, MODULES, NASA_INTEGRATION_STATUS } from '../data/marsData';
import { ModuleId } from '../types/navigation';

interface OverviewPageProps {
  onNavigate: (moduleId: ModuleId) => void;
}

const MODULE_ICONS: Record<Exclude<ModuleId, 'overview'>, typeof Compass> = {
  explorer: Compass,
  map: Map,
  planner: Layers,
  guide: ShieldAlert,
  reports: FileText,
};

export function OverviewPage({ onNavigate }: OverviewPageProps) {
  const navigableModules = MODULES.filter(
    (m): m is typeof m & { id: Exclude<ModuleId, 'overview'> } => m.id !== 'overview'
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-12">
      {/* Hero Split: Mission Framing + Prominent 3D Mars Globe */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-[#9CA3AF]">
              NASA Space Apps Challenge 2026 · Interplanetary Survival Guide: Martian Map
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-[1.15] text-balance">
              ARES PATH
            </h1>
            <p className="text-base text-[#C7CCD6] leading-relaxed max-w-prose">
              A scientifically grounded Mars exploration platform designed to combine
              planetary observations and NASA mission context to help users inspect
              Martian terrain and plan conceptual Marswalk routes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('explorer')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#D9532F] hover:bg-[#B64223] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Open Mars Explorer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('map')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#E6E8EC] bg-[#161920] hover:bg-[#1E222B] border border-[#232732] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Scientific Map Roadmap</span>
            </button>
          </div>

          {/* Featured Region: Jezero Crater */}
          <div className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#232732] pb-3">
              <div>
                <div className="text-xs text-[#9CA3AF]">Featured Study Region</div>
                <h2 className="text-lg font-semibold text-white mt-0.5">
                  {JEZERO_CRATER.name}
                </h2>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-[#9CA3AF]">Approx. Coordinates</div>
                <div className="text-sm font-mono font-medium tabular-nums text-[#F39C82]">
                  {JEZERO_CRATER.coordinateLabel}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#9CA3AF]">
              <span>
                Diameter: <strong className="font-mono font-medium text-[#E6E8EC]">{JEZERO_CRATER.approxDiameter}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Epoch: <strong className="font-medium text-[#E6E8EC]">{JEZERO_CRATER.geologicalAge}</strong>
              </span>
            </div>

            <p className="text-sm text-[#C7CCD6] leading-relaxed">
              {JEZERO_CRATER.summary}
            </p>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#E6E8EC]">
                Why Jezero Crater Is Scientifically Important
              </div>
              <ul className="space-y-1.5 text-sm text-[#B0B6C2]">
                {JEZERO_CRATER.scientificSignificance.map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D9532F] mt-2 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-[#8D95A5] pt-2 border-t border-[#232732]">
              {JEZERO_CRATER.caveat}
            </p>
          </div>
        </div>

        {/* Right Column: Interactive 3D Mars Globe */}
        <div className="lg:col-span-7 space-y-3">
          <MarsGlobe
            heightClassName="h-[380px] sm:h-[460px] lg:h-[580px]"
            onSelectJezero={() => onNavigate('explorer')}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8D95A5]">
            <span>
              Primary marker: Jezero Crater ({JEZERO_CRATER.coordinateLabel})
            </span>
            <span>
              Click the Jezero marker to open the dedicated Mars Explorer view
            </span>
          </div>
        </div>
      </section>

      {/* Module Navigation Cards */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#232732] pb-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Platform Modules</h2>
            <p className="text-sm text-[#9CA3AF] mt-0.5">
              All six ARES PATH exploration, cartography, traverse planning, survival intelligence, and reporting modules are active.
            </p>
          </div>
          <span className="text-xs font-mono text-[#9CA3AF]">
            6 Modules · Milestones 1–5 Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {navigableModules.map((mod) => {
            const Icon = MODULE_ICONS[mod.id];
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onNavigate(mod.id)}
                className="group text-left p-5 bg-[#111318] hover:bg-[#151820] border border-[#232732] hover:border-[#383F50] rounded-lg transition-colors flex flex-col justify-between gap-4 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#D9532F]"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-[#D9532F] shrink-0" />
                      <h3 className="text-base font-semibold text-white">
                        {mod.label}
                      </h3>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#7E8694] group-hover:text-white transition-colors shrink-0" />
                  </div>

                  <div className="text-xs font-medium text-[#9CA3AF]">
                    {mod.isImplemented ? (
                      <span className="text-[#E6E8EC]">{mod.status}</span>
                    ) : (
                      <span className="text-[#D9822B]">{mod.status}</span>
                    )}
                  </div>

                  <p className="text-sm text-[#B0B6C2] leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* NASA Data Integration Status */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#232732] pb-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-[#D9532F]" />
            <h2 className="text-xl font-semibold text-white">
              NASA Data Integration Status
            </h2>
          </div>
          <span className="text-xs font-mono text-[#E5A952]">
            Milestones 1–5 Active · Orbital WMTS, PDS Archives &amp; Reports
          </span>
        </div>

        <StatusNotice
          tone="milestone"
          label="Platform Data Provenance"
          message="The 3D Mars globe and 2D Scientific Map stream NASA Mars Trek WMTS layers (Viking MDIM 2.1, MGS MOLA, Caltech CTX, Jezero HiRISE 25 cm, and THEMIS IR). The Marswalk Planner models conceptual great-circle traverses, the Survival Guide classifies NASA PDS intelligence (A–E), and Mission Reports exports PDF, JSON, and print-ready dossiers."
        />

        <div className="overflow-x-auto border border-[#232732] rounded-lg bg-[#111318]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#232732] text-xs font-medium text-[#9CA3AF]">
                <th className="py-3 px-4">Dataset / Service</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Target Phase</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">Integration Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232732] text-sm">
              {NASA_INTEGRATION_STATUS.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="py-3.5 px-4 font-medium text-white whitespace-nowrap">
                    {item.system}
                  </td>
                  <td className="py-3.5 px-4 text-[#C7CCD6]">{item.provider}</td>
                  <td className="py-3.5 px-4 font-mono text-xs text-[#9CA3AF] whitespace-nowrap">
                    {item.targetMilestone}
                  </td>
                  <td
                    className={`py-3.5 px-4 font-mono text-xs whitespace-nowrap ${
                      item.status.startsWith('Integrated')
                        ? 'text-[#E6E8EC]'
                        : 'text-[#E5A952]'
                    }`}
                  >
                    {item.status}
                  </td>
                  <td className="py-3.5 px-4 text-[#9CA3AF]">{item.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
