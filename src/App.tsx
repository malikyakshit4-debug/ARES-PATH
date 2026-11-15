import { useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { JEZERO_CRATER } from './data/marsData';
import { MarsExplorerPage } from './pages/MarsExplorerPage';
import {
  MarswalkPlannerPage,
  PlannerRouteState,
} from './pages/MarswalkPlannerPage';
import { MissionReportsPage } from './pages/MissionReportsPage';
import { OverviewPage } from './pages/OverviewPage';
import { ScientificMapPage } from './pages/ScientificMapPage';
import { SurvivalIntelligencePage } from './pages/SurvivalIntelligencePage';
import { ModuleId, SharedMapCoordinates } from './types/navigation';
import { MissionReportDocument } from './types/reports';

const VALID_MODULES: ModuleId[] = [
  'overview',
  'explorer',
  'map',
  'planner',
  'guide',
  'reports',
];

function getInitialModule(): ModuleId {
  if (typeof window === 'undefined') return 'overview';
  const hash = window.location.hash.replace('#', '') as ModuleId;
  return VALID_MODULES.includes(hash) ? hash : 'overview';
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>(getInitialModule);
  const [sharedCoordinates, setSharedCoordinates] = useState<SharedMapCoordinates>({
    lat: JEZERO_CRATER.approxLat,
    lon: JEZERO_CRATER.approxLon,
    label: JEZERO_CRATER.name,
  });
  const [plannerRouteState, setPlannerRouteState] = useState<PlannerRouteState>({
    routeName: 'Jezero Crater Conceptual Traverse',
    waypoints: [],
  });
  const [recentReports, setRecentReports] = useState<MissionReportDocument[]>([]);

  const handleSaveReport = useCallback((report: MissionReportDocument) => {
    setRecentReports((prev) => [
      report,
      ...prev.filter((r) => r.reportId !== report.reportId),
    ].slice(0, 8));
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ModuleId;
      if (VALID_MODULES.includes(hash)) {
        setActiveModule(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleNavigate = (moduleId: ModuleId) => {
    setActiveModule(moduleId);
    if (typeof window !== 'undefined') {
      window.location.hash = moduleId;
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090A0D] text-[#E6E8EC] print:bg-white print:text-[#111827]">
      <Navbar activeModule={activeModule} onNavigate={handleNavigate} />

      <main className="flex-1">
        {activeModule === 'overview' && (
          <OverviewPage onNavigate={handleNavigate} />
        )}
        {activeModule === 'explorer' && (
          <MarsExplorerPage
            onNavigate={handleNavigate}
            sharedCoordinates={sharedCoordinates}
            onUpdateSharedCoordinates={setSharedCoordinates}
          />
        )}
        {activeModule === 'map' && (
          <ScientificMapPage
            onNavigate={handleNavigate}
            sharedCoordinates={sharedCoordinates}
            onUpdateSharedCoordinates={setSharedCoordinates}
          />
        )}
        {activeModule === 'planner' && (
          <MarswalkPlannerPage
            onNavigate={handleNavigate}
            sharedCoordinates={sharedCoordinates}
            onUpdateSharedCoordinates={setSharedCoordinates}
            routeState={plannerRouteState}
            onChangeRouteState={setPlannerRouteState}
          />
        )}
        {activeModule === 'guide' && (
          <SurvivalIntelligencePage
            onNavigate={handleNavigate}
            sharedCoordinates={sharedCoordinates}
            onUpdateSharedCoordinates={setSharedCoordinates}
            routeState={plannerRouteState}
          />
        )}
        {activeModule === 'reports' && (
          <MissionReportsPage
            onNavigate={handleNavigate}
            sharedCoordinates={sharedCoordinates}
            onUpdateSharedCoordinates={setSharedCoordinates}
            routeState={plannerRouteState}
            recentReports={recentReports}
            onSaveReport={handleSaveReport}
          />
        )}
      </main>

      <footer className="border-t border-[#232732] bg-[#0B0D12] print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#8D95A5]">
          <div>
            ARES PATH · NASA Space Apps Challenge 2026 · Interplanetary Survival Guide: Martian Map
          </div>
          <div>
            Milestone 5 · Conceptual exploration framework — no route is certified safe for human exploration.
          </div>
        </div>
      </footer>
    </div>
  );
}
