import {
  ATMOSPHERIC_COMPOSITION_DATA,
  TEMPERATURE_BENCHMARKS,
} from '../../data/survivalKnowledgeBase';

export function AtmosphericCompositionChart() {
  return (
    <div className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#232732] pb-3">
        <div>
          <div className="text-xs font-mono text-[#E5A952]">
            C · Planetary Reference · NASA NSSDC Mars Fact Sheet
          </div>
          <h3 className="text-base font-semibold text-white mt-0.5">
            Martian Atmospheric Bulk Composition (% by Volume)
          </h3>
        </div>
        <span className="text-xs font-mono text-[#9CA3AF]">
          Datum Pressure ~610 Pa (&lt;1% Earth)
        </span>
      </div>

      {/* Stacked proportional bar */}
      <div
        className="w-full h-5 rounded overflow-hidden flex border border-[#232732] bg-[#090A0D]"
        role="img"
        aria-label="Martian atmospheric composition: 95.32% Carbon Dioxide, 2.7% Nitrogen, 1.6% Argon, 0.13% Oxygen, 0.08% Carbon Monoxide"
      >
        {ATMOSPHERIC_COMPOSITION_DATA.map((item) => (
          <div
            key={item.gas}
            style={{
              width: `${Math.max(item.percent, 0.4)}%`,
              backgroundColor: item.color,
            }}
            title={`${item.gas}: ${item.percent}%`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
        {ATMOSPHERIC_COMPOSITION_DATA.map((item) => (
          <div
            key={item.gas}
            className="flex items-center justify-between gap-2 p-2.5 bg-[#0D0F14] border border-[#232732] rounded"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="text-[#C7CCD6] truncate">{item.gas}</span>
            </div>
            <span className="font-mono tabular-nums font-medium text-white shrink-0">
              {item.percent.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TemperatureRangeChartProps {
  activeSiteId?: string | null;
}

export function TemperatureRangeChart({ activeSiteId }: TemperatureRangeChartProps) {
  const minScale = -150;
  const maxScale = 45;
  const span = maxScale - minScale;
  const toPercent = (c: number) => ((c - minScale) / span) * 100;
  const zeroPercent = toPercent(0);
  const ticks = [-140, -100, -60, -20, 0, 20, 40];

  return (
    <div className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#232732] pb-3">
        <div>
          <div className="text-xs font-mono text-[#9CA3AF]">
            Temperature Comparison (°C) · Local Mission Sites vs. Global Reference
          </div>
          <h3 className="text-base font-semibold text-white mt-0.5">
            Observed Martian Thermal Envelopes (Celsius)
          </h3>
        </div>
        <span className="text-xs font-mono text-[#60A5FA]">
          0 °C Water Freezing Line Marked
        </span>
      </div>

      <div className="space-y-3.5">
        {TEMPERATURE_BENCHMARKS.map((row) => {
          const isMatched =
            Boolean(activeSiteId) && row.siteId === activeSiteId;
          const leftPct = toPercent(row.minC);
          const widthPct = Math.max(2, toPercent(row.maxC) - leftPct);
          const nightPct = toPercent(row.typicalNightC);
          const dayPct = toPercent(row.typicalDayC);

          return (
            <div
              key={row.id}
              className={`p-3 rounded border ${
                isMatched
                  ? 'bg-[#171A22] border-[#D9532F]/70'
                  : 'bg-[#0D0F14] border-[#232732]'
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`font-mono font-medium ${
                      row.classification === 'A'
                        ? 'text-[#6EE7B7]'
                        : 'text-[#E5A952]'
                    }`}
                  >
                    Cat {row.classification}
                  </span>
                  <span className="font-medium text-white">{row.label}</span>
                  {isMatched && (
                    <span className="text-[11px] font-mono text-[#F39C82]">
                      · Matches Selected Region
                    </span>
                  )}
                </div>
                <span className="font-mono tabular-nums text-[#E6E8EC]">
                  {row.minC} °C to {row.maxC > 0 ? `+${row.maxC}` : row.maxC} °C
                </span>
              </div>

              <div className="relative h-5 bg-[#090A0D] border border-[#232732] rounded">
                {/* 0°C freezing line */}
                <div
                  className="absolute top-0 bottom-0 w-[1px] bg-[#60A5FA]/70 z-10"
                  style={{ left: `${zeroPercent}%` }}
                  title="0 °C"
                />
                {/* Full observed envelope */}
                <div
                  className="absolute top-1.5 bottom-1.5 rounded-xs bg-[#D9532F]/45 border border-[#D9532F]"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                />
                {/* Typical night marker */}
                <div
                  className="absolute top-1 bottom-1 w-1 bg-[#60A5FA] rounded-xs"
                  style={{ left: `${nightPct}%` }}
                  title={`Typical Night: ${row.typicalNightC} °C`}
                />
                {/* Typical afternoon marker */}
                <div
                  className="absolute top-1 bottom-1 w-1 bg-[#F59E0B] rounded-xs"
                  style={{ left: `${dayPct}%` }}
                  title={`Typical Afternoon: ${row.typicalDayC} °C`}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 text-[11px] text-[#8D95A5]">
                <span>{row.note}</span>
                <span className="font-mono tabular-nums">
                  Typical Night {row.typicalNightC} °C · Typical Afternoon{' '}
                  {row.typicalDayC} °C
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Axis Ticks */}
      <div className="relative h-5 border-t border-[#232732] text-[10px] font-mono tabular-nums text-[#8D95A5]">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute top-1 -translate-x-1/2"
            style={{ left: `${toPercent(t)}%` }}
          >
            {t}°C
          </span>
        ))}
      </div>
    </div>
  );
}

export function RadiationShieldingDiagram() {
  return (
    <div className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#232732] pb-3">
        <div>
          <div className="text-xs font-mono text-[#E5A952]">
            C · Planetary Reference vs. B/A · Curiosity RAD (Gale Crater Only)
          </div>
          <h3 className="text-base font-semibold text-white mt-0.5">
            Atmospheric &amp; Magnetic Radiation Shielding Comparison
          </h3>
        </div>
        <span className="text-xs font-mono text-[#9CA3AF]">
          Mars column ~16–20 g/cm² vs. Earth ~1,030 g/cm²
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Earth reference */}
        <div className="p-4 bg-[#0D0F14] border border-[#232732] rounded space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">Earth Surface Shielding</span>
            <span className="font-mono text-[#6EE7B7]">~0.006 mSv/day natural</span>
          </div>
          <svg
            viewBox="0 0 320 120"
            className="w-full h-28 bg-[#090A0D] border border-[#232732] rounded"
            role="img"
            aria-label="Earth shielding diagram showing global magnetosphere and 1030 g/cm2 atmosphere"
          >
            <rect x="0" y="92" width="320" height="28" fill="#1E293B" />
            <rect x="0" y="34" width="320" height="58" fill="#1D4ED8" fillOpacity="0.22" />
            <path
              d="M 10 20 Q 160 5 310 20"
              stroke="#60A5FA"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              fill="none"
            />
            <line x1="65" y1="4" x2="65" y2="30" stroke="#F59E0B" strokeWidth="1.5" />
            <polygon points="65,33 61,25 69,25" fill="#F59E0B" />
            <line x1="160" y1="4" x2="160" y2="55" stroke="#E57350" strokeWidth="1.5" />
            <polygon points="160,58 156,50 164,50" fill="#E57350" />
            <text x="12" y="16" fill="#93C5FD" fontSize="9" fontFamily="IBM Plex Mono, monospace">
              Global Dipole Magnetosphere
            </text>
            <text x="12" y="68" fill="#BFDBFE" fontSize="9" fontFamily="IBM Plex Mono, monospace">
              ~1,030 g/cm² N₂/O₂ + O₃ (Blocks UV-C &amp; most GCR/SEP)
            </text>
            <text x="12" y="109" fill="#CBD5E1" fontSize="9" fontFamily="IBM Plex Mono, monospace">
              Earth Sea Level
            </text>
          </svg>
        </div>

        {/* Mars reference */}
        <div className="p-4 bg-[#0D0F14] border border-[#232732] rounded space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">Mars Surface Exposure</span>
            <span className="font-mono text-[#F39C82]">
              ~0.67 mSv/day (Gale RAD only)
            </span>
          </div>
          <svg
            viewBox="0 0 320 120"
            className="w-full h-28 bg-[#090A0D] border border-[#232732] rounded"
            role="img"
            aria-label="Mars shielding diagram showing absence of global dipole field and thin 16-20 g/cm2 CO2 column"
          >
            <rect x="0" y="92" width="320" height="28" fill="#3B1D16" />
            <rect x="0" y="72" width="320" height="20" fill="#D9532F" fillOpacity="0.18" />
            {/* GCR + Secondary Neutrons + UV-C penetrating to surface */}
            <line x1="55" y1="6" x2="55" y2="88" stroke="#F59E0B" strokeWidth="1.5" />
            <polygon points="55,91 51,83 59,83" fill="#F59E0B" />
            <line x1="150" y1="6" x2="150" y2="88" stroke="#E57350" strokeWidth="1.5" />
            <polygon points="150,91 146,83 154,83" fill="#E57350" />
            {/* Secondary albedo neutron */}
            <line
              x1="150"
              y1="92"
              x2="175"
              y2="76"
              stroke="#C4B5FD"
              strokeWidth="1.3"
              strokeDasharray="3 2"
            />
            <line x1="255" y1="6" x2="255" y2="88" stroke="#A78BFA" strokeWidth="1.5" />
            <polygon points="255,91 251,83 259,83" fill="#A78BFA" />
            <text x="12" y="20" fill="#9CA3AF" fontSize="9" fontFamily="IBM Plex Mono, monospace">
              No Global Dipole Field · Localized Crustal Remnants Only
            </text>
            <text x="12" y="42" fill="#FCD34D" fontSize="9" fontFamily="IBM Plex Mono, monospace">
              GCRs + SEP Protons + UV-C Penetrate to Ground
            </text>
            <text x="12" y="85" fill="#F7B29B" fontSize="8.5" fontFamily="IBM Plex Mono, monospace">
              ~16–20 g/cm² CO₂ Column (Minimal Attenuation)
            </text>
            <text x="12" y="109" fill="#E5E7EB" fontSize="9" fontFamily="IBM Plex Mono, monospace">
              Regolith Secondary Neutron Backscatter (~15–20% Dose)
            </text>
          </svg>
        </div>
      </div>

      <p className="text-xs text-[#9CA3AF] leading-relaxed">
        Notice: Curiosity&apos;s RAD (~0.67 mSv/day average during 2012–2013 solar maximum)
        was measured exclusively inside Gale Crater (-4.5 km elevation). Jezero Crater’s
        Perseverance rover does not carry an ionizing particle dosimeter; surface GCR/SEP
        rates vary with local elevation and the 11-year solar cycle.
      </p>
    </div>
  );
}

export function DustPhenomenaDiagram() {
  const scales = [
    {
      name: 'Dust Devils',
      spatialScale: '10 m – 1 km wide',
      opticalDepth: 'Local transient spike',
      solarImpact: 'Brief dimming + occasional dust-clearing gusts',
      example: 'Frequent at Jezero (MEDA 1–4+/sol in active season)',
    },
    {
      name: 'Local Dust Storms',
      spatialScale: '< 10⁵ km²',
      opticalDepth: 'τ ≈ 0.8 – 2.0',
      solarImpact: 'Moderate 30%–70% direct beam reduction for days',
      example: 'Common along polar cap edges & steep basin slopes',
    },
    {
      name: 'Regional Dust Storms',
      spatialScale: '10⁵ – 10⁶+ km²',
      opticalDepth: 'τ ≈ 1.5 – 4.0',
      solarImpact: 'Severe dimming for weeks; cools daytime highs',
      example: 'Frequent during southern spring/summer (Ls 180°–330°)',
    },
    {
      name: 'Global Dust Storms',
      spatialScale: 'Planet-encircling',
      opticalDepth: 'τ ≈ 4.0 – 10+',
      solarImpact: '>95%–99% direct sunlight loss; multi-month duration',
      example: 'Observed in 2001, 2007, 2018 (ended Opportunity mission)',
    },
  ];

  return (
    <div className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#232732] pb-3">
        <div>
          <div className="text-xs font-mono text-[#E5A952]">
            C · Planetary Dust Climatology (No Live Storm Forecast)
          </div>
          <h3 className="text-base font-semibold text-white mt-0.5">
            Martian Dust Activity Hierarchy &amp; Solar Attenuation Scale
          </h3>
        </div>
        <span className="text-xs font-mono text-[#9CA3AF]">
          Typical grain size ~1–3 µm
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {scales.map((item, idx) => (
          <div
            key={item.name}
            className="p-3.5 bg-[#0D0F14] border border-[#232732] rounded space-y-2 flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono text-[#8D95A5]">
                0{idx + 1}. {item.spatialScale}
              </div>
              <div className="text-sm font-semibold text-white">{item.name}</div>
              <div className="text-xs font-mono text-[#E5A952]">
                {item.opticalDepth}
              </div>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-[#232732] text-xs">
              <p className="text-[#C7CCD6] leading-relaxed">{item.solarImpact}</p>
              <p className="text-[11px] text-[#8D95A5] leading-relaxed">
                {item.example}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WaterEvidenceDiagram() {
  const bands = [
    {
      zone: 'Equatorial & Tropical (0°–30° N/S)',
      examples: 'Jezero (18.4° N), Gale (4.6° S), Elysium (4.5° N)',
      status: 'A · Past Water & Hydrated Minerals Only',
      statusColor: 'text-[#E5A952]',
      detail:
        'Paleolake deltas, clays, and sulfates confirm ancient liquid water (~3.5–3.8 Ga). Shallow ground ice is thermally unstable; usable drinking water is NOT confirmed.',
    },
    {
      zone: 'Mid-Latitudes (35°–60° N/S)',
      examples: 'Arcadia Planitia, Utopia Planitia, Deuteronilus Mensae',
      status: 'D · Interpreted Buried Ice Sheets (SHARAD/HiRISE)',
      statusColor: 'text-[#C4B5FD]',
      detail:
        'Orbital radar (SHARAD) and fresh impact crater scarps indicate buried ice 1–2 m+ below dry regolith; direct surface drilling has not yet occurred.',
    },
    {
      zone: 'High Latitudes (>60° N/S)',
      examples: 'Vastitas Borealis / Phoenix (68.2° N), Polar Caps',
      status: 'A · Confirmed Shallow Water Ice (+ Perchlorates)',
      statusColor: 'text-[#6EE7B7]',
      detail:
        'Phoenix Lander excavated pure water ice 3–5 cm below regolith (2008). Polar caps store massive layered H₂O/CO₂ ice, but face multi-month polar night.',
    },
  ];

  return (
    <div className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#232732] pb-3">
        <div>
          <div className="text-xs font-mono text-[#9CA3AF]">
            Latitudinal Water-Resource Evidence Gradient
          </div>
          <h3 className="text-base font-semibold text-white mt-0.5">
            Confirmed Ice vs. Hydrated Minerals vs. Interpretations by Latitude
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {bands.map((b) => (
          <div
            key={b.zone}
            className="p-4 bg-[#0D0F14] border border-[#232732] rounded space-y-2"
          >
            <div className={`text-xs font-mono font-medium ${b.statusColor}`}>
              {b.status}
            </div>
            <div className="text-sm font-semibold text-white">{b.zone}</div>
            <div className="text-[11px] font-mono text-[#8D95A5]">{b.examples}</div>
            <p className="text-xs text-[#C7CCD6] leading-relaxed pt-1">
              {b.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
