import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { MODULES } from '../data/marsData';
import { ModuleId } from '../types/navigation';

interface NavbarProps {
  activeModule: ModuleId;
  onNavigate: (moduleId: ModuleId) => void;
}

export function Navbar({ activeModule, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (id: ModuleId) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const primaryActionTarget: ModuleId =
    activeModule === 'explorer' ? 'map' : 'explorer';
  const primaryActionLabel =
    activeModule === 'explorer' ? 'Scientific Map' : 'Mars Explorer';

  return (
    <header className="sticky top-0 z-40 bg-[#090A0D]/95 border-b border-[#232732] print:hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-6 lg:gap-8">
        {/* Zone 1: Single-element brand wordmark */}
        <button
          type="button"
          onClick={() => handleSelect('overview')}
          className="text-base font-bold tracking-[0.12em] text-[#F3F4F6] hover:text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#D9532F]"
        >
          ARES PATH
        </button>

        {/* Zone 2: Primary module navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-6"
        >
          {MODULES.map((mod) => {
            const isActive = activeModule === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => handleSelect(mod.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-4 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#D9532F] ${
                  isActive
                    ? 'text-white'
                    : 'text-[#9CA3AF] hover:text-[#E6E8EC]'
                }`}
              >
                {mod.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D9532F]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action + mobile menu toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleSelect(primaryActionTarget)}
            className="hidden sm:inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-white bg-[#D9532F] hover:bg-[#B64223] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
          >
            {primaryActionLabel}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 text-[#E6E8EC] hover:text-white hover:bg-[#161920] rounded border border-[#232732] cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#232732] bg-[#0D0F14]">
          <nav
            aria-label="Mobile navigation"
            className="px-4 py-3 flex flex-col gap-1"
          >
            {MODULES.map((mod) => {
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => handleSelect(mod.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#161920] text-white border border-[#232732]'
                      : 'text-[#9CA3AF] hover:text-white hover:bg-[#12151B]'
                  }`}
                >
                  <span>{mod.label}</span>
                  <span className="text-[11px] font-mono text-[#7E8694]">
                    {mod.isImplemented ? 'Active' : 'Planned'}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
