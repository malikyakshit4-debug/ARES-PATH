import { AlertTriangle, ExternalLink } from 'lucide-react';
import {
  ATMOSPHERIC_COMPOSITION_DATA,
  TEMPERATURE_BENCHMARKS,
} from '../../data/survivalKnowledgeBase';
import {
  MissionReportDocument,
  ReportRouteSnapshot,
  ReportSection,
} from '../../types/reports';
import { JEZERO_HIRISE_EXTENT } from '../../utils/marsMapLayers';

interface MissionReportPreviewProps {
  report: MissionReportDocument;
}

function AtmospherePreviewChart() {
  return (
    <div className="p-4 bg-[#F3F5F9] border border-[#D5DCE6] rounded-md space-y-3 print:break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#D5DCE6] pb-2">
        <div>
          <div className="text-[11px] font-mono font-semibold text-[#B45309]">
            Cat C · Planetary Reference · NASA NSSDC Mars Fact Sheet
          </div>
          <div className="text-sm font-semibold text-[#0F172A] mt-0.5">
            Martian Atmospheric Bulk Composition (% by Volume)
          </div>
        </div>
        <span className="text-xs font-mono tabular-nums text-[#475569]">
          Datum Pressure ~610 Pa (&lt;1% Earth)
        </span>
      </div>

      <div
        className="w-full h-4 rounded overflow-hidden flex border border-[#CBD5E1] bg-white"
        role="img"
        aria-label="Martian atmospheric composition bar: 95.32% CO2, 2.7% N2, 1.6% Ar, 0.13% O2, 0.08% CO"
      >
        {ATMOSPHERIC_COMPOSITION_DATA.map((item) => (
          <div
            key={item.gas}
            style={{
              width: `${Math.max(item.percent, 0.45)}%`,
              backgroundColor: item.color,
            }}
            title={`${item.gas}: ${item.percent}%`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
        {ATMOSPHERIC_COMPOSITION_DATA.map((item) => (
          <div
            key={item.gas}
            className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded"
          >
            <span className="flex items-center gap-2 text-[#334155] truncate">
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="truncate">{item.gas}</span>
            </span>
            <span className="font-mono tabular-nums font-semibold text-[#0F172A] shrink-0">
              {item.percent.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemperaturePreviewChart({
  activeSiteId,
}: {
  activeSiteId?: string | null;
}) {
  const minScale = -150;
  const maxScale = 45;
  const span = maxScale - minScale;
  const toPct = (c: number) => ((c - minScale) / span) * 100;
  const zeroPct = toPct(0);
  const ticks = [-140, -100, -60, -20, 0, 20, 40];

  return (
    <div className="p-4 bg-[#F3F5F9] border border-[#D5DCE6] rounded-md space-y-3 print:break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#D5DCE6] pb-2">
        <div>
          <div className="text-[11px] font-mono font-semibold text-[#475569]">
            Observed Martian Thermal Envelopes (°C) · Local Sites vs. Global Reference
          </div>
          <div className="text-sm font-semibold text-[#0F172A] mt-0.5">
            Surface &amp; Air Temperature Comparison (°C)
          </div>
        </div>
        <span className="text-xs font-mono text-[#1D4ED8]">
          0 °C Water Freezing Line
        </span>
      </div>

      <div className="space-y-2.5">
        {TEMPERATURE_BENCHMARKS.map((row) => {
          const isMatched = Boolean(activeSiteId) && row.siteId === activeSiteId;
          const leftPct = toPct(row.minC);
          const widthPct = Math.max(2, toPct(row.maxC) - leftPct);

          return (
            <div
              key={row.id}
              className={`p-2.5 rounded border ${
                isMatched
                  ? 'bg-[#FFF7ED] border-[#EA580C]'
                  : 'bg-white border-[#E2E8F0]'
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs mb-1.5">
                <span className="font-medium text-[#0F172A]">
                  <span
                    className={`font-mono font-semibold mr-1.5 ${
                      row.classification === 'A'
                        ? 'text-[#047857]'
                        : 'text-[#B45309]'
                    }`}
                  >
                    Cat {row.classification}
                  </span>
                  {row.label}
                </span>
                <span className="font-mono tabular-nums text-[#334155]">
                  {row.minC} °C to {row.maxC > 0 ? `+${row.maxC}` : row.maxC} °C
                </span>
              </div>

              <div className="relative h-3.5 rounded bg-[#E2E8F0] overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 w-px bg-[#2563EB]/70 z-10"
                  style={{ left: `${zeroPct}%` }}
                />
                <div
                  className="absolute top-0.5 bottom-0.5 rounded-xs"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    backgroundColor: isMatched ? '#D9532F' : '#475569',
                  }}
                />
              </div>

              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B]">
                <span>{row.note}</span>
                <span className="font-mono tabular-nums">
                  Night ~{row.typicalNightC} °C · Day ~{row.typicalDayC} °C
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative h-4 text-[10px] font-mono tabular-nums text-[#64748B] border-t border-[#D5DCE6] pt-1">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute -translate-x-1/2"
            style={{ left: `${toPct(t)}%` }}
          >
            {t}°C
          </span>
        ))}
      </div>
    </div>
  );
}

function RouteSchematicPreview({ snapshot }: { snapshot: ReportRouteSnapshot }) {
  if (snapshot.waypoints.length === 0) return null;

  const width = 760;
  const height = 270;
  const padX = 56;
  const padY = 38;

  const lons = snapshot.waypoints.map((w) => w.lon);
  const lats = snapshot.waypoints.map((w) => w.lat);
  let minLon = Math.min(...lons);
  let maxLon = Math.max(...lons);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);

  const lonSpan = Math.max(0.05, maxLon - minLon);
  const latSpan = Math.max(0.05, maxLat - minLat);
  minLon -= lonSpan * 0.24;
  maxLon += lonSpan * 0.24;
  minLat -= latSpan * 0.24;
  maxLat += latSpan * 0.24;

  const toX = (lon: number) =>
    padX + ((lon - minLon) / (maxLon - minLon)) * (width - padX * 2);
  const toY = (lat: number) =>
    height - padY - ((lat - minLat) / (maxLat - minLat)) * (height - padY * 2);

  const [hMinLon, hMinLat, hMaxLon, hMaxLat] = JEZERO_HIRISE_EXTENT;
  const overlapsHirise =
    hMaxLon >= minLon &&
    hMinLon <= maxLon &&
    hMaxLat >= minLat &&
    hMinLat <= maxLat;

  const hx1 = Math.max(padX, toX(hMinLon));
  const hx2 = Math.min(width - padX, toX(hMaxLon));
  const hy1 = Math.max(padY, toY(hMaxLat));
  const hy2 = Math.min(height - padY, toY(hMinLat));

  return (
    <div className="p-4 bg-[#F3F5F9] border border-[#D5DCE6] rounded-md space-y-2.5 print:break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#D5DCE6] pb-2">
        <div>
          <div className="text-[11px] font-mono font-semibold text-[#475569]">
            EPSG:104905 Traverse Overview Schematic · Conceptual Geometry
          </div>
          <div className="text-sm font-semibold text-[#0F172A] mt-0.5">
            {snapshot.routeName} ({snapshot.waypointCount} Waypoints ·{' '}
            {snapshot.totalDistanceFormatted})
          </div>
        </div>
        <span className="text-[11px] font-mono text-[#64748B]">
          Not hazard-certified
        </span>
      </div>

      <div className="bg-white border border-[#CBD5E1] rounded overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block"
          role="img"
          aria-label={`Conceptual Marswalk traverse schematic showing ${snapshot.waypointCount} ordered waypoints`}
        >
          {/* Subtle coordinate grid */}
          {[0.25, 0.5, 0.75].map((f) => (
            <g key={f}>
              <line
                x1={padX}
                y1={padY + f * (height - padY * 2)}
                x2={width - padX}
                y2={padY + f * (height - padY * 2)}
                stroke="#E2E8F0"
                strokeDasharray="3 3"
              />
              <line
                x1={padX + f * (width - padX * 2)}
                y1={padY}
                x2={padX + f * (width - padX * 2)}
                y2={height - padY}
                stroke="#E2E8F0"
                strokeDasharray="3 3"
              />
            </g>
          ))}

          <rect
            x={padX}
            y={padY}
            width={width - padX * 2}
            height={height - padY * 2}
            fill="none"
            stroke="#CBD5E1"
          />

          {/* Jezero HiRISE 25 cm mosaic bounding box if overlapping */}
          {overlapsHirise && hx2 > hx1 && hy2 > hy1 && (
            <g>
              <rect
                x={hx1}
                y={hy1}
                width={hx2 - hx1}
                height={hy2 - hy1}
                fill="#EFF6FF"
                fillOpacity={0.55}
                stroke="#60A5FA"
                strokeDasharray="4 3"
              />
              <text
                x={hx1 + 6}
                y={hy1 + 14}
                fill="#1D4ED8"
                fontSize="10"
                fontFamily="IBM Plex Mono, monospace"
              >
                Jezero HiRISE 25 cm/px Mosaic Extent
              </text>
            </g>
          )}

          {/* Traverse legs */}
          {snapshot.waypoints.map((wp, idx) => {
            if (idx === snapshot.waypoints.length - 1) return null;
            const next = snapshot.waypoints[idx + 1];
            const x1 = toX(wp.lon);
            const y1 = toY(wp.lat);
            const x2 = toX(next.lon);
            const y2 = toY(next.lat);
            const leg = snapshot.legs[idx];
            return (
              <g key={`leg-${wp.id}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#D9532F"
                  strokeWidth={2.5}
                />
                {leg && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 6}
                    textAnchor="middle"
                    fill="#334155"
                    fontSize="10"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {leg.formattedDistance}
                  </text>
                )}
              </g>
            );
          })}

          {/* Waypoint nodes */}
          {snapshot.waypoints.map((wp, idx) => {
            const cx = toX(wp.lon);
            const cy = toY(wp.lat);
            const fill =
              idx === 0
                ? '#059669'
                : idx === snapshot.waypoints.length - 1
                ? '#D9532F'
                : '#2563EB';
            return (
              <g key={wp.id}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={10}
                  fill={fill}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
                <text
                  x={cx}
                  y={cy + 3.5}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="10.5"
                  fontWeight="700"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {idx + 1}
                </text>
                <text
                  x={cx + 13}
                  y={cy + 3.5}
                  fill="#0F172A"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="IBM Plex Sans, sans-serif"
                >
                  {(wp.label || `Waypoint ${idx + 1}`).slice(0, 26)}
                </text>
              </g>
            );
          })}

          {/* North arrow */}
          <g transform={`translate(${width - padX - 24}, ${padY + 24})`}>
            <line x1={0} y1={12} x2={0} y2={-12} stroke="#0F172A" strokeWidth={1.6} />
            <polygon points="0,-16 -4,-7 4,-7" fill="#0F172A" />
            <text
              x={0}
              y={24}
              textAnchor="middle"
              fill="#0F172A"
              fontSize="10"
              fontWeight="700"
              fontFamily="IBM Plex Mono, monospace"
            >
              N
            </text>
          </g>

          {/* Axis coordinate labels */}
          <text
            x={padX}
            y={height - 12}
            fill="#64748B"
            fontSize="10"
            fontFamily="IBM Plex Mono, monospace"
          >
            Lat {minLat.toFixed(2)}° to {maxLat.toFixed(2)}° · Lon {minLon.toFixed(2)}° to{' '}
            {maxLon.toFixed(2)}°
          </text>
          <text
            x={width - padX}
            y={height - 12}
            textAnchor="end"
            fill="#64748B"
            fontSize="10"
            fontFamily="IBM Plex Mono, monospace"
          >
            Green: Start · Blue: Intermediate · Terracotta: Destination
          </text>
        </svg>
      </div>
    </div>
  );
}

function SectionBlock({
  section,
  report,
}: {
  section: ReportSection;
  report: MissionReportDocument;
}) {
  return (
    <section className="space-y-3 pt-5 border-t border-[#E2E8F0] print:break-inside-avoid-page">
      <div className="flex items-baseline gap-2.5 print:break-after-avoid">
        <span className="text-xs font-mono font-bold text-[#D9532F] tabular-nums">
          {section.number}
        </span>
        <h2 className="text-base font-bold text-[#0F172A] tracking-tight">
          {section.title}
        </h2>
      </div>

      {section.summaryText && (
        <p className="text-sm text-[#334155] leading-relaxed">
          {section.summaryText}
        </p>
      )}

      {section.unavailableReason && (
        <div className="px-3.5 py-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded text-xs text-[#92400E] font-medium">
          Data Unavailable: {section.unavailableReason}
        </div>
      )}

      {section.keyValues && section.keyValues.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {section.keyValues.map((kv) => (
            <div
              key={kv.label}
              className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded space-y-1 print:break-inside-avoid"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                {kv.label}
              </div>
              <div className="text-sm font-medium text-[#0F172A] font-mono tabular-nums break-words">
                {kv.value}
              </div>
              {kv.note && (
                <div className="text-[11px] text-[#475569] leading-snug">
                  {kv.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {section.visualKind === 'atmosphere-chart' && <AtmospherePreviewChart />}
      {section.visualKind === 'temperature-chart' && (
        <TemperaturePreviewChart
          activeSiteId={report.selectedLocation?.matchedSiteId}
        />
      )}
      {section.visualKind === 'route-schematic' && report.routeSnapshot && (
        <RouteSchematicPreview snapshot={report.routeSnapshot} />
      )}

      {section.bulletItems && section.bulletItems.length > 0 && (
        <ul className="space-y-1.5 text-sm text-[#334155]">
          {section.bulletItems.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#D9532F] mt-2 shrink-0"
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {section.table && section.table.rows.length > 0 && (
        <div className="overflow-x-auto border border-[#CBD5E1] rounded-md">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#EEF2F6] border-b border-[#CBD5E1] text-[#0F172A] font-semibold">
                {section.table.columns.map((col) => (
                  <th key={col} className="py-2 px-3 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {section.table.rows.map((row, rIdx) => (
                <tr
                  key={`${section.number}-row-${rIdx}`}
                  className={rIdx % 2 === 1 ? 'bg-[#F8FAFC]' : 'bg-white'}
                >
                  {row.map((cell, cIdx) => {
                    const isUrl =
                      section.table?.columns[cIdx] === 'Source URL' &&
                      cell.startsWith('https://');
                    const isNumericCol =
                      section.table?.columns[cIdx] === 'Order' ||
                      section.table?.columns[cIdx]?.includes('Lat') ||
                      section.table?.columns[cIdx]?.includes('Lon') ||
                      section.table?.columns[cIdx]?.includes('Distance');

                    return (
                      <td
                        key={`${section.number}-cell-${rIdx}-${cIdx}`}
                        className={`py-2 px-3 align-top text-[#1E293B] ${
                          isNumericCol ? 'font-mono tabular-nums whitespace-nowrap' : ''
                        }`}
                      >
                        {isUrl ? (
                          <a
                            href={cell}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#1D4ED8] hover:underline break-all"
                          >
                            <span>{cell}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 print:hidden" />
                          </a>
                        ) : (
                          cell
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function MissionReportPreview({ report }: MissionReportPreviewProps) {
  return (
    <article
      className="ares-report-sheet bg-[#FAFBFD] text-[#111827] border border-[#CBD5E1] rounded-lg shadow-sm overflow-hidden print:border-0 print:shadow-none print:rounded-none print:bg-white"
      aria-label={report.title}
    >
      {/* Document Masthead */}
      <header className="bg-[#0F172A] text-white px-6 py-6 border-b-4 border-[#D9532F] print:bg-[#0F172A]">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#F39C82]">
          <span>
            {report.project} · {report.reportTypeLabel.toUpperCase()}
          </span>
          <span className="tabular-nums">ID: {report.reportId}</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-2">
          {report.title}
        </h1>
        <p className="text-sm text-[#CBD5E1] mt-1">{report.subtitle}</p>

        <div className="mt-4 pt-3 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-[#94A3B8]">Created (UTC)</div>
            <div className="font-mono tabular-nums text-white mt-0.5">
              {report.createdAtDisplay}
            </div>
          </div>
          <div>
            <div className="text-[#94A3B8]">Planet / Reference</div>
            <div className="font-mono text-white mt-0.5">
              {report.planet} · EPSG:104905
            </div>
          </div>
          <div>
            <div className="text-[#94A3B8]">Evidence Scope</div>
            <div className="font-mono text-white mt-0.5">
              {report.scientificObservations.length} Observations ·{' '}
              {report.sources.length} Sources
            </div>
          </div>
          <div>
            <div className="text-[#94A3B8]">Target Summary</div>
            <div className="font-mono tabular-nums text-white mt-0.5 truncate">
              {report.routeSnapshot
                ? `${report.routeSnapshot.waypointCount} wps · ${report.routeSnapshot.totalDistanceFormatted}`
                : report.selectedLocation
                ? `${report.selectedLocation.lat.toFixed(2)}°, ${report.selectedLocation.lon.toFixed(2)}°`
                : report.selectedRegionName ?? 'Planetary Reference'}
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Explicit Non-Certification Notice */}
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-md flex items-start gap-3 text-xs text-[#991B1B] print:break-inside-avoid">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
          <div className="space-y-1">
            <div className="font-semibold uppercase tracking-wide">
              Scientific Provenance &amp; Non-Certification Notice
            </div>
            <p className="leading-relaxed">
              {report.reportType === 'route'
                ? 'This Marswalk Mission Report documents a conceptual surface traverse compiled from NASA orbital mosaics and published historical mission archives. No route is certified safe, optimal, or astronaut-approved.'
                : 'Compiled strictly from verified NASA Mars Trek WMTS coverage metadata and cited historical NASA/PDS archives. ARES PATH provides no live Mars weather telemetry and certifies no site safe for human exploration.'}
            </p>
          </div>
        </div>

        {/* Classification Legend */}
        <div className="p-4 bg-[#F3F5F9] border border-[#D5DCE6] rounded-md space-y-2.5 print:break-inside-avoid">
          <div className="text-xs font-bold uppercase tracking-wide text-[#0F172A]">
            Evidence Classification Framework (Categories A–E)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-[11px]">
            {report.classificationLegend.map((c) => (
              <div
                key={c.code}
                className="p-2 bg-white border border-[#E2E8F0] rounded space-y-0.5"
              >
                <div className="font-mono font-bold text-[#0F172A]">
                  Cat {c.code}
                </div>
                <div className="font-semibold text-[#334155]">
                  {c.label.replace(/^Category [A-E] — /, '')}
                </div>
                <div className="text-[#64748B] leading-snug">
                  {c.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Numbered Report Sections */}
        <div className="space-y-5">
          {report.sections.map((section) => (
            <SectionBlock
              key={`${section.number}-${section.title}`}
              section={section}
              report={report}
            />
          ))}
        </div>

        {/* Report Document Footer */}
        <footer className="pt-5 border-t border-[#CBD5E1] text-xs text-[#64748B] flex flex-wrap items-center justify-between gap-2">
          <span>
            ARES PATH · Interplanetary Survival Guide: Martian Map · NASA Space Apps Challenge 2026
          </span>
          <span className="font-mono tabular-nums">
            {report.reportId} · {report.createdAtDisplay}
          </span>
        </footer>
      </div>
    </article>
  );
}
